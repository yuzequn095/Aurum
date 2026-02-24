import { Body, Controller, Post } from "@nestjs/common";
import { TransactionsService } from "./transactions.service";
import { CreateTransactionDto } from "./dto/create-transaction.dto";

@Controller("v1/transactions")
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Post()
  async create(@Body() dto: CreateTransactionDto) {
    return this.service.create(dto);
  }
}