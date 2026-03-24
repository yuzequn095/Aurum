import { Controller, Get, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EntitlementsService } from './entitlements.service';
import type { CurrentUserEntitlementsView } from './entitlements.types';

@Controller('v1/entitlements')
@UseGuards(JwtAuthGuard)
export class EntitlementsController {
  constructor(private readonly service: EntitlementsService) {}

  @Get('me')
  async getMine(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CurrentUserEntitlementsView> {
    return this.service.getCurrentUserEntitlements(user.userId);
  }
}
