import { IsOptional, Matches } from 'class-validator';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class MaterializeManualStaticSnapshotDto {
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, {
    message: 'snapshotDate must be YYYY-MM-DD',
  })
  snapshotDate?: string;
}
