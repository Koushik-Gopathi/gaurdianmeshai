import { Module } from '@nitrostack/core';
import { DatabaseService } from './database.service.js';

/**
 * DatabaseModule
 *
 * Provides `DatabaseService` — the shared data-access layer over the
 * `security_events` table (Postgres, with an in-memory mock fallback).
 * Exported so `ScreenModule` and `AuditModule` can inject it.
 */
@Module({
  name: 'database',
  description: 'Data access layer for GuardianMesh security events (Postgres + mock fallback).',
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
