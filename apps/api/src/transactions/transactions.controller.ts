import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { TransactionsService } from "./transactions.service";
import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { GetTransactionsQueryDto } from "./dto/get-transactions-query.dto";

@Controller("v1/transactions")
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Get()
  async list(@Query() query: GetTransactionsQueryDto) {
    return this.service.list(query);
  }

  @Post()
  async create(@Body() dto: CreateTransactionDto) {
    return this.service.create(dto);
  }
}
