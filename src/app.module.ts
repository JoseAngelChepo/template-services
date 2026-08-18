import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { ContactModule } from './contact/contact.module';
import { ClientsModule } from './clients/clients.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    CommonModule,
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
    UsersModule,
    HealthModule,
    AuthModule,
    ContactModule,
    ClientsModule,
    TasksModule,
  ],
})
export class AppModule {}
