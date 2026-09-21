import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthedRequest } from '../auth/jwt-auth.guard';
import { ConversationsService } from './conversations.service';
import { CreateDirectDto, CreateGroupDto } from './dto/conversation.dto';

@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get()
  list(@Req() req: AuthedRequest) {
    return this.conversations.listForUser(req.user.sub);
  }

  @Post('direct')
  direct(@Body() dto: CreateDirectDto, @Req() req: AuthedRequest) {
    return this.conversations.createDirect(req.user.sub, dto.userId);
  }

  @Post('group')
  group(@Body() dto: CreateGroupDto, @Req() req: AuthedRequest) {
    return this.conversations.createGroup(req.user.sub, dto.name, dto.userIds);
  }
}
