import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QuickChatMessageDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @MinLength(1)
  @MaxLength(12000)
  content!: string;
}

export class QuickChatRequestDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => QuickChatMessageDto)
  messages!: QuickChatMessageDto[];

  @IsOptional()
  @IsString()
  sourceSnapshotId?: string;

  @IsOptional()
  @IsString()
  sourceReportId?: string;

  @IsOptional()
  @IsString()
  sourceFinancialHealthScoreId?: string;
}
