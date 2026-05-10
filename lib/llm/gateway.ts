/**
 * LLM Gateway - Multi-Provider with Streaming
 * 
 * Abstraction pour utiliser différents LLM (Claude, GPT, etc.)
 * avec support natif du streaming pour l'UI Windsurf style.
 */

import { globalEventBus } from '../orchestrator/eventBus';

export type LLMProvider = 'anthropic' | 'openai';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
}

export interface StreamCallbacks {
  onThinking?: (line: string) => void;
  onChunk?: (chunk: string) => void;
  onComplete?: (result: LLMResult) => void;
  onError?: (error: Error) => void;
}

export interface LLMResult {
  success: boolean;
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
}

// Configuration par agent type
const AGENT_CONFIGS: Record<string, LLMConfig> = {
  'Web Research': {
    provider: 'anthropic',
    model: 'claude-3-haiku-20240307',
    temperature: 0.1,
    maxTokens: 2000,
  },
  'Product Manager': {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.2,
    maxTokens: 4096,
    systemPrompt: `You are an expert Product Manager. Analyze requirements and create detailed product specifications. Output structured JSON with: projectName, refinedPrompt, complexity, pages[], dataModel[], authStrategy, targetLocales[], needsI18n.`,
  },
  'DBA Architect': {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.1,
    maxTokens: 4096,
    systemPrompt: `You are a Database Architect. Design PostgreSQL/Supabase schemas with proper RLS policies. Output: needsDatabase, tables[], relationships[], indexes[], supabaseClientCode.`,
  },
  'UX Designer': {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.3,
    maxTokens: 4096,
    systemPrompt: `You are a UX Designer. Create design systems with colorTokens, typography, borderRadius, components[], layouts[]. Focus on accessibility and consistency.`,
  },
  'Coder Agent': {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.1,
    maxTokens: 8192,
    systemPrompt: `You are an expert React/TypeScript developer. Write clean, typed code with proper error handling. Use Tailwind CSS for styling. Output files in format: \`\`\`file:path\ncontent\`\`\``.`,
  },
  'Security Auditor': {
    provider: 'anthropic',
    model: 'claude-3-haiku-20240307',
    temperature: 0.0,
    maxTokens: 2048,
    systemPrompt: `You are a Security Auditor. Scan code for vulnerabilities. Output JSON with: score, approved, criticalIssues[], fixes[].`,
  },
  'QA Reviewer': {
    provider: 'anthropic',
    model: 'claude-3-haiku-20240307',
    temperature: 0.1,
    maxTokens: 2048,
    systemPrompt: `You are a QA Engineer. Review code for bugs, performance, best practices. Output JSON with: score, approved, issues[], fixes[].`,
  },
  'i18n Agent': {
    provider: 'anthropic',
    model: 'claude-3-haiku-20240307',
    temperature: 0.1,
    maxTokens: 4096,
    systemPrompt: `You are an i18n specialist. Add internationalization support. Output: modifiedFiles, localeFiles, setupCode.`,
  },
};

export class LLMGateway {
  private apiKeys: Map<LLMProvider, string> = new Map();
  private retryAttempts = 3;
  private retryDelay = 1000;

  constructor() {
    // Load API keys from environment
    if (process.env.ANTHROPIC_API_KEY) {
      this.apiKeys.set('anthropic', process.env.ANTHROPIC_API_KEY);
    }
    if (process.env.OPENAI_API_KEY) {
      this.apiKeys.set('openai', process.env.OPENAI_API_KEY);
    }
  }

  /**
   * Get config for an agent type
   */
  getConfig(agentName: string): LLMConfig {
    return AGENT_CONFIGS[agentName] || AGENT_CONFIGS['Coder Agent'];
  }

  /**
   * Stream generate with Windsurf-style events
   */
  async streamGenerate(
    agentName: string,
    prompt: string,
    callbacks: StreamCallbacks,
    existingContext?: string
  ): Promise<LLMResult> {
    const config = this.getConfig(agentName);
    const fullPrompt = existingContext 
      ? `${existingContext}\n\n${prompt}` 
      : prompt;

    let lastError: Error | null = null;

    // Retry loop
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const result = await this.executeStream(config, fullPrompt, callbacks, agentName);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        console.warn(`[LLMGateway] Attempt ${attempt} failed for ${agentName}:`, lastError.message);
        
        if (attempt < this.retryAttempts) {
          // Exponential backoff
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          callbacks.onThinking?.(`⚠️ Retry attempt ${attempt}/${this.retryAttempts} after ${delay}ms...`);
          await this.delay(delay);
        }
      }
    }

    // All retries failed
    const errorResult: LLMResult = {
      success: false,
      content: '',
      error: lastError?.message || 'All retry attempts failed',
    };

    callbacks.onError?.(lastError!);
    return errorResult;
  }

  /**
   * Execute streaming request based on provider
   */
  private async executeStream(
    config: LLMConfig,
    prompt: string,
    callbacks: StreamCallbacks,
    agentName: string
  ): Promise<LLMResult> {
    switch (config.provider) {
      case 'anthropic':
        return this.streamAnthropic(config, prompt, callbacks, agentName);
      case 'openai':
        return this.streamOpenAI(config, prompt, callbacks, agentName);
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }

  /**
   * Stream with Anthropic Claude
   */
  private async streamAnthropic(
    config: LLMConfig,
    prompt: string,
    callbacks: StreamCallbacks,
    agentName: string
  ): Promise<LLMResult> {
    const apiKey = this.apiKeys.get('anthropic');
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        system: config.systemPrompt,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${error}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let thinkingBuffer = '';
    let isInThinkingBlock = false;

    // Emit initial thinking line
    callbacks.onThinking?.(`🤖 ${agentName} starting...`);

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === 'content_block_delta') {
                const text = parsed.delta?.text || '';
                fullContent += text;

                // Check for thinking blocks
                if (text.includes('<thinking>')) {
                  isInThinkingBlock = true;
                  thinkingBuffer = '';
                }

                if (isInThinkingBlock) {
                  thinkingBuffer += text;
                  
                  // Extract complete thinking lines
                  const lines = text.split('\n').filter(l => l.trim());
                  for (const line of lines) {
                    if (!line.includes('<thinking>') && !line.includes('</thinking>')) {
                      callbacks.onThinking?.(line);
                      // Also emit to global event bus for UI
                      globalEventBus.emitAgentProgress(agentName, line);
                    }
                  }

                  if (text.includes('</thinking>')) {
                    isInThinkingBlock = false;
                  }
                } else {
                  // Regular content streaming (word-by-word effect)
                  callbacks.onChunk?.(text);
                  globalEventBus.emitReplyChunk(text, agentName);
                }
              }
            } catch {
              // Ignore malformed JSON
            }
          }
        }
      }

      // Parse usage if available
      const usage = {
        promptTokens: this.estimateTokens(prompt),
        completionTokens: this.estimateTokens(fullContent),
        totalTokens: this.estimateTokens(prompt) + this.estimateTokens(fullContent),
      };

      const result: LLMResult = {
        success: true,
        content: fullContent,
        usage,
      };

      callbacks.onComplete?.(result);
      return result;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Stream with OpenAI GPT
   */
  private async streamOpenAI(
    config: LLMConfig,
    prompt: string,
    callbacks: StreamCallbacks,
    agentName: string
  ): Promise<LLMResult> {
    const apiKey = this.apiKeys.get('openai');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          ...(config.systemPrompt ? [{ role: 'system', content: config.systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${error}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    callbacks.onThinking?.(`🤖 ${agentName} starting...`);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const chunk = parsed.choices?.[0]?.delta?.content || '';
            
            if (chunk) {
              fullContent += chunk;
              callbacks.onChunk?.(chunk);
              globalEventBus.emitReplyChunk(chunk, agentName);
            }
          } catch {
            // Ignore malformed JSON
          }
        }
      }
    }

    const result: LLMResult = {
      success: true,
      content: fullContent,
    };

    callbacks.onComplete?.(result);
    return result;
  }

  /**
   * Non-streaming generate (for simple queries)
   */
  async generate(agentName: string, prompt: string): Promise<LLMResult> {
    return this.streamGenerate(agentName, prompt, {});
  }

  /**
   * Check if provider is available
   */
  isAvailable(provider: LLMProvider): boolean {
    return this.apiKeys.has(provider);
  }

  /**
   * Fallback to available provider
   */
  async generateWithFallback(
    agentName: string,
    prompt: string,
    callbacks: StreamCallbacks
  ): Promise<LLMResult> {
    // Try primary provider (anthropic)
    if (this.isAvailable('anthropic')) {
      return this.streamGenerate(agentName, prompt, callbacks);
    }

    // Fallback to openai
    if (this.isAvailable('openai')) {
      // Temporarily override config to use openai
      const originalConfig = { ...AGENT_CONFIGS[agentName] };
      AGENT_CONFIGS[agentName] = {
        ...originalConfig,
        provider: 'openai',
        model: 'gpt-4o',
      };

      const result = await this.streamGenerate(agentName, prompt, callbacks);

      // Restore original config
      AGENT_CONFIGS[agentName] = originalConfig;
      return result;
    }

    throw new Error('No LLM provider available. Configure ANTHROPIC_API_KEY or OPENAI_API_KEY.');
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: ~4 chars per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Parse files from content (used by agents)
   */
  parseFiles(content: string): Array<{ path: string; content: string }> {
    const files: Array<{ path: string; content: string }> = [];
    const fileRegex = /```file:([^\n]+)\n([\s\S]*?)```/g;
    let match;

    while ((match = fileRegex.exec(content)) !== null) {
      files.push({
        path: match[1].trim(),
        content: match[2].trim(),
      });
    }

    return files;
  }

  /**
   * Extract JSON from content
   */
  parseJSON(content: string): any {
    try {
      // Try direct parse
      return JSON.parse(content);
    } catch {
      // Try extracting from markdown code block
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      
      // Try extracting from generic code block
      const genericMatch = content.match(/```\n?([\s\S]*?)\n?```/);
      if (genericMatch) {
        return JSON.parse(genericMatch[1]);
      }

      throw new Error('No valid JSON found in content');
    }
  }
}

// Export singleton
export const llmGateway = new LLMGateway();

export default LLMGateway;
