import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { CategoriesModule } from './categories/categories.module';
import { TransactionsModule } from './transactions/transactions.module';
import { AccountsModule } from './accounts/accounts.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { SubcategoriesModule } from './subcategories/subcategories.module';
import { ExportModule } from './export/export.module';
import { ImportModule } from './import/import.module';
import { PortfolioSnapshotsModule } from './portfolio-snapshots/portfolio-snapshots.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CategoriesModule,
    SubcategoriesModule,
    TransactionsModule,
    AccountsModule,
    AnalyticsModule,
    AiModule,
    ExportModule,
    ImportModule,
    PortfolioSnapshotsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
