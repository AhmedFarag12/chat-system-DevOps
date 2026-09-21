import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthedRequest } from '../auth/jwt-auth.guard';
import { MessagesService } from './messages.service';

@UseGuards(JwtAuthGuard)
@Controller('conversations/:id/messages')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get()
  history(
    @Param('id') id: string,
    @Req() req: AuthedRequest,
    @Query('before') before?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.messages.history(id, req.user.sub, before, limit);
  }

  @Post('read')
  async read(@Param('id') id: string, @Req() req: AuthedRequest) {
    await this.messages.markRead(id, req.user.sub);
    return { ok: true };
  }
}
