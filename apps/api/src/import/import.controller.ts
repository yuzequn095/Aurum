import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ImportService } from './import.service';

@Controller('v1/import')
@UseGuards(JwtAuthGuard)
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('transactions/dry-run')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  dryRunTransactions(@UploadedFile() file?: Express.Multer.File) {
    if (!file?.buffer) {
      throw new BadRequestException('CSV file is required');
    }
    return this.importService.dryRunTransactions(file.buffer);
  }
}
