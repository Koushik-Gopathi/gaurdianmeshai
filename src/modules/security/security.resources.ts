import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { DatabaseService } from '../database/database.service.js';
import { Injectable } from '@nitrostack/core';

@Injectable()
export class SecurityResources {
  constructor(private readonly databaseService: DatabaseService) {}

  @Resource({
    uri: 'guardianmesh://events',
    name: 'GuardianMesh Security Events',
    description: 'Recent security decisions and audit events for GuardianMesh',
    mimeType: 'application/json',
  })
  async getEvents(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching security events');
    const events = await this.databaseService.listEvents({ limit: 10 });

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({ events }, null, 2),
      }],
    };
  }
}
