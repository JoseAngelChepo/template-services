import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { ClientMember, ClientMemberSchema } from './schemas/client-member.schema';
import { Client, ClientSchema } from './schemas/client.schema';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: Client.name, schema: ClientSchema },
      { name: ClientMember.name, schema: ClientMemberSchema },
    ]),
  ],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
