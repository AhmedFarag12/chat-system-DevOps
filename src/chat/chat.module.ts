import { Module } from '@nestjs/common';
import { ConversationsModule } from '../conversations/conversations.module';
import { MessagesModule } from '../messages/messages.module';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [ConversationsModule, MessagesModule],
  controllers: [ChatController],
  providers: [ChatGateway],
})
export class ChatModule {}
