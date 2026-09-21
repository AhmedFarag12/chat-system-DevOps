import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConversationsService } from '../conversations/conversations.service';
import { Message } from './message.schema';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name) private readonly model: Model<Message>,
    private readonly conversations: ConversationsService,
  ) {}

  async send(conversationId: string, senderId: string, content: string) {
    await this.conversations.assertMember(conversationId, senderId);
    const msg = await this.model.create({
      conversation: conversationId,
      sender: senderId,
      content,
      readBy: [senderId],
    });
    await this.conversations.touch(conversationId, msg._id);
    return msg;
  }

  /** Cursor pagination: pass `before` (a message id) to get older messages. */
  async history(conversationId: string, userId: string, before?: string, limit = 30) {
    await this.conversations.assertMember(conversationId, userId);
    const filter: Record<string, unknown> = { conversation: conversationId };
    if (before) filter._id = { $lt: before };
    return this.model
      .find(filter)
      .sort({ _id: -1 })
      .limit(Math.min(limit, 100))
      .populate('sender', 'username');
  }

  async markRead(conversationId: string, userId: string) {
    await this.conversations.assertMember(conversationId, userId);
    await this.model.updateMany(
      { conversation: conversationId, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } },
    );
  }
}
