import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubcategoryDto } from './dto/create-subcategory.dto';

@Injectable()
export class SubcategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, categoryId: string) {
    await this.assertCategoryOwnedByUser(userId, categoryId);

    return this.prisma.subcategory.findMany({
      where: {
        userId,
        categoryId,
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        categoryId: true,
        name: true,
      },
    });
  }

  async create(userId: string, dto: CreateSubcategoryDto) {
    await this.assertCategoryOwnedByUser(userId, dto.categoryId);

    try {
      return await this.prisma.subcategory.create({
        data: {
          userId,
          categoryId: dto.categoryId,
          name: dto.name,
        },
        select: {
          id: true,
          categoryId: true,
          name: true,
        },
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException(
          'Subcategory name already exists in this category',
        );
      }
      throw error;
    }
  }

  private async assertCategoryOwnedByUser(userId: string, categoryId: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        userId,
      },
      select: { id: true },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
