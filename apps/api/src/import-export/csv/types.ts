import { TransactionType } from '@prisma/client';

export const CSV_COLUMNS = [
  'occurredAt',
  'type',
  'amount',
  'currency',
  'account',
  'category',
  'subcategory',
  'merchant',
  'note',
] as const;

export type CsvColumn = (typeof CSV_COLUMNS)[number];

export type CsvRow = {
  occurredAt: string;
  type: TransactionType;
  amount: string;
  currency: string;
  account: string;
  category: string;
  subcategory: string;
  merchant: string;
  note: string;
};

export type ParsedCsvRow = CsvRow & {
  line: number;
  amountCents: number;
};

export type CsvParseError = {
  line: number;
  message: string;
};

export type CsvParseResult = {
  rows: ParsedCsvRow[];
  errors: CsvParseError[];
};
