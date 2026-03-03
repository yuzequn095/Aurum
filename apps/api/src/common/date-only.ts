import { BadRequestException } from '@nestjs/common';

const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDateOnly(dateStr: string): Date {
  const match = DATE_ONLY_REGEX.exec(dateStr);
  if (!match) {
    throw new BadRequestException('occurredAt must be YYYY-MM-DD');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new BadRequestException('occurredAt is not a valid calendar date');
  }

  return date;
}

export function formatDateOnly(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
