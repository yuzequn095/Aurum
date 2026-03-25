import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateAIConversationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title?: string;
}
