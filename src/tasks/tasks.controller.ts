import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RateLimit } from '../common/decorators/rate-limit.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../users/schemas/user.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { TasksService } from './tasks.service';

@Controller('clients/:clientId/tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Param('clientId', ParseObjectIdPipe) clientId: Types.ObjectId,
    @Query() query: ListTasksQueryDto,
  ) {
    return this.tasksService.list(user, clientId.toString(), query);
  }

  @Post()
  @RateLimit({ limit: 60, windowMs: 60 * 60 * 1000 })
  @UseGuards(CsrfGuard, JwtAuthGuard, RolesGuard)
  create(
    @CurrentUser() user: JwtPayload,
    @Param('clientId', ParseObjectIdPipe) clientId: Types.ObjectId,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(user, clientId.toString(), dto);
  }

  @Patch(':taskId')
  @RateLimit({ limit: 60, windowMs: 60 * 60 * 1000 })
  @UseGuards(CsrfGuard, JwtAuthGuard, RolesGuard)
  update(
    @CurrentUser() user: JwtPayload,
    @Param('clientId', ParseObjectIdPipe) clientId: Types.ObjectId,
    @Param('taskId', ParseObjectIdPipe) taskId: Types.ObjectId,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(user, clientId.toString(), taskId.toString(), dto);
  }

  @Post(':taskId/status')
  @RateLimit({ limit: 80, windowMs: 60 * 60 * 1000 })
  @UseGuards(CsrfGuard, JwtAuthGuard, RolesGuard)
  changeStatus(
    @CurrentUser() user: JwtPayload,
    @Param('clientId', ParseObjectIdPipe) clientId: Types.ObjectId,
    @Param('taskId', ParseObjectIdPipe) taskId: Types.ObjectId,
    @Body() dto: UpdateTaskStatusDto,
  ) {
    return this.tasksService.changeStatus(user, clientId.toString(), taskId.toString(), dto.status);
  }
}
