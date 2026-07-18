import { Module } from '@nitrostack/core';
import { DatabaseModule } from '../database/database.module.js';
import { SecurityTools } from './security.tools.js';
import { SecurityResources } from './security.resources.js';
import { SecurityPrompts } from './security.prompts.js';

@Module({
  name: 'guardianmesh-security',
  description: 'GuardianMesh security layer for screening MCP tool requests with risk scoring, prompt injection detection, and audit logging.',
  imports: [DatabaseModule],
  controllers: [SecurityTools, SecurityResources, SecurityPrompts],
})
export class SecurityModule {}
