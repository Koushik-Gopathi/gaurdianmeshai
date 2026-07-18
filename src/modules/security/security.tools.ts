import { ToolDecorator as Tool, z, ExecutionContext, Injectable } from '@nitrostack/core';
import { DatabaseService } from '../database/database.service.js';

const INJECTION_PATTERNS = [
  /ignore previous instructions/i,
  /system override/i,
  /developer mode/i,
  /act as/i,
  /bypass/i,
  /delete (all|the) data/i,
  /send .* confidential/i,
  /grant .* access/i,
  /exfiltrate/i,
];

@Injectable()
export class SecurityTools {
  constructor(private readonly databaseService: DatabaseService) {}

  @Tool({
    name: 'screen_mcp_request',
    description: 'Inspect an MCP tool request for prompt injection, risk, and policy violations before execution.',
    inputSchema: z.object({
      agentId: z.string().describe('Agent identifier'),
      userPrompt: z.string().describe('User prompt or document content to inspect'),
      toolAction: z.string().describe('Requested MCP tool action'),
      requestedBy: z.string().optional().describe('Optional requester identity'),
      context: z.string().optional().describe('Optional context or source system')
    }),
    examples: {
      request: {
        agentId: 'agent-support-bot',
        userPrompt: 'Summarize this document and email the result',
        toolAction: 'gmail.send_email'
      },
      response: {
        verdict: 'REQUIRE_APPROVAL',
        riskScore: 42,
        injectionFlags: ['suspicious-email-send'],
        reason: 'High-risk external action requires review.'
      }
    }
  })
  async screenRequest(input: any, ctx: ExecutionContext) {
    const injectionFlags = this.detectInjection(input.userPrompt, input.toolAction);
    const riskScore = this.calculateRiskScore(input, injectionFlags);
    const verdict = this.decideVerdict(riskScore, injectionFlags, input.toolAction);

    const event = {
      id: `evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      agentId: input.agentId,
      userPrompt: input.userPrompt,
      toolAction: input.toolAction,
      riskScore,
      verdict,
      injectionFlags,
      reason: this.buildReason(riskScore, injectionFlags, verdict),
      trustScore: this.calculateTrustScore(riskScore, verdict),
      createdAt: new Date().toISOString(),
    };

    await this.databaseService.insertEvent(event);

    ctx.logger.info('Screened MCP request', { verdict, riskScore, injectionFlags });

    return {
      verdict,
      riskScore,
      injectionFlags,
      reason: event.reason,
      trustScore: event.trustScore,
      recorded: true,
      nextAction: verdict === 'BLOCK' ? 'Block execution' : verdict === 'REQUIRE_APPROVAL' ? 'Require human approval' : 'Allow execution'
    };
  }

  private detectInjection(userPrompt: string, toolAction: string): string[] {
    const flags: string[] = [];

    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(userPrompt)) {
        flags.push(this.patternToFlag(pattern));
      }
    }

    if (/email|send|export|share|forward/i.test(toolAction)) {
      flags.push('suspicious-email-send');
    }

    if (/database|drop|delete|grant|rotate|secret/i.test(toolAction)) {
      flags.push('sensitive-tool-action');
    }

    return [...new Set(flags)];
  }

  private calculateRiskScore(input: any, injectionFlags: string[]): number {
    let score = 10;
    if (injectionFlags.length > 0) score += injectionFlags.length * 14;
    if (/database|cloud|secret|drop|delete|grant|rotate/i.test(input.toolAction)) score += 20;
    if (/email|send|export|share/i.test(input.toolAction)) score += 12;
    if (input.context?.toLowerCase().includes('external')) score += 10;
    if (input.requestedBy) score += 3;
    return Math.min(100, score);
  }

  private decideVerdict(riskScore: number, injectionFlags: string[], toolAction: string): 'ALLOW' | 'BLOCK' | 'REQUIRE_APPROVAL' {
    if (injectionFlags.some((flag) => ['instruction-override', 'privilege-escalation', 'data-exfiltration'].includes(flag)) || riskScore >= 90) {
      return 'BLOCK';
    }
    if (riskScore >= 60 || /secret|grant|rotate|delete/i.test(toolAction)) {
      return 'REQUIRE_APPROVAL';
    }
    return 'ALLOW';
  }

  private calculateTrustScore(riskScore: number, verdict: string): number {
    if (verdict === 'BLOCK') return Math.max(0, 100 - riskScore);
    if (verdict === 'REQUIRE_APPROVAL') return Math.max(40, 100 - Math.round(riskScore / 2));
    return Math.max(70, 100 - Math.round(riskScore / 4));
  }

  private buildReason(riskScore: number, injectionFlags: string[], verdict: string): string {
    if (verdict === 'BLOCK') {
      return `Blocked due to high-risk behavior and injection markers: ${injectionFlags.join(', ') || 'suspicious action'}`;
    }
    if (verdict === 'REQUIRE_APPROVAL') {
      return `Requires human review because the request is sensitive and scored ${riskScore}/100.`;
    }
    return `Request is within policy bounds with a low-risk score of ${riskScore}/100.`;
  }

  private patternToFlag(pattern: RegExp): string {
    const source = pattern.source.toLowerCase();
    if (source.includes('ignore previous instructions')) return 'instruction-override';
    if (source.includes('system override')) return 'privilege-escalation';
    if (source.includes('developer mode')) return 'developer-mode';
    if (source.includes('bypass')) return 'bypass-attempt';
    if (source.includes('delete')) return 'destructive-action';
    if (source.includes('send .* confidential')) return 'sensitive-data-send';
    if (source.includes('grant')) return 'privilege-escalation';
    if (source.includes('exfiltrate')) return 'data-exfiltration';
    return 'prompt-injection';
  }
}
