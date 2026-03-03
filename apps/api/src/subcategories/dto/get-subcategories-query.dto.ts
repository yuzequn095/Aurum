import { IsString } from 'class-validator';

export class GetSubcategoriesQueryDto {
  @IsString()
  categoryId!: string;
}
