import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as cheerio from 'cheerio';

import { jsonToHtml, jsonToNode } from '../../collaboration/collaboration.util';
import { turndown } from './turndown-utils';
import { ExportFormat } from './dto/export-dto';
import { Page } from '@docmost/db/types/entity.types';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import * as JSZip from 'jszip';
import { StorageService } from '../storage/storage.service';
import { PdfExportService } from './pdf-export.service';
import { ZipEncryptionService, ExportEntry } from './zip-encryption.service';
import {
  buildTree,
  computeLocalPath,
  getPageTitle,
  PageExportTree,
  replaceInternalLinks,
  updateAttachmentUrlsToLocalPaths,
} from './utils';
import { PageRepo } from '@docmost/db/repos/page/page.repo';
import { Node } from '@tiptap/pm/model';
import { EditorState } from '@tiptap/pm/state';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import slugify = require('@sindresorhus/slugify');
import { EnvironmentService } from '../environment/environment.service';
import {
  getAttachmentIds,
  getProsemirrorContent,
} from '../../common/helpers/prosemirror/utils';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private readonly pageRepo: PageRepo,
    @InjectKysely() private readonly db: KyselyDB,
    private readonly storageService: StorageService,
    private readonly environmentService: EnvironmentService,
    private readonly pdfExportService: PdfExportService,
    private readonly zipEncryptionService: ZipEncryptionService,
  ) {}

  async exportPage(format: string, page: Page, singlePage?: boolean): Promise<string | Buffer> {
    const titleNode = {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: getPageTitle(page.title) }],
    };

    let prosemirrorJson: any;

    if (singlePage) {
      prosemirrorJson = await this.turnPageMentionsToLinks(
        getProsemirrorContent(page.content),
        page.workspaceId,
      );
    } else {
      // mentions is already turned to links during the zip process
      prosemirrorJson = getProsemirrorContent(page.content);
    }

    if (page.title) {
      prosemirrorJson.content.unshift(titleNode);
    }

    const pageHtml = jsonToHtml(prosemirrorJson);

    let finalHtml = pageHtml;
    if (format === ExportFormat.PDF || format === ExportFormat.DOCX) {
      finalHtml = await this.prepareHtmlForExport(finalHtml, page.spaceId, format);
    }

    if (format === ExportFormat.HTML) {
      return `<!DOCTYPE html>
      <html>
        <head>
         <title>${getPageTitle(page.title)}</title>
        </head>
        <body>${finalHtml}</body>
      </html>`;
    }

    if (format === ExportFormat.Markdown) {
      const newPageHtml = finalHtml.replace(
        /<colgroup[^>]*>[\s\S]*?<\/colgroup>/gim,
        '',
      );
      return turndown(newPageHtml);
    }

    if (format === ExportFormat.PDF) {
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const pageLink = `${appUrl}/p/${page.slugId}`;
      return this.pdfExportService.exportHtmlToPdf(finalHtml, getPageTitle(page.title), pageLink);
    }

    if (format === ExportFormat.DOCX) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const HTMLtoDOCX = require('html-to-docx');
      const docxHtml = `<!DOCTYPE html>
      <html>
        <head>
         <title>${getPageTitle(page.title)}</title>
        </head>
        <body>${finalHtml}</body>
      </html>`;
      const docxBuffer = await HTMLtoDOCX(docxHtml, null, {
        title: getPageTitle(page.title),
      });
      return docxBuffer;
    }

    return;
  }

  private async prepareHtmlForExport(html: string, spaceId: string, format: string): Promise<string> {
    const $ = cheerio.load(html, null, false);
    
    if (format === ExportFormat.DOCX) {
      $('table').css('width', '100%');
    }

    const images = $('img, div[data-type="drawio"], div[data-type="excalidraw"]').toArray();

    for (const img of images) {
      const isDiv = img.tagName.toLowerCase() === 'div';
      const src = isDiv ? $(img).attr('data-src') : $(img).attr('src');
      let attachmentId = $(img).attr('data-attachment-id');

      if (!attachmentId && src) {
        const match = src.match(/\/api\/files\/([a-zA-Z0-9-]+)/);
        if (match) attachmentId = match[1];
      }

      if (attachmentId) {
        try {
          const attachment = await this.db
            .selectFrom('attachments')
            .selectAll()
            .where('id', '=', attachmentId)
            .where('spaceId', '=', spaceId)
            .executeTakeFirst();
            
          if (attachment) {
            const fileBuffer = await this.storageService.read(attachment.filePath);
            const base64 = fileBuffer.toString('base64');
            let mimeType = 'image/png';
            if (attachment.fileName.toLowerCase().endsWith('.jpg') || attachment.fileName.toLowerCase().endsWith('.jpeg')) {
              mimeType = 'image/jpeg';
            } else if (attachment.fileName.toLowerCase().endsWith('.gif')) {
              mimeType = 'image/gif';
            } else if (attachment.fileName.toLowerCase().endsWith('.webp')) {
              mimeType = 'image/webp';
            } else if (attachment.fileName.toLowerCase().endsWith('.svg')) {
              mimeType = 'image/svg+xml';
            }
            
            if (isDiv) {
              img.tagName = 'img';
              $(img).removeAttr('data-type');
              $(img).removeAttr('data-src');
            }
            $(img).attr('src', `data:${mimeType};base64,${base64}`);
          }
        } catch (err) {
          this.logger.debug(`Failed to inject base64 image ${attachmentId}`, err);
        }
      }
    }

    return $.html();
  }

  async exportPages(
    pageId: string,
    format: string,
    includeAttachments: boolean,
    includeChildren: boolean,
    password?: string,
  ) {
    let pages: Page[];

    if (includeChildren) {
      //@ts-ignore
      pages = await this.pageRepo.getPageAndDescendants(pageId, {
        includeContent: true,
      });
    } else {
      const page = await this.pageRepo.findById(pageId, {
        includeContent: true,
      });
      if (page) {
        pages = [page];
      }
    }

    if (!pages || pages.length === 0) {
      throw new BadRequestException('No pages to export');
    }

    const parentPageIndex = pages.findIndex((obj) => obj.id === pageId);
    pages[parentPageIndex].parentPageId = null;

    const tree = buildTree(pages as Page[]);

    const entries = await this.getExportEntries(tree, format, includeAttachments);
    console.log(
      `[export] exportPages: entries=${entries.length}, password=${password ? 'provided' : 'missing'}`,
    );

    if (password) {
      return this.zipEncryptionService.createEncryptedZipStream(entries, password);
    }

    const zip = new JSZip();
    for (const entry of entries) {
      zip.file(entry.entryPath, entry.content);
    }

    const zipFile = zip.generateNodeStream({
      type: 'nodebuffer',
      streamFiles: true,
      compression: 'DEFLATE',
    });

    return zipFile;
  }

  async exportSpace(
    spaceId: string,
    format: string,
    includeAttachments: boolean,
    password?: string,
  ) {
    const space = await this.db
      .selectFrom('spaces')
      .selectAll()
      .where('id', '=', spaceId)
      .executeTakeFirst();

    if (!space) {
      throw new NotFoundException('Space not found');
    }

    const pages = await this.db
      .selectFrom('pages')
      .select([
        'pages.id',
        'pages.slugId',
        'pages.title',
        'pages.content',
        'pages.parentPageId',
        'pages.spaceId',
        'pages.workspaceId',
      ])
      .where('spaceId', '=', spaceId)
      .execute();

    const tree = buildTree(pages as Page[]);

    const entries = await this.getExportEntries(tree, format, includeAttachments);
    console.log(
      `[export] exportSpace: entries=${entries.length}, password=${password ? 'provided' : 'missing'}`,
    );

    let zipFile: NodeJS.ReadableStream;
    if (password) {
      zipFile = this.zipEncryptionService.createEncryptedZipStream(entries, password);
    } else {
      const zip = new JSZip();
      for (const entry of entries) {
        zip.file(entry.entryPath, entry.content);
      }
      zipFile = zip.generateNodeStream({
        type: 'nodebuffer',
        streamFiles: true,
        compression: 'DEFLATE',
      });
    }

    const fileName = `${space.name}-space-export.zip`;
    return {
      fileBuffer: zipFile,
      fileName,
    };
  }

  async getExportEntries(
    tree: PageExportTree,
    format: string,
    includeAttachments: boolean,
  ): Promise<ExportEntry[]> {
    const slugIdToPath: Record<string, string> = {};

    computeLocalPath(tree, format, null, '', slugIdToPath);

    const entries: ExportEntry[] = [];
    const stack: { parentPageId: string | null }[] = [
      { parentPageId: null },
    ];

    while (stack.length > 0) {
      const { parentPageId } = stack.pop();
      const children = tree[parentPageId] || [];

      for (const page of children) {
        const childPages = tree[page.id] || [];

        const prosemirrorJson = await this.turnPageMentionsToLinks(
          getProsemirrorContent(page.content),
          page.workspaceId,
        );

        const currentPagePath = slugIdToPath[page.slugId];

        let updatedJsonContent = replaceInternalLinks(
          prosemirrorJson,
          slugIdToPath,
          currentPagePath,
        );

        if (includeAttachments) {
          const attachmentEntries = await this.getAttachmentEntries(
            updatedJsonContent,
            page.spaceId,
          );
          entries.push(...attachmentEntries);
          updatedJsonContent =
            updateAttachmentUrlsToLocalPaths(updatedJsonContent);
        }

        const pageExportContent = await this.exportPage(format, {
          ...page,
          content: updatedJsonContent,
        });

        entries.push({
          entryPath: currentPagePath,
          content: pageExportContent,
        });

        if (childPages.length > 0) {
          stack.push({ parentPageId: page.id });
        }
      }
    }

    return entries;
  }

  async getAttachmentEntries(
    prosemirrorJson: any,
    spaceId: string,
  ): Promise<ExportEntry[]> {
    const attachmentIds = getAttachmentIds(prosemirrorJson);

    if (attachmentIds.length === 0) return [];

    const attachments = await this.db
      .selectFrom('attachments')
      .selectAll()
      .where('id', 'in', attachmentIds)
      .where('spaceId', '=', spaceId)
      .execute();

    const entries: ExportEntry[] = [];
    await Promise.all(
      attachments.map(async (attachment) => {
        try {
          const fileBuffer = await this.storageService.read(
            attachment.filePath,
          );
          const filePath = `files/${attachment.id}/${attachment.fileName}`;
          entries.push({ entryPath: filePath, content: fileBuffer });
        } catch (err) {
          this.logger.debug(`Attachment export error ${attachment.id}`, err);
        }
      }),
    );
    return entries;
  }

  async turnPageMentionsToLinks(prosemirrorJson: any, workspaceId: string) {
    const doc = jsonToNode(prosemirrorJson);

    const pageMentionIds = [];

    doc.descendants((node: Node) => {
      if (node.type.name === 'mention' && node.attrs.entityType === 'page') {
        if (node.attrs.entityId) {
          pageMentionIds.push(node.attrs.entityId);
        }
      }
    });

    if (pageMentionIds.length < 1) {
      return prosemirrorJson;
    }

    const pages = await this.db
      .selectFrom('pages')
      .select(['id', 'slugId', 'title', 'creatorId', 'spaceId', 'workspaceId'])
      .select((eb) => this.pageRepo.withSpace(eb))
      .where('id', 'in', pageMentionIds)
      .where('workspaceId', '=', workspaceId)
      .execute();

    const pageMap = new Map(pages.map((page) => [page.id, page]));

    let editorState = EditorState.create({
      doc: doc,
    });

    const transaction = editorState.tr;

    let offset = 0;

    /**
     * Helper function to replace a mention node with a link node.
     */
    const replaceMentionWithLink = (
      node: Node,
      pos: number,
      title: string,
      slugId: string,
      spaceSlug: string,
    ) => {
      const linkTitle = title || 'untitled';
      const truncatedTitle = linkTitle?.substring(0, 70);
      const pageSlug = `${slugify(truncatedTitle)}-${slugId}`;

      // Create the link URL
      const link = `${this.environmentService.getAppUrl()}/s/${spaceSlug}/p/${pageSlug}`;

      // Create a link mark and a text node with that mark
      const linkMark = editorState.schema.marks.link.create({ href: link });
      const linkTextNode = editorState.schema.text(linkTitle, [linkMark]);

      // Calculate positions (adjusted by the current offset)
      const from = pos + offset;
      const to = pos + offset + node.nodeSize;

      // Replace the node in the transaction and update the offset
      transaction.replaceWith(from, to, linkTextNode);
      offset += linkTextNode.nodeSize - node.nodeSize;
    };

    // find and convert page mentions to links
    editorState.doc.descendants((node: Node, pos: number) => {
      // Check if the node is a page mention
      if (node.type.name === 'mention' && node.attrs.entityType === 'page') {
        const { entityId: pageId, slugId, label } = node.attrs;
        const page = pageMap.get(pageId);

        if (page) {
          replaceMentionWithLink(
            node,
            pos,
            page.title,
            page.slugId,
            page.space.slug,
          );
        } else {
          // if page is not found, default to  the node label and slugId
          replaceMentionWithLink(node, pos, label, slugId, 'undefined');
        }
      }
    });

    if (transaction.docChanged) {
      editorState = editorState.apply(transaction);
    }

    const updatedDoc = editorState.doc;

    return updatedDoc.toJSON();
  }
}
