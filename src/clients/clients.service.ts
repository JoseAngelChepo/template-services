import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserRole } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { AddClientMemberDto } from './dto/add-client-member.dto';
import { CreateClientDto } from './dto/create-client.dto';
import {
  ClientMember,
  ClientMemberDocument,
  ClientMemberRole,
} from './schemas/client-member.schema';
import { Client, ClientDocument, ClientStatus } from './schemas/client.schema';

export type ClientWorkspaceView = {
  id: string;
  name: string;
  slug: string;
  status: ClientStatus;
  role: ClientMemberRole | 'admin';
};

@Injectable()
export class ClientsService {
  constructor(
    @InjectModel(Client.name) private readonly clientModel: Model<ClientDocument>,
    @InjectModel(ClientMember.name)
    private readonly memberModel: Model<ClientMemberDocument>,
    private readonly usersService: UsersService,
  ) {}

  async listWorkspaces(userId: string, role: UserRole): Promise<ClientWorkspaceView[]> {
    if (role === UserRole.ADMIN) {
      const clients = await this.clientModel.find().sort({ name: 1 }).exec();
      if (clients.length > 0) {
        return clients.map((client) => this.toWorkspaceView(client, 'admin'));
      }
    }

    const memberships = await this.memberModel.find({ userId: new Types.ObjectId(userId) }).exec();
    if (memberships.length === 0) {
      const created = await this.ensureDefaultWorkspace(userId);
      return [created];
    }

    const clientIds = memberships.map((member) => member.clientId);
    const clients = await this.clientModel.find({ _id: { $in: clientIds } }).exec();
    const byId = new Map(clients.map((client) => [client.id, client]));

    return memberships.flatMap((member) => {
      const client = byId.get(member.clientId.toString());
      if (!client) return [];
      return [this.toWorkspaceView(client, member.role)];
    });
  }

  async create(dto: CreateClientDto): Promise<ClientWorkspaceView> {
    const name = dto.name.trim();
    const slug = await this.allocateSlug(dto.slug?.trim() || this.slugify(name));
    const client = await this.clientModel.create({
      name,
      slug,
      status: ClientStatus.ACTIVE,
    });
    return this.toWorkspaceView(client, 'admin');
  }

  async addMember(clientId: string, dto: AddClientMemberDto): Promise<{ ok: true }> {
    await this.requireClient(clientId);
    await this.usersService.findOne(dto.userId);

    try {
      await this.memberModel.create({
        clientId: new Types.ObjectId(clientId),
        userId: new Types.ObjectId(dto.userId),
        role: dto.role,
      });
    } catch (error) {
      if (this.isDuplicateKey(error)) {
        throw new ConflictException('User is already a member of this client');
      }
      throw error;
    }

    return { ok: true };
  }

  async requireActiveClient(clientId: string): Promise<ClientDocument> {
    const client = await this.requireClient(clientId);
    if (client.status !== ClientStatus.ACTIVE) {
      throw new BadRequestException('Client workspace is archived');
    }
    return client;
  }

  async assertAccess(
    userId: string,
    role: UserRole,
    clientId: string,
  ): Promise<{ client: ClientDocument; actor: 'client' | 'operator' }> {
    const client = await this.requireActiveClient(clientId);
    if (role === UserRole.ADMIN) {
      return { client, actor: 'operator' };
    }

    const member = await this.memberModel
      .findOne({
        clientId: new Types.ObjectId(clientId),
        userId: new Types.ObjectId(userId),
      })
      .exec();
    if (!member) {
      throw new ForbiddenException('You do not belong to this client');
    }
    return { client, actor: 'client' };
  }

  private async ensureDefaultWorkspace(userId: string): Promise<ClientWorkspaceView> {
    const user = await this.usersService.findOne(userId);
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email;
    const client = await this.clientModel.create({
      name,
      slug: await this.allocateSlug(this.slugify(name)),
      status: ClientStatus.ACTIVE,
    });
    await this.memberModel.create({
      clientId: client._id,
      userId: new Types.ObjectId(userId),
      role: ClientMemberRole.OWNER,
    });
    return this.toWorkspaceView(client, ClientMemberRole.OWNER);
  }

  private async requireClient(clientId: string): Promise<ClientDocument> {
    const client = await this.clientModel.findById(clientId).exec();
    if (!client) {
      throw new NotFoundException('Client not found');
    }
    return client;
  }

  private async allocateSlug(base: string): Promise<string> {
    const root = this.slugify(base);
    for (let attempt = 0; attempt < 20; attempt++) {
      const slug = attempt === 0 ? root : `${root}-${attempt + 1}`;
      const taken = await this.clientModel.exists({ slug });
      if (!taken) return slug;
    }
    return `${root}-${Date.now().toString(36)}`;
  }

  private slugify(value: string): string {
    const slug = value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
    return slug || 'client';
  }

  private toWorkspaceView(
    client: ClientDocument,
    role: ClientMemberRole | 'admin',
  ): ClientWorkspaceView {
    return {
      id: client.id,
      name: client.name,
      slug: client.slug,
      status: client.status,
      role,
    };
  }

  private isDuplicateKey(error: unknown): boolean {
    return Boolean(
      error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code?: number }).code === 11000,
    );
  }
}
