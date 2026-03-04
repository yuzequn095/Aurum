import { Injectable } from '@nestjs/common';
import { parseCsv } from '../import-export/csv/parse';

@Injectable()
export class ImportService {
  dryRunTransactions(fileBuffer: Buffer) {
    const parsed = parseCsv(fileBuffer);
    const previewRows = parsed.rows.slice(0, 20);
    const uniqueErrorLines = new Set(parsed.errors.map((error) => error.line));
    const totalRows = new Set([
      ...parsed.rows.map((row) => row.line),
      ...uniqueErrorLines.values(),
    ]).size;

    return {
      previewRows,
      errors: parsed.errors,
      summary: {
        totalRows,
        validRows: parsed.rows.length,
        errorCount: parsed.errors.length,
      },
    };
  }
}
