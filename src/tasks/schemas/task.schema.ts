import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { TaskStatus } from '../task-status';

export type TaskDocument = HydratedDocument<Task>;

export type TaskStatusChange = {
  from: TaskStatus;
  to: TaskStatus;
  actorUserId: Types.ObjectId;
  at: Date;
};

@Schema({ timestamps: true, collection: 'tasks' })
export class Task {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Client', required: true, index: true })
  clientId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  createdByUserId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 160 })
  title: string;

  @Prop({ default: '', trim: true, maxlength: 8000 })
  brief: string;

  @Prop({ type: String, enum: TaskStatus, default: TaskStatus.DRAFT, index: true })
  status: TaskStatus;

  @Prop({ required: false })
  submittedAt?: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  statusChangedByUserId?: Types.ObjectId;

  @Prop({ required: false })
  statusChangedAt?: Date;

  @Prop({
    type: [
      {
        from: { type: String, enum: Object.values(TaskStatus), required: true },
        to: { type: String, enum: Object.values(TaskStatus), required: true },
        actorUserId: { type: MongooseSchema.Types.ObjectId, ref: 'User', required: true },
        at: { type: Date, required: true },
      },
    ],
    default: [],
  })
  statusHistory: TaskStatusChange[];
}

export const TaskSchema = SchemaFactory.createForClass(Task);
TaskSchema.index({ clientId: 1, status: 1, createdAt: -1 });
TaskSchema.index({ clientId: 1, createdAt: -1 });
