import { Module } from '@nestjs/common';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';
import { PdfExportService } from './pdf-export.service';
import { ZipEncryptionService } from './zip-encryption.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  providers: [ExportService, PdfExportService, ZipEncryptionService],
  controllers: [ExportController],
})
export class ExportModule {}
