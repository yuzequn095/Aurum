import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        currency: true,
      },
    });
  }

  async getById(userId: string, id: string) {
    return this.prisma.account.findFirst({
      where: { id, userId },
      select: {
        id: true,
        name: true,
        currency: true,
      },
    });
  }

  async create(userId: string, dto: CreateAccountDto) {
    return this.prisma.account.create({
      data: {
        userId,
        name: dto.name,
        currency: dto.currency ?? 'USD',
      },
      select: {
        id: true,
        name: true,
        currency: true,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateAccountDto) {
    const result = await this.prisma.account.updateMany({
      where: { id, userId },
      data: {
        name: dto.name,
        currency: dto.currency,
      },
    });

    if (result.count === 0) {
      return null;
    }

    return this.getById(userId, id);
  }

  async remove(userId: string, id: string) {
    const result = await this.prisma.account.deleteMany({
      where: { id, userId },
    });
    return result.count > 0;
  }
}
