import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AIConversationsService } from './ai-conversations.service';
import type {
  AIConversationDetailView,
  AIConversationSummaryView,
} from './ai-conversations.types';
import { CreateAIConversationDto } from './dto/create-ai-conversation.dto';
import { UpdateAIConversationDto } from './dto/update-ai-conversation.dto';

@Controller('v1/ai-conversations')
@UseGuards(JwtAuthGuard)
export class AIConversationsController {
  constructor(private readonly service: AIConversationsService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAIConversationDto,
  ): Promise<AIConversationDetailView> {
    return this.service.createConversation(user.userId, dto);
  }

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AIConversationSummaryView[]> {
    return this.service.listConversations(user.userId);
  }

  @Get(':id')
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<AIConversationDetailView> {
    const conversation = await this.service.getConversationById(
      user.userId,
      id,
    );
    if (!conversation) {
      throw new NotFoundException(`AI conversation not found: ${id}`);
    }

    return conversation;
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAIConversationDto,
  ): Promise<AIConversationSummaryView> {
    const conversation = await this.service.updateConversation(
      user.userId,
      id,
      dto,
    );
    if (!conversation) {
      throw new NotFoundException(`AI conversation not found: ${id}`);
    }

    return conversation;
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<{ ok: true }> {
    const ok = await this.service.deleteConversation(user.userId, id);
    if (!ok) {
      throw new NotFoundException(`AI conversation not found: ${id}`);
    }

    return { ok: true };
  }
}
