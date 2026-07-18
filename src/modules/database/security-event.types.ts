export type Verdict = 'ALLOW' | 'BLOCK' | 'REQUIRE_APPROVAL';

/**
 * A single screened MCP tool-call event, as persisted to `security_events`
 * (Postgres) or the in-memory mock fallback.
 */
export interface SecurityEvent {
  id: string;
  agentId: string;
  userPrompt: string;
  toolAction: string;
  riskScore: number;
  verdict: Verdict;
  injectionFlags: string[];
  reason: string;
  imageUrl?: string;
  trustScore: number;
  /** ISO 8601 timestamp */
  createdAt: string;
}
