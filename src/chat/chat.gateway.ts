import { Inject, Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { IsBoolean, IsMongoId, IsString, MaxLength, MinLength } from 'class-validator';
import type Redis from 'ioredis';
import type { Server, Socket } from 'socket.io';
import { JwtPayload } from '../auth/jwt-auth.guard';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../messages/messages.service';
import { REDIS } from '../redis/redis.module';

class SendMessageDto {
  @IsMongoId()
  conversationId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content: string;
}

class ConversationDto {
  @IsMongoId()
  conversationId: string;
}

class TypingDto extends ConversationDto {
  @IsBoolean()
  isTyping: boolean;
}

type AuthedSocket = Socket & { data: { user: JwtPayload } };

const room = (id: string) => `conv:${id}`;
const userRoom = (id: string) => `user:${id}`;
const presenceKey = (id: string) => `presence:${id}`;

@UsePipes(
  new ValidationPipe({
    whitelist: true,
    exceptionFactory: (errors) => new WsException(errors),
  }),
)
@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);
  @WebSocketServer() server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly conversations: ConversationsService,
    private readonly messages: MessagesService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async handleConnection(client: AuthedSocket) {
    try {
      const token =
        client.handshake.auth?.token ??
        client.handshake.headers.authorization?.replace(/^Bearer /, '');
      client.data.user = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect(true);
      return;
    }

    const { sub } = client.data.user;
    const convoIds = await this.conversations.idsForUser(sub);
    await client.join([userRoom(sub), ...convoIds.map(room)]);

    // a user may have several tabs/devices: count sockets, online while > 0
    const count = await this.redis.incr(presenceKey(sub));
    if (count === 1) this.broadcastPresence(convoIds, sub, true);
  }

  async handleDisconnect(client: AuthedSocket) {
    const sub = client.data.user?.sub;
    if (!sub) return;
    const count = await this.redis.decr(presenceKey(sub));
    if (count <= 0) {
      await this.redis.del(presenceKey(sub));
      const convoIds = await this.conversations.idsForUser(sub);
      this.broadcastPresence(convoIds, sub, false);
    }
  }

  @SubscribeMessage('message:send')
  onSend(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() dto: SendMessageDto,
  ) {
    return this.sendMessage(dto.conversationId, client.data.user, dto.content);
  }

  /** Saves the message and delivers it to every participant socket. */
  async sendMessage(conversationId: string, user: JwtPayload, content: string) {
    const convo = await this.conversations.assertMember(conversationId, user.sub);
    const msg = await this.messages.send(conversationId, user.sub, content);
    const targets = convo.participants.map((p) => userRoom(p.toString()));
    // sockets opened before this conversation existed are not in its room yet
    this.server.in(targets).socketsJoin(room(conversationId));
    const payload = {
      ...msg.toObject(),
      sender: { _id: user.sub, username: user.username },
    };
    // user rooms are joined at connect time, so delivery never depends on the
    // (asynchronous) room join above, even for the first message of a conversation
    this.server.to(targets).emit('message:new', payload);
    return payload;
  }

  /** Join the room of a conversation created after the socket connected. */
  @SubscribeMessage('conversation:join')
  async onJoin(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() dto: ConversationDto,
  ) {
    await this.conversations.assertMember(dto.conversationId, client.data.user.sub);
    await client.join(room(dto.conversationId));
    return { ok: true };
  }

  @SubscribeMessage('typing')
  async onTyping(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() dto: TypingDto,
  ) {
    if (!client.rooms.has(room(dto.conversationId))) {
      throw new WsException('Not in conversation');
    }
    client.to(room(dto.conversationId)).emit('typing', {
      conversationId: dto.conversationId,
      userId: client.data.user.sub,
      isTyping: dto.isTyping,
    });
  }

  @SubscribeMessage('message:read')
  async onRead(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() dto: ConversationDto,
  ) {
    await this.messages.markRead(dto.conversationId, client.data.user.sub);
    client.to(room(dto.conversationId)).emit('message:read', {
      conversationId: dto.conversationId,
      userId: client.data.user.sub,
    });
    return { ok: true };
  }

  @SubscribeMessage('presence:get')
  async onPresence(@MessageBody('userIds') userIds: string[] = []) {
    const keys = userIds.slice(0, 200).map(presenceKey);
    if (!keys.length) return {};
    const counts = await this.redis.mget(keys);
    return Object.fromEntries(
      userIds.slice(0, 200).map((id, i) => [id, Number(counts[i] ?? 0) > 0]),
    );
  }

  private broadcastPresence(convoIds: string[], userId: string, online: boolean) {
    if (!convoIds.length) return;
    this.server
      .to(convoIds.map(room))
      .emit('presence', { userId, online });
  }
}
