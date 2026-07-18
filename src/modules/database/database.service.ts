import { Injectable, ConfigService } from '@nitrostack/core';
import { Pool } from 'pg';
import type { SecurityEvent } from './security-event.types.js';
import { MOCK_SECURITY_EVENTS } from './mock-security-events.js';

/**
 * DatabaseService
 *
 * Thin data-access layer over the `security_events` table.
 *
 * If `DATABASE_URL` is configured and reachable, all reads/writes go through
 * a real Postgres pool. If the connection cannot be established (e.g. no
 * Postgres running locally during a demo), the service transparently falls
 * back to an in-memory mock dataset seeded from fixtures so the rest of the
 * app keeps working end-to-end.
 */
@Injectable({ deps: [ConfigService] })
export class DatabaseService {
  private pool: Pool | null = null;
  private usingMock = false;
  private mockEvents: SecurityEvent[] = MOCK_SECURITY_EVENTS.map((e) => ({ ...e }));
  private initPromise: Promise<void> | null = null;

  constructor(private config: ConfigService) {}

  private async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const connectionString = this.config.get<string>('DATABASE_URL');

      if (!connectionString) {
        this.usingMock = true;
        return;
      }

      try {
        const pool = new Pool({
          connectionString,
          max: 5,
          connectionTimeoutMillis: 3000,
        });

        await pool.query('SELECT 1');

        await pool.query(`
          CREATE TABLE IF NOT EXISTS security_events (
            id TEXT PRIMARY KEY,
            agent_id TEXT NOT NULL,
            user_prompt TEXT NOT NULL,
            tool_action TEXT NOT NULL,
            risk_score INTEGER NOT NULL,
            verdict TEXT NOT NULL,
            injection_flags JSONB NOT NULL DEFAULT '[]',
            reason TEXT NOT NULL,
            image_url TEXT,
            trust_score INTEGER NOT NULL DEFAULT 100,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
          )
        `);

        const { rows } = await pool.query<{ count: string }>('SELECT COUNT(*)::text as count FROM security_events');
        const existingCount = parseInt(rows[0]?.count ?? '0', 10);

        if (existingCount === 0) {
          for (const event of MOCK_SECURITY_EVENTS) {
            await pool.query(
              `INSERT INTO security_events
                (id, agent_id, user_prompt, tool_action, risk_score, verdict, injection_flags, reason, image_url, trust_score, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
               ON CONFLICT (id) DO NOTHING`,
              [
                event.id,
                event.agentId,
                event.userPrompt,
                event.toolAction,
                event.riskScore,
                event.verdict,
                JSON.stringify(event.injectionFlags),
                event.reason,
                event.imageUrl ?? null,
                event.trustScore,
                event.createdAt,
              ]
            );
          }
        }

        this.pool = pool;
        this.usingMock = false;
      } catch {
        // Postgres unreachable / misconfigured — fall back to mock data so
        // the rest of the app keeps functioning during demos.
        this.pool = null;
        this.usingMock = true;
      }
    })();

    return this.initPromise;
  }

  async listEvents(filters: {
    verdict?: 'ALLOW' | 'BLOCK' | 'REQUIRE_APPROVAL';
    agentId?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
  }): Promise<SecurityEvent[]> {
    await this.init();
    const limit = filters.limit ?? 20;

    if (this.usingMock || !this.pool) {
      let results = [...this.mockEvents];
      if (filters.verdict) results = results.filter((e) => e.verdict === filters.verdict);
      if (filters.agentId) results = results.filter((e) => e.agentId === filters.agentId);
      if (filters.fromDate) results = results.filter((e) => e.createdAt >= filters.fromDate!);
      if (filters.toDate) results = results.filter((e) => e.createdAt <= filters.toDate!);
      results.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      return results.slice(0, limit);
    }

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (filters.verdict) {
      conditions.push(`verdict = $${idx++}`);
      params.push(filters.verdict);
    }
    if (filters.agentId) {
      conditions.push(`agent_id = $${idx++}`);
      params.push(filters.agentId);
    }
    if (filters.fromDate) {
      conditions.push(`created_at >= $${idx++}`);
      params.push(filters.fromDate);
    }
    if (filters.toDate) {
      conditions.push(`created_at <= $${idx++}`);
      params.push(filters.toDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit);

    const { rows } = await this.pool.query(
      `SELECT * FROM security_events ${whereClause} ORDER BY created_at DESC LIMIT $${idx}`,
      params
    );

    return rows.map(rowToSecurityEvent);
  }

  async getEvent(id: string): Promise<SecurityEvent | null> {
    await this.init();

    if (this.usingMock || !this.pool) {
      return this.mockEvents.find((e) => e.id === id) ?? null;
    }

    const { rows } = await this.pool.query('SELECT * FROM security_events WHERE id = $1', [id]);
    if (rows.length === 0) return null;
    return rowToSecurityEvent(rows[0]);
  }

  async insertEvent(event: SecurityEvent): Promise<SecurityEvent> {
    await this.init();

    if (this.usingMock || !this.pool) {
      this.mockEvents.unshift(event);
      return event;
    }

    await this.pool.query(
      `INSERT INTO security_events
        (id, agent_id, user_prompt, tool_action, risk_score, verdict, injection_flags, reason, image_url, trust_score, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        event.id,
        event.agentId,
        event.userPrompt,
        event.toolAction,
        event.riskScore,
        event.verdict,
        JSON.stringify(event.injectionFlags),
        event.reason,
        event.imageUrl ?? null,
        event.trustScore,
        event.createdAt,
      ]
    );

    return event;
  }

  async updateVerdict(id: string, verdict: 'ALLOW' | 'BLOCK' | 'REQUIRE_APPROVAL', reason: string): Promise<SecurityEvent | null> {
    await this.init();

    if (this.usingMock || !this.pool) {
      const event = this.mockEvents.find((e) => e.id === id);
      if (!event) return null;
      event.verdict = verdict;
      event.reason = reason;
      return event;
    }

    const { rows } = await this.pool.query(
      'UPDATE security_events SET verdict = $1, reason = $2 WHERE id = $3 RETURNING *',
      [verdict, reason, id]
    );
    if (rows.length === 0) return null;
    return rowToSecurityEvent(rows[0]);
  }

  async getAgentTrustScore(agentId: string): Promise<number> {
    const events = await this.listEvents({ agentId, limit: 200 });
    if (events.length === 0) return 100;
    const blocked = events.filter((e) => e.verdict === 'BLOCK').length;
    const total = events.length;
    const score = Math.round(100 - (blocked / total) * 100);
    return Math.max(0, Math.min(100, score));
  }
}

function rowToSecurityEvent(row: any): SecurityEvent {
  return {
    id: row.id,
    agentId: row.agent_id,
    userPrompt: row.user_prompt,
    toolAction: row.tool_action,
    riskScore: row.risk_score,
    verdict: row.verdict,
    injectionFlags: typeof row.injection_flags === 'string' ? JSON.parse(row.injection_flags) : (row.injection_flags ?? []),
    reason: row.reason,
    imageUrl: row.image_url ?? undefined,
    trustScore: row.trust_score,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}
