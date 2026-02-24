import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { TransactionType } from "@prisma/client";

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  // Phase 1：先用 demo 用户；后续 Milestone（Auth）再替换成真实登录用户
  private async getDemoUserId() {
    const user = await this.prisma.user.findUnique({
      where: { email: "demo@aurum.local" },
      select: { id: true },
    });
    if (!user) throw new NotFoundException("Demo user not found. Did you run prisma db seed?");
    return user.id;
  }

  async create(dto: CreateTransactionDto) {
    const userId = await this.getDemoUserId();

    // 验证 account 属于当前用户（避免越权）
    const account = await this.prisma.account.findFirst({
      where: { id: dto.accountId, userId },
      select: { id: true },
    });
    if (!account) throw new NotFoundException("Account not found");

    // 可选：category 也验证归属
    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, userId },
        select: { id: true },
      });
      if (!category) throw new NotFoundException("Category not found");
    }

    // TRANSFER 的最小规则（先不做复杂双录；Milestone 3.2+ 再增强）
    if (dto.type === TransactionType.TRANSFER && !dto.transferId) {
      // transferId 只是为了未来把两笔转账配对；现在先允许为空也行
      // 这里先不强制，你想严格一点可以改成 throw BadRequestException
    }

    const created = await this.prisma.transaction.create({
      data: {
        userId,
        accountId: dto.accountId,
        type: dto.type,
        amountCents: dto.amountCents,
        currency: dto.currency ?? "USD",
        occurredAt: new Date(dto.occurredAt),
        categoryId: dto.categoryId,
        merchant: dto.merchant,
        note: dto.note,
        transferId: dto.transferId,
      },
      select: {
        id: true,
        userId: true,
        accountId: true,
        type: true,
        amountCents: true,
        currency: true,
        occurredAt: true,
        categoryId: true,
        merchant: true,
        note: true,
        transferId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 基础防御：如果 occurredAt 无法 parse，会变成 Invalid Date，Prisma 可能抛错
    // DTO 的 IsDateString 已经拦截大部分情况，这里一般不会触发
    if (!created.id) throw new BadRequestException("Failed to create transaction");

    return created;
  }
}