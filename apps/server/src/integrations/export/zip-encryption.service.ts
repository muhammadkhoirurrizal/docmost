import { Injectable, Logger } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import archiver = require('archiver');
// eslint-disable-next-line @typescript-eslint/no-require-imports
import archiverZipEncrypted = require('archiver-zip-encrypted');
import { PassThrough, Readable } from 'stream';

// Register the encrypted ZIP format once at module level
archiver.registerFormat('zip-encrypted', archiverZipEncrypted);
console.log('[zip-encryption] format registered, archiver version:', require('archiver/package.json').version);

export interface ExportEntry {
  entryPath: string;
  content: Buffer | string;
}

@Injectable()
export class ZipEncryptionService {
  private readonly logger = new Logger(ZipEncryptionService.name);

  /**
   * Creates an AES-256 encrypted ZIP as a readable stream.
   */
  createEncryptedZipStream(
    entries: ExportEntry[],
    password: string,
  ): Readable {
    console.log(
      `[zip-encryption] Creating encrypted ZIP with ${entries.length} entries (password length: ${password?.length ?? 0})`,
    );

    const passThrough = new PassThrough();

    const archive = archiver.create('zip-encrypted', {
      zlib: { level: 8 },
      encryptionMethod: 'aes256',
      password,
    });

    archive.on('error', (err) => {
      this.logger.error('Encrypted ZIP creation error', err);
      passThrough.destroy(err);
    });

    archive.pipe(passThrough);

    for (const entry of entries) {
      const content =
        typeof entry.content === 'string'
          ? Buffer.from(entry.content, 'utf8')
          : entry.content;
      archive.append(content, { name: entry.entryPath });
    }

    archive.finalize();
    return passThrough;
  }

  /**
   * Creates an AES-256 encrypted ZIP as a Buffer (for smaller payloads).
   */
  async createEncryptedZipBuffer(
    entries: ExportEntry[],
    password: string,
  ): Promise<Buffer> {
    const chunks: Buffer[] = [];
    const stream = this.createEncryptedZipStream(entries, password);

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
}
