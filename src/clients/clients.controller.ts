import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
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
import { ClientsService } from './clients.service';
import { AddClientMemberDto } from './dto/add-client-member.dto';
import { CreateClientDto } from './dto/create-client.dto';

@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.clientsService.listWorkspaces(user.sub, user.role);
  }

  @Post()
  @RateLimit({ limit: 20, windowMs: 60 * 60 * 1000 })
  @UseGuards(CsrfGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateClientDto) {
    return this.clientsService.create(dto);
  }

  @Post(':clientId/members')
  @RateLimit({ limit: 40, windowMs: 60 * 60 * 1000 })
  @UseGuards(CsrfGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  addMember(
    @Param('clientId', ParseObjectIdPipe) clientId: Types.ObjectId,
    @Body() dto: AddClientMemberDto,
  ) {
    return this.clientsService.addMember(clientId.toString(), dto);
  }
}
