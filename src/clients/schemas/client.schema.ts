import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ClientDocument = HydratedDocument<Client>;

export enum ClientStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

@Schema({ timestamps: true, collection: 'clients' })
export class Client {
  @Prop({ required: true, trim: true, maxlength: 120 })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ type: String, enum: ClientStatus, default: ClientStatus.ACTIVE })
  status: ClientStatus;
}

export const ClientSchema = SchemaFactory.createForClass(Client);
