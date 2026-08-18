import { IsEnum, IsOptional } from 'class-validator';
import { TaskStatus } from '../task-status';

export class ListTasksQueryDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}
