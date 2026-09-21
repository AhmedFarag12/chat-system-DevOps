import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ default: false })
  isGroup: boolean;

  @Prop()
  name?: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], index: true })
  participants: Types.ObjectId[];

  // sorted "idA:idB" for 1-1 chats, guarantees a single conversation per pair
  @Prop({ unique: true, sparse: true })
  directKey?: string;

  @Prop({ type: Types.ObjectId, ref: 'Message' })
  lastMessage?: Types.ObjectId;
}

export type ConversationDocument = HydratedDocument<Conversation>;
export const ConversationSchema = SchemaFactory.createForClass(Conversation);
