import { TransactionType } from '@prisma/client';
import {
  CSV_COLUMNS,
  CsvColumn,
  CsvParseError,
  CsvParseResult,
  ParsedCsvRow,
} from './types';

type CsvRecord = {
  fields: string[];
  line: number;
};

const REQUIRED_VALUE_COLUMNS: Array<CsvColumn> = [
  'occurredAt',
  'type',
  'amount',
  'account',
];

function decodeInput(input: Buffer | string): string {
  const text = typeof input === 'string' ? input : input.toString('utf-8');
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function splitCsvRecords(text: string): CsvRecord[] {
  const records: CsvRecord[] = [];
  let current = '';
  let row: string[] = [];
  let inQuotes = false;
  let line = 1;
  let rowStartLine = 1;

  const pushField = () => {
    row.push(current);
    current = '';
  };

  const pushRow = () => {
    pushField();
    records.push({ fields: row, line: rowStartLine });
    row = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && ch === ',') {
      pushField();
      continue;
    }

    if (!inQuotes && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      pushRow();
      line += 1;
      rowStartLine = line;
      continue;
    }

    current += ch;
  }

  if (current.length > 0 || row.length > 0) {
    pushRow();
  }

  return records;
}

function isBlankRow(fields: string[]): boolean {
  return fields.every((field) => field.trim().length === 0);
}

function normalizeType(raw: string): TransactionType | null {
  const value = raw.trim().toUpperCase();
  if (value === TransactionType.INCOME) return TransactionType.INCOME;
  if (value === TransactionType.EXPENSE) return TransactionType.EXPENSE;
  if (value === TransactionType.TRANSFER) return TransactionType.TRANSFER;
  return null;
}

function parseAmountToCents(raw: string): number | null {
  const value = raw.trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(value)) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  const cents = Math.round(amount * 100);
  return cents > 0 ? cents : null;
}

function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

function quoteLine(message: string): string {
  return message.replace(/\s+/g, ' ').trim();
}

export function parseCsv(input: Buffer | string): CsvParseResult {
  const text = decodeInput(input);
  const records = splitCsvRecords(text);

  if (records.length === 0) {
    return {
      rows: [],
      errors: [{ line: 1, message: 'CSV is empty' }],
    };
  }

  const [headerRecord, ...dataRecords] = records;
  const headers = headerRecord.fields.map((field) => field.trim());
  const columnIndex: Partial<Record<CsvColumn, number>> = {};
  const errors: CsvParseError[] = [];

  CSV_COLUMNS.forEach((column) => {
    const idx = headers.indexOf(column);
    if (idx < 0) {
      errors.push({
        line: headerRecord.line,
        message: `Missing required column: ${column}`,
      });
      return;
    }
    columnIndex[column] = idx;
  });

  if (errors.length > 0) {
    return { rows: [], errors };
  }

  const getValue = (fields: string[], column: CsvColumn): string => {
    const idx = columnIndex[column];
    if (idx == null) return '';
    return (fields[idx] ?? '').trim();
  };

  const rows: ParsedCsvRow[] = [];

  dataRecords.forEach((record) => {
    if (isBlankRow(record.fields)) return;

    const rowErrors: string[] = [];
    for (const column of REQUIRED_VALUE_COLUMNS) {
      if (!getValue(record.fields, column)) {
        rowErrors.push(`${column} is required`);
      }
    }

    const occurredAt = getValue(record.fields, 'occurredAt');
    if (occurredAt && !isValidDateOnly(occurredAt)) {
      rowErrors.push('occurredAt must be YYYY-MM-DD');
    }

    const parsedType = normalizeType(getValue(record.fields, 'type'));
    if (!parsedType) {
      rowErrors.push('type must be INCOME, EXPENSE, or TRANSFER');
    }

    const amountText = getValue(record.fields, 'amount');
    const amountCents = parseAmountToCents(amountText);
    if (amountText && amountCents == null) {
      rowErrors.push('amount must be a positive decimal with up to 2 decimals');
    }

    const category = getValue(record.fields, 'category');
    const subcategory = getValue(record.fields, 'subcategory');
    if (
      (parsedType === TransactionType.INCOME ||
        parsedType === TransactionType.EXPENSE) &&
      (!category || !subcategory)
    ) {
      rowErrors.push(
        'category and subcategory are required for income/expense',
      );
    }

    if (rowErrors.length > 0 || !parsedType || amountCents == null) {
      rowErrors.forEach((message) => {
        errors.push({ line: record.line, message: quoteLine(message) });
      });
      return;
    }

    rows.push({
      line: record.line,
      occurredAt,
      type: parsedType,
      amount: amountText,
      amountCents,
      currency: getValue(record.fields, 'currency') || 'USD',
      account: getValue(record.fields, 'account'),
      category,
      subcategory,
      merchant: getValue(record.fields, 'merchant'),
      note: getValue(record.fields, 'note'),
    });
  });

  return { rows, errors };
}
