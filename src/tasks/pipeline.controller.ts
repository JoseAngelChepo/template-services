import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/schemas/user.schema';
import { TasksService } from './tasks.service';

@Controller('pipeline')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER)
export class PipelineController {
  constructor(private readonly tasksService: TasksService) {}

  /** Global status catalog — same predefined set for every client. */
  @Get('catalog')
  catalog() {
    return this.tasksService.catalog();
  }
}
