import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.category.findMany({
      where: { userId },
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        parentId: true,
      },
    });
  }

  async getById(userId: string, id: string) {
    return this.prisma.category.findFirst({
      where: { id, userId },
      select: {
        id: true,
        name: true,
        parentId: true,
      },
    });
  }

  async create(userId: string, dto: CreateCategoryDto) {
    if (dto.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: { id: dto.parentId, userId },
        select: { id: true },
      });
      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }
    }

    try {
      return await this.prisma.category.create({
        data: {
          userId,
          name: dto.name,
          parentId: dto.parentId,
        },
        select: {
          id: true,
          name: true,
          parentId: true,
        },
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Category name already exists');
      }
      throw error;
    }
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    if (dto.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: { id: dto.parentId, userId },
        select: { id: true },
      });
      if (!parent) {
        return null;
      }
    }

    let result: Prisma.BatchPayload;
    try {
      result = await this.prisma.category.updateMany({
        where: { id, userId },
        data: {
          name: dto.name,
          parentId: dto.parentId,
        },
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Category name already exists');
      }
      throw error;
    }

    if (result.count === 0) {
      return null;
    }

    return this.getById(userId, id);
  }

  async remove(userId: string, id: string) {
    try {
      const result = await this.prisma.category.deleteMany({
        where: { id, userId },
      });
      return result.count > 0;
    } catch (error) {
      if (this.isForeignKeyViolation(error)) {
        throw new ConflictException(
          'Category is used by existing transactions and cannot be deleted',
        );
      }
      throw error;
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private isForeignKeyViolation(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2003'
    );
  }
}
