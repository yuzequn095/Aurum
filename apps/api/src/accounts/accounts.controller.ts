import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller("v1/accounts")
export class AccountsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    const user = await this.prisma.user.findUnique({
      where: { email: "demo@aurum.local" },
      select: { id: true },
    });
    if (!user) return [];

    return this.prisma.account.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        currency: true,
      },
    });
  }
}
