import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateSubcategoryDto } from './dto/create-subcategory.dto';
import { GetSubcategoriesQueryDto } from './dto/get-subcategories-query.dto';
import { SubcategoriesService } from './subcategories.service';

@Controller('v1/subcategories')
@UseGuards(JwtAuthGuard)
export class SubcategoriesController {
  constructor(private readonly service: SubcategoriesService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetSubcategoriesQueryDto,
  ) {
    return this.service.list(user.userId, query.categoryId);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSubcategoryDto,
  ) {
    return this.service.create(user.userId, dto);
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const ok = await this.service.remove(user.userId, id);
    if (!ok) throw new NotFoundException('Subcategory not found');
    return { ok: true };
  }
}
