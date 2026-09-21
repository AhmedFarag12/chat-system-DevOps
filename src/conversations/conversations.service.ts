import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation } from './conversation.schema';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(Conversation.name) private readonly model: Model<Conversation>,
  ) {}

  async createDirect(me: string, other: string) {
    const directKey = [me, other].sort().join(':');
    const existing = await this.model.findOne({ directKey });
    if (existing) return existing;
    try {
      return await this.model.create({ participants: [me, other], directKey });
    } catch (e: any) {
      if (e?.code === 11000) return this.model.findOne({ directKey });
      throw e;
    }
  }

  createGroup(me: string, name: string, userIds: string[]) {
    const participants = [...new Set([me, ...userIds])];
    return this.model.create({ isGroup: true, name, participants });
  }

  listForUser(userId: string) {
    return this.model
      .find({ participants: userId })
      .sort({ updatedAt: -1 })
      .populate('participants', 'username')
      .populate('lastMessage');
  }

  /** Returns the conversation, or throws when the user is not a member. */
  async assertMember(conversationId: string, userId: string) {
    if (!Types.ObjectId.isValid(conversationId)) throw new NotFoundException();
    const convo = await this.model.findById(conversationId);
    if (!convo) throw new NotFoundException('Conversation not found');
    if (!convo.participants.some((p) => p.equals(userId))) {
      throw new ForbiddenException('Not a participant');
    }
    return convo;
  }

  async idsForUser(userId: string): Promise<string[]> {
    const docs = await this.model.find({ participants: userId }).select('_id');
    return docs.map((d) => d.id);
  }

  touch(conversationId: string, lastMessage: Types.ObjectId) {
    return this.model.updateOne({ _id: conversationId }, { lastMessage });
  }
}
