import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class SecurityPrompts {
  @Prompt({
    name: 'guardianmesh_help',
    description: 'Explain GuardianMesh security screening and how to use the security tool.',
  })
  async helpPrompt(args: Record<string, unknown>, ctx: ExecutionContext) {
    ctx.logger.info('Returning GuardianMesh help prompt');
    return [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: 'Explain how GuardianMesh AI screens tool requests for prompt injection, risk, and approval needs.',
        },
      },
      {
        role: 'assistant' as const,
        content: {
          type: 'text' as const,
          text: 'GuardianMesh evaluates each MCP tool request with a Zero-Trust policy. It scores the request for suspicious prompts, checks for injection patterns, and returns ALLOW, BLOCK, or REQUIRE_APPROVAL. It also stores the outcome in the audit log for review.',
        },
      },
    ];
  }
}
