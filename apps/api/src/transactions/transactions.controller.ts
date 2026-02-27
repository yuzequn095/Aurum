import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Query } from "@nestjs/common";
import { TransactionsService } from "./transactions.service";
import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { GetTransactionsQueryDto } from "./dto/get-transactions-query.dto";
import { UpdateTransactionDto } from "./dto/update-transaction.dto";

@Controller("v1/transactions")
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Get()
  async list(@Query() query: GetTransactionsQueryDto) {
    return this.service.list(query);
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    const tx = await this.service.getById(id);
    if (!tx) throw new NotFoundException("Transaction not found");
    return tx;
  }

  @Post()
  async create(@Body() dto: CreateTransactionDto) {
    return this.service.create(dto);
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateTransactionDto) {
    const tx = await this.service.update(id, dto);
    if (!tx) throw new NotFoundException("Transaction not found");
    return tx;
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    const ok = await this.service.remove(id);
    if (!ok) throw new NotFoundException("Transaction not found");
    return { ok: true };
  }
}
