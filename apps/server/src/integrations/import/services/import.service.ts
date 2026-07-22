import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PageRepo } from '@docmost/db/repos/page/page.repo';
import { MultipartFile } from '@fastify/multipart';
import { sanitize } from 'sanitize-filename-ts';
import * as path from 'path';
import {
  htmlToJson,
  jsonToText,
  tiptapExtensions,
} from '../../../collaboration/collaboration.util';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { generateSlugId, sanitizeFileName } from '../../../common/helpers';
import { generateJitteredKeyBetween } from 'fractional-indexing-jittered';
import { TiptapTransformer } from '@hocuspocus/transformer';
import * as Y from 'yjs';
import { markdownToHtml } from '@docmost/editor-ext';
import {
  FileTaskStatus,
  FileTaskType,
  FileImportSource,
  getFileTaskFolderPath,
} from '../utils/file.utils';
import { EnvironmentService } from '../../environment/environment.service';
import { downloadGoogleDocZip } from '../utils/google-doc.utils';
import * as bytes from 'bytes';
import { v7 as uuid7 } from 'uuid';
import { StorageService } from '../../storage/storage.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueJob, QueueName } from '../../queue/constants';

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    private readonly pageRepo: PageRepo,
    private readonly storageService: StorageService,
    @InjectKysely() private readonly db: KyselyDB,
    @InjectQueue(QueueName.FILE_TASK_QUEUE)
    private readonly fileTaskQueue: Queue,
    private readonly environmentService: EnvironmentService,
  ) {}

  async importPage(
    filePromise: Promise<MultipartFile>,
    userId: string,
    spaceId: string,
    workspaceId: string,
  ): Promise<void> {
    const file = await filePromise;
    const fileBuffer = await file.toBuffer();
    const fileExtension = path.extname(file.filename).toLowerCase();
    const fileName = sanitize(
      path.basename(file.filename, fileExtension).slice(0, 255),
    );
    const fileContent = fileBuffer.toString();

    let prosemirrorState = null;
    let createdPage = null;

    try {
      if (fileExtension.endsWith('.md')) {
        prosemirrorState = await this.processMarkdown(fileContent);
      } else if (fileExtension.endsWith('.html')) {
        prosemirrorState = await this.processHTML(fileContent);
      }
    } catch (err) {
      const message = 'Error processing file content';
      this.logger.error(message, err);
      throw new BadRequestException(message);
    }

    if (!prosemirrorState) {
      const message = 'Failed to create ProseMirror state';
      this.logger.error(message);
      throw new BadRequestException(message);
    }

    const { title, prosemirrorJson } =
      this.extractTitleAndRemoveHeading(prosemirrorState);

    const pageTitle = title || fileName;

    if (prosemirrorJson) {
      try {
        const pagePosition = await this.getNewPagePosition(spaceId);

        createdPage = await this.pageRepo.insertPage({
          slugId: generateSlugId(),
          title: pageTitle,
          content: prosemirrorJson,
          textContent: jsonToText(prosemirrorJson),
          ydoc: await this.createYdoc(prosemirrorJson),
          position: pagePosition,
          spaceId: spaceId,
          creatorId: userId,
          workspaceId: workspaceId,
          lastUpdatedById: userId,
        });

        this.logger.debug(
          `Successfully imported "${title}${fileExtension}. ID: ${createdPage.id} - SlugId: ${createdPage.slugId}"`,
        );
      } catch (err) {
        const message = 'Failed to create imported page';
        this.logger.error(message, err);
        throw new BadRequestException(message);
      }
    }

    return createdPage;
  }

  async processMarkdown(markdownInput: string): Promise<any> {
    try {
      const html = await markdownToHtml(markdownInput);
      return this.processHTML(html);
    } catch (err) {
      throw err;
    }
  }

  async processHTML(htmlInput: string): Promise<any> {
    try {
      return htmlToJson(htmlInput);
    } catch (err) {
      throw err;
    }
  }

  async createYdoc(prosemirrorJson: any): Promise<Buffer | null> {
    if (prosemirrorJson) {
      // this.logger.debug(`Converting prosemirror json state to ydoc`);

      const ydoc = TiptapTransformer.toYdoc(
        prosemirrorJson,
        'default',
        tiptapExtensions,
      );

      Y.encodeStateAsUpdate(ydoc);

      return Buffer.from(Y.encodeStateAsUpdate(ydoc));
    }
    return null;
  }

  extractTitleAndRemoveHeading(prosemirrorState: any) {
    let title: string | null = null;

    const content = prosemirrorState.content ?? [];

    if (
      content.length > 0 &&
      content[0].type === 'heading' &&
      content[0].attrs?.level === 1
    ) {
      title = content[0].content?.[0]?.text ?? null;
      content.shift();
    }

    // ensure at least one paragraph
    if (content.length === 0) {
      content.push({
        type: 'paragraph',
        content: [],
      });
    }

    return {
      title,
      prosemirrorJson: {
        ...prosemirrorState,
        content,
      },
    };
  }

  async getNewPagePosition(spaceId: string): Promise<string> {
    const lastPage = await this.db
      .selectFrom('pages')
      .select(['id', 'position'])
      .where('spaceId', '=', spaceId)
      .orderBy('position', (ob) => ob.collate('C').desc())
      .limit(1)
      .where('parentPageId', 'is', null)
      .executeTakeFirst();

    if (lastPage) {
      return generateJitteredKeyBetween(lastPage.position, null);
    } else {
      return generateJitteredKeyBetween(null, null);
    }
  }

  async importZip(
    filePromise: Promise<MultipartFile>,
    source: string,
    userId: string,
    spaceId: string,
    workspaceId: string,
  ) {
    const file = await filePromise;
    const fileBuffer = await file.toBuffer();
    return this.createZipImportTask(
      fileBuffer,
      file.filename,
      source,
      userId,
      spaceId,
      workspaceId,
    );
  }

  async importGoogleDoc(
    url: string,
    userId: string,
    spaceId: string,
    workspaceId: string,
  ) {
    const maxFileSize = bytes(this.environmentService.getFileImportSizeLimit());
    const fileBuffer = await downloadGoogleDocZip(url, maxFileSize);

    return this.createZipImportTask(
      fileBuffer,
      'google-doc.zip',
      FileImportSource.Generic,
      userId,
      spaceId,
      workspaceId,
    );
  }

  private async createZipImportTask(
    fileBuffer: Buffer,
    inputFileName: string,
    source: string,
    userId: string,
    spaceId: string,
    workspaceId: string,
  ) {
    const fileExtension = path.extname(inputFileName).toLowerCase();
    const fileName = sanitizeFileName(
      path.basename(inputFileName, fileExtension),
    );
    const fileSize = fileBuffer.length;

    const fileNameWithExt = fileName + fileExtension;

    const fileTaskId = uuid7();
    const filePath = `${getFileTaskFolderPath(FileTaskType.Import, workspaceId)}/${fileTaskId}/${fileNameWithExt}`;

    let archiveUploadStarted = false;
    let fileTaskInsertionStarted = false;

    try {
      // upload file
      archiveUploadStarted = true;
      await this.storageService.upload(filePath, fileBuffer);

      fileTaskInsertionStarted = true;
      const fileTask = await this.db
        .insertInto('fileTasks')
        .values({
          id: fileTaskId,
          type: FileTaskType.Import,
          source: source,
          status: FileTaskStatus.Processing,
          fileName: fileNameWithExt,
          filePath: filePath,
          fileSize: fileSize,
          fileExt: 'zip',
          creatorId: userId,
          spaceId: spaceId,
          workspaceId: workspaceId,
        })
        .returningAll()
        .executeTakeFirst();

      await this.fileTaskQueue.add(QueueJob.IMPORT_TASK, {
        fileTaskId: fileTaskId,
      });

      return fileTask;
    } catch (error) {
      if (archiveUploadStarted) {
        try {
          await this.storageService.delete(filePath);
        } catch {
          // Cleanup is best effort; preserve the original error.
        }
      }

      if (fileTaskInsertionStarted) {
        try {
          await this.db
            .deleteFrom('fileTasks')
            .where('id', '=', fileTaskId)
            .execute();
        } catch {
          // Cleanup is best effort; preserve the original error.
        }
      }

      throw error;
    }
  }
}
