import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { IntegrationsService } from '../integrations/integrations.service';

export type HealthCheckResult = {
  status: 'ok' | 'degraded';
  app: string;
  timestamp: string;
  database: { status: 'up' | 'down' };
  integrations: ReturnType<IntegrationsService['listStatus']>;
};

@Injectable()
export class HealthService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly integrations: IntegrationsService,
  ) {}

  async check(): Promise<HealthCheckResult> {
    const databaseStatus = await this.checkDatabase();

    return {
      status: databaseStatus === 'up' ? 'ok' : 'degraded',
      app: 'template-services',
      timestamp: new Date().toISOString(),
      database: { status: databaseStatus },
      integrations: this.integrations.listStatus(),
    };
  }

  private async checkDatabase(): Promise<'up' | 'down'> {
    if (this.connection.readyState !== 1) {
      return 'down';
    }

    try {
      await this.connection.db?.admin().ping();
      return 'up';
    } catch {
      return 'down';
    }
  }
}
