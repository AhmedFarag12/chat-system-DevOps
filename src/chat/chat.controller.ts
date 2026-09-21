import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthedRequest } from '../auth/jwt-auth.guard';
import { ChatGateway } from './chat.gateway';

class SendBodyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content: string;
}

@UseGuards(JwtAuthGuard)
@Controller('conversations/:id/messages')
export class ChatController {
  constructor(private readonly gateway: ChatGateway) {}

  /** Same as the socket event message:send, for clients without a socket (Postman, curl). */
  @Post()
  send(
    @Param('id') id: string,
    @Body() body: SendBodyDto,
    @Req() req: AuthedRequest,
  ) {
    return this.gateway.sendMessage(id, req.user, body.content);
  }
}
