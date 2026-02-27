import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('v1/categories')
export class CategoriesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    // Phase 1：先用 demo 用户；Milestone 3 再接 Auth（JWT/session）
    const user = await this.prisma.user.findUnique({
      where: { email: 'demo@aurum.local' },
      select: { id: true },
    });

    if (!user) return [];

    return this.prisma.category.findMany({
      where: { userId: user.id },
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        parentId: true,
      },
    });
  }
}
