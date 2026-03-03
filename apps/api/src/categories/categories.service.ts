import { Injectable, NotFoundException } from '@nestjs/common';
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

    return this.prisma.category.create({
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

    const result = await this.prisma.category.updateMany({
      where: { id, userId },
      data: {
        name: dto.name,
        parentId: dto.parentId,
      },
    });

    if (result.count === 0) {
      return null;
    }

    return this.getById(userId, id);
  }

  async remove(userId: string, id: string) {
    const result = await this.prisma.category.deleteMany({
      where: { id, userId },
    });
    return result.count > 0;
  }
}
