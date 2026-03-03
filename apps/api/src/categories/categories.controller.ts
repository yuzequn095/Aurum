import { Controller, Get } from '@nestjs/common';
import { AuthProvider } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Controller('v1/categories')
export class CategoriesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    const identity = await this.prisma.authIdentity.findUnique({
      where: {
        provider_identifier: {
          provider: AuthProvider.EMAIL,
          identifier: 'demo@aurum.local',
        },
      },
      select: { userId: true },
    });

    if (!identity) return [];

    return this.prisma.category.findMany({
      where: { userId: identity.userId },
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        parentId: true,
      },
    });
  }
}
