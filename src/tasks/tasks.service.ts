import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { ClientsService } from '../clients/clients.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task, TaskDocument } from './schemas/task.schema';
import {
  allowedTransitionsFor,
  canTransition,
  TASK_STATUS_CATALOG,
  TASK_STATUS_TRANSITIONS,
  TaskStatus,
  type TaskTransitionActor,
} from './task-status';

export type TaskView = {
  id: string;
  clientId: string;
  title: string;
  brief: string;
  status: TaskStatus;
  createdAt: Date | undefined;
  updatedAt: Date | undefined;
  submittedAt?: Date;
  allowedTransitions: TaskStatus[];
};

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<TaskDocument>,
    private readonly clientsService: ClientsService,
  ) {}

  catalog() {
    return {
      statuses: TASK_STATUS_CATALOG,
      transitions: TASK_STATUS_TRANSITIONS,
    };
  }

  async list(user: JwtPayload, clientId: string, query: ListTasksQueryDto): Promise<TaskView[]> {
    const { actor } = await this.clientsService.assertAccess(user.sub, user.role, clientId);
    const filter: FilterQuery<TaskDocument> = { clientId: new Types.ObjectId(clientId) };
    if (query.status) {
      filter.status = query.status;
    }
    const docs = await this.taskModel.find(filter).sort({ createdAt: -1 }).exec();
    return docs.map((doc) => this.toView(doc, actor));
  }

  async create(user: JwtPayload, clientId: string, dto: CreateTaskDto): Promise<TaskView> {
    const { actor } = await this.clientsService.assertAccess(user.sub, user.role, clientId);
    const doc = await this.taskModel.create({
      clientId: new Types.ObjectId(clientId),
      createdByUserId: new Types.ObjectId(user.sub),
      title: dto.title.trim(),
      brief: dto.brief?.trim() ?? '',
      status: TaskStatus.DRAFT,
    });
    return this.toView(doc, actor);
  }

  async update(
    user: JwtPayload,
    clientId: string,
    taskId: string,
    dto: UpdateTaskDto,
  ): Promise<TaskView> {
    const { actor } = await this.clientsService.assertAccess(user.sub, user.role, clientId);
    const doc = await this.requireTask(clientId, taskId);
    if (doc.status !== TaskStatus.DRAFT) {
      throw new BadRequestException('Only draft tasks can be edited');
    }
    if (dto.title !== undefined) doc.title = dto.title.trim();
    if (dto.brief !== undefined) doc.brief = dto.brief.trim();
    await doc.save();
    return this.toView(doc, actor);
  }

  async changeStatus(
    user: JwtPayload,
    clientId: string,
    taskId: string,
    next: TaskStatus,
  ): Promise<TaskView> {
    const { actor } = await this.clientsService.assertAccess(user.sub, user.role, clientId);
    const doc = await this.requireTask(clientId, taskId);
    if (!canTransition(doc.status, next, actor)) {
      throw new BadRequestException(`Cannot move from ${doc.status} to ${next}`);
    }

    const from = doc.status;
    doc.status = next;
    doc.statusChangedAt = new Date();
    doc.statusChangedByUserId = new Types.ObjectId(user.sub);
    doc.statusHistory.push({
      from,
      to: next,
      actorUserId: new Types.ObjectId(user.sub),
      at: doc.statusChangedAt,
    });
    if (next === TaskStatus.VALIDATION && !doc.submittedAt) {
      doc.submittedAt = doc.statusChangedAt;
    }
    await doc.save();
    return this.toView(doc, actor);
  }

  private async requireTask(clientId: string, taskId: string): Promise<TaskDocument> {
    const doc = await this.taskModel
      .findOne({
        _id: new Types.ObjectId(taskId),
        clientId: new Types.ObjectId(clientId),
      })
      .exec();
    if (!doc) {
      throw new NotFoundException('Task not found');
    }
    return doc;
  }

  private toView(doc: TaskDocument, actor: TaskTransitionActor): TaskView {
    return {
      id: doc.id,
      clientId: doc.clientId.toString(),
      title: doc.title,
      brief: doc.brief ?? '',
      status: doc.status,
      createdAt: doc.get('createdAt') as Date | undefined,
      updatedAt: doc.get('updatedAt') as Date | undefined,
      submittedAt: doc.submittedAt,
      allowedTransitions: allowedTransitionsFor(doc.status, actor),
    };
  }
}
