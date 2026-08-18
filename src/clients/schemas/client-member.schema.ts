import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type ClientMemberDocument = HydratedDocument<ClientMember>;

export enum ClientMemberRole {
  OWNER = 'owner',
  MEMBER = 'member',
}

@Schema({ timestamps: true, collection: 'client_members' })
export class ClientMember {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Client', required: true, index: true })
  clientId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: ClientMemberRole, default: ClientMemberRole.MEMBER })
  role: ClientMemberRole;
}

export const ClientMemberSchema = SchemaFactory.createForClass(ClientMember);
ClientMemberSchema.index({ clientId: 1, userId: 1 }, { unique: true });
ClientMemberSchema.index({ userId: 1, createdAt: -1 });
