import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class GetSummarySeriesQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  months!: number;

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(9999)
  endYear!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  endMonth!: number;
}
