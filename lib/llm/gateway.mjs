/**
 * LLM Gateway - Multi-Provider with Streaming
 * 
 * Abstraction pour utiliser différents LLM (Claude, GPT, etc.)
 * avec support natif du streaming pour l'UI Windsurf style.
 */

import { globalEventBus } from '../orchestrator/eventBus.mjs';

/**
 * @typedef {'anthropic' | 'openai' | 'openrouter'} LLMProvider
 */

/**
 * @typedef {Object} LLMConfig
 * @property {LLMProvider} provider
 * @property {string} model
 * @property {number} temperature
 * @property {number} maxTokens
 * @property {string} [systemPrompt]
 */

/**
 * @typedef {Object} StreamCallbacks
 * @property {(line: string) => void} [onThinking]
 * @property {(chunk: string) => void} [onChunk]
 * @property {(result: LLMResult) => void} [onComplete]
 * @property {(error: Error) => void} [onError]
 */

/**
 * @typedef {Object} LLMResult
 * @property {boolean} success
 * @property {string} content
 * @property {Object} [usage]
 * @property {number} usage.promptTokens
 * @property {number} usage.completionTokens
 * @property {number} usage.totalTokens
 * @property {string} [error]
 */

// Default provider priority: openrouter if key available, else anthropic, else openai
const DEFAULT_PROVIDER = process.env.OPENROUTER_API_KEY
  ? 'openrouter'
  : process.env.ANTHROPIC_API_KEY
    ? 'anthropic'
    : 'openai';

const normalizeOpenRouterModel = (value, fallback) => {
  const invalidLegacyModels = new Set([
    'anthropic/claude-3.5-sonnet',
    'anthropic/claude-3-haiku',
  ]);

  if (!value || invalidLegacyModels.has(value)) {
    return fallback;
  }

  return value;
};

// OpenRouter model mapping (compatible with Anthropic agent names)
// All defaults are Anthropic Claude family for consistency and reliability
const OPENROUTER_MODELS = {
  fast:      normalizeOpenRouterModel(process.env.OPENROUTER_MODEL_FAST,      'anthropic/claude-haiku-4.5'),
  smart:     normalizeOpenRouterModel(process.env.OPENROUTER_MODEL_SMART,     'anthropic/claude-opus-4.7'),
  coder:     normalizeOpenRouterModel(process.env.OPENROUTER_MODEL_CODER,     'anthropic/claude-sonnet-4.6'),
  reasoning: normalizeOpenRouterModel(process.env.OPENROUTER_MODEL_REASONING, 'anthropic/claude-opus-4.7'),
};

// ─── Heartbeat factory ─────────────────────────────────────────────────────
// Emits a "still alive" thinking line if no chunk arrives within `intervalMs`.
// Resets on every chunk. Caller MUST call .stop() when done to clear the timer.
function createHeartbeat(callbacks, agentName, intervalMs = 12_000) {
  let lastBeat = Date.now();
  let timer = null;
  let beatCount = 0;
  const tick = () => {
    const elapsed = ((Date.now() - lastBeat) / 1000).toFixed(0);
    beatCount += 1;
    try {
      callbacks.onThinking?.(`⏳ ${agentName} en cours… ${elapsed}s écoulées (heartbeat #${beatCount})`);
    } catch { /* never break the stream */ }
  };
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { tick(); schedule(); }, intervalMs);
  };
  schedule();
  return {
    reset() { lastBeat = Date.now(); schedule(); },
    stop()  { if (timer) { clearTimeout(timer); timer = null; } },
  };
}

// Detect models that support native Extended Thinking (Anthropic Claude Sonnet 4.x / Opus 4.x)
function supportsExtendedThinking(model = '') {
  const m = String(model).toLowerCase();
  // Anthropic direct
  if (/claude-(sonnet|opus)-4/.test(m)) return true;
  // OpenRouter format
  if (/anthropic\/claude-(sonnet|opus)-4/.test(m)) return true;
  return false;
}

// Compute thinking budget based on agent type (more tokens for reasoning-heavy agents)
function getThinkingBudget(agentName, maxTokens) {
  const reasoningAgents = new Set(['Product Manager', 'DBA Architect', 'UX Designer', 'Coder Agent', 'Capability Planner']);
  if (!reasoningAgents.has(agentName)) return 0;
  // Budget = ~50% of max tokens, capped at 10k, min 2k
  return Math.max(2000, Math.min(10000, Math.floor(maxTokens * 0.5)));
}

// Configuration par agent type
const AGENT_CONFIGS = {
  'Web Research': {
    provider: DEFAULT_PROVIDER,
    model: DEFAULT_PROVIDER === 'openrouter' ? OPENROUTER_MODELS.fast : 'claude-3-haiku-20240307',
    temperature: 0.1,
    maxTokens: 2000,
  },
  'Product Manager': {
    provider: DEFAULT_PROVIDER,
    model: DEFAULT_PROVIDER === 'openrouter' ? OPENROUTER_MODELS.smart : 'claude-3-5-sonnet-20241022',
    temperature: 0.2,
    maxTokens: 4096,
    systemPrompt: `You are an expert Product Manager. Analyze requirements and create detailed product specifications. Output structured JSON with: projectName, refinedPrompt, complexity, pages[], dataModel[], authStrategy, targetLocales[], needsI18n.`,
  },
  'DBA Architect': {
    provider: DEFAULT_PROVIDER,
    model: DEFAULT_PROVIDER === 'openrouter' ? OPENROUTER_MODELS.smart : 'claude-3-5-sonnet-20241022',
    temperature: 0.1,
    maxTokens: 4096,
    systemPrompt: `You are a Database Architect. Design PostgreSQL/Supabase schemas with proper RLS policies. Output: needsDatabase, tables[], relationships[], indexes[], supabaseClientCode.`,
  },
  'UX Designer': {
    provider: DEFAULT_PROVIDER,
    model: DEFAULT_PROVIDER === 'openrouter' ? OPENROUTER_MODELS.smart : 'claude-3-5-sonnet-20241022',
    temperature: 0.3,
    maxTokens: 4096,
    systemPrompt: `You are a UX Designer. Create design systems with colorTokens, typography, borderRadius, components[], layouts[]. Focus on accessibility and consistency.`,
  },
  'Coder Agent': {
    provider: DEFAULT_PROVIDER,
    model: DEFAULT_PROVIDER === 'openrouter' ? OPENROUTER_MODELS.coder : 'claude-3-5-sonnet-20241022',
    temperature: 0.1,
    maxTokens: 8192,
    systemPrompt: `You are an expert React/TypeScript developer. Write clean, typed code with proper error handling. Use Tailwind CSS for styling. Output files in format: \`\`\`file:path\ncontent\`\`\``,
  },
  'Builder Agent': {
    provider: DEFAULT_PROVIDER,
    model: DEFAULT_PROVIDER === 'openrouter' ? OPENROUTER_MODELS.coder : 'claude-3-5-sonnet-20241022',
    temperature: 0.3,
    // 16k tokens for complete apps (multi-file generation). Anti-truncation budget.
    maxTokens: 16000,
  },
  'Repair Agent': {
    provider: DEFAULT_PROVIDER,
    model: DEFAULT_PROVIDER === 'openrouter' ? OPENROUTER_MODELS.coder : 'claude-3-5-sonnet-20241022',
    temperature: 0.1,
    maxTokens: 8192,
  },
  'Intent Parser': {
    provider: DEFAULT_PROVIDER,
    model: DEFAULT_PROVIDER === 'openrouter' ? OPENROUTER_MODELS.fast : 'claude-3-haiku-20240307',
    temperature: 0.1,
    maxTokens: 1500,
  },
  'Conversation': {
    provider: DEFAULT_PROVIDER,
    model: DEFAULT_PROVIDER === 'openrouter' ? OPENROUTER_MODELS.fast : 'claude-3-haiku-20240307',
    temperature: 0.6,
    maxTokens: 1024,
  },
  'Security Auditor': {
    provider: DEFAULT_PROVIDER,
    model: DEFAULT_PROVIDER === 'openrouter' ? OPENROUTER_MODELS.fast : 'claude-3-haiku-20240307',
    temperature: 0.0,
    maxTokens: 2048,
    systemPrompt: `You are a Security Auditor. Scan code for vulnerabilities. Output JSON with: score, approved, criticalIssues[], fixes[].`,
  },
  'QA Reviewer': {
    provider: DEFAULT_PROVIDER,
    model: DEFAULT_PROVIDER === 'openrouter' ? OPENROUTER_MODELS.fast : 'claude-3-haiku-20240307',
    temperature: 0.1,
    maxTokens: 2048,
    systemPrompt: `You are a QA Engineer. Review code for bugs, performance, best practices. Output JSON with: score, approved, issues[], fixes[].`,
  },
  'i18n Agent': {
    provider: DEFAULT_PROVIDER,
    model: DEFAULT_PROVIDER === 'openrouter' ? OPENROUTER_MODELS.fast : 'claude-3-haiku-20240307',
    temperature: 0.1,
    maxTokens: 4096,
    systemPrompt: `You are an i18n specialist. Add internationalization support. Output: modifiedFiles, localeFiles, setupCode.`,
  },
};

export class LLMGateway {
  constructor() {
    /** @type {Map<LLMProvider, string>} */
    this.apiKeys = new Map();
    this.retryAttempts = 3;
    this.retryDelay = 1000;

    // Load API keys from environment
    if (process.env.ANTHROPIC_API_KEY) {
      this.apiKeys.set('anthropic', process.env.ANTHROPIC_API_KEY);
    }
    if (process.env.OPENAI_API_KEY) {
      this.apiKeys.set('openai', process.env.OPENAI_API_KEY);
    }
    if (process.env.OPENROUTER_API_KEY) {
      this.apiKeys.set('openrouter', process.env.OPENROUTER_API_KEY);
    }
  }

  /**
   * Get config for an agent type
   * @param {string} agentName
   * @returns {LLMConfig}
   */
  getConfig(agentName) {
    return AGENT_CONFIGS[agentName] || AGENT_CONFIGS['Coder Agent'];
  }

  /**
   * Stream generate with Windsurf-style events
   * @param {string} agentName
   * @param {string} prompt
   * @param {StreamCallbacks} callbacks
   * @param {string} [existingContext]
   * @returns {Promise<LLMResult>}
   */
  async streamGenerate(agentName, prompt, callbacks, systemPromptOverride) {
    const baseConfig = this.getConfig(agentName);

    // Allow per-call override of systemPrompt and temperature (via callbacks.temperature)
    const config = {
      ...baseConfig,
      ...(typeof systemPromptOverride === 'string' && systemPromptOverride.trim()
        ? { systemPrompt: systemPromptOverride }
        : {}),
      ...(typeof callbacks?.temperature === 'number'
        ? { temperature: callbacks.temperature }
        : {}),
      ...(typeof callbacks?.maxTokens === 'number'
        ? { maxTokens: callbacks.maxTokens }
        : {}),
    };

    let lastError = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const result = await this.executeStream(config, prompt, callbacks, agentName);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        console.warn(`[LLMGateway] Attempt ${attempt} failed for ${agentName}:`, lastError.message);
        
        if (attempt < this.retryAttempts) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          callbacks.onThinking?.(`⚠️ Retry attempt ${attempt}/${this.retryAttempts} after ${delay}ms...`);
          await this.delay(delay);
        }
      }
    }

    const errorResult = {
      success: false,
      content: '',
      error: lastError?.message || 'All retry attempts failed',
    };

    callbacks.onError?.(lastError);
    return errorResult;
  }

  /**
   * Execute streaming request based on provider
   * @param {LLMConfig} config
   * @param {string} prompt
   * @param {StreamCallbacks} callbacks
   * @param {string} agentName
   * @returns {Promise<LLMResult>}
   */
  async executeStream(config, prompt, callbacks, agentName) {
    switch (config.provider) {
      case 'anthropic':
        return this.streamAnthropic(config, prompt, callbacks, agentName);
      case 'openai':
        return this.streamOpenAI(config, prompt, callbacks, agentName);
      case 'openrouter':
        return this.streamOpenRouter(config, prompt, callbacks, agentName);
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }

  /**
   * Stream with Anthropic Claude
   * @param {LLMConfig} config
   * @param {string} prompt
   * @param {StreamCallbacks} callbacks
   * @param {string} agentName
   * @returns {Promise<LLMResult>}
   */
  async streamAnthropic(config, prompt, callbacks, agentName) {
    const apiKey = this.apiKeys.get('anthropic');
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    // ── Extended Thinking activation (Phase 1) ─────────────────────────────
    const thinkingBudget = supportsExtendedThinking(config.model)
      ? getThinkingBudget(agentName, config.maxTokens)
      : 0;
    const useThinking = thinkingBudget > 0;

    // Per Anthropic API: when thinking is enabled, temperature MUST be 1.0
    const body = {
      model: config.model,
      max_tokens: config.maxTokens + (useThinking ? thinkingBudget : 0),
      temperature: useThinking ? 1.0 : config.temperature,
      system: config.systemPrompt,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    };
    if (useThinking) {
      body.thinking = { type: 'enabled', budget_tokens: thinkingBudget };
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${error}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let thinkingBuffer = '';
    let isInThinkingBlock = false;

    callbacks.onThinking?.(`🤖 ${agentName} starting...`);

    // ─── Heartbeat: emit "still alive" if 12s without chunk ───────────────
    const heartbeat = createHeartbeat(callbacks, agentName, 12_000);

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
                // Native Extended Thinking delta (Sonnet/Opus 4.x)
                if (parsed.delta?.type === 'thinking_delta') {
                  const thinkingText = parsed.delta?.thinking || '';
                  if (thinkingText.trim()) {
                    heartbeat.reset();
                    // Surface thinking to UI line-by-line
                    thinkingBuffer += thinkingText;
                    const completeLines = thinkingBuffer.split('\n');
                    thinkingBuffer = completeLines.pop() || '';
                    for (const line of completeLines) {
                      if (line.trim()) {
                        callbacks.onThinking?.(line.trim());
                        globalEventBus.emitAgentProgress(agentName, line.trim());
                      }
                    }
                  }
                  continue;
                }

                const text = parsed.delta?.text || '';
                if (text) heartbeat.reset();
                fullContent += text;

                if (text.includes('<thinking>')) {
                  isInThinkingBlock = true;
                  thinkingBuffer = '';
                }

                if (isInThinkingBlock) {
                  thinkingBuffer += text;

                  const thinkingLines = text.split('\n').filter(l => l.trim());
                  for (const line of thinkingLines) {
                    if (!line.includes('<thinking>') && !line.includes('</thinking>')) {
                      callbacks.onThinking?.(line);
                      globalEventBus.emitAgentProgress(agentName, line);
                    }
                  }

                  if (text.includes('</thinking>')) {
                    isInThinkingBlock = false;
                  }
                } else {
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

      const usage = {
        promptTokens: this.estimateTokens(prompt),
        completionTokens: this.estimateTokens(fullContent),
        totalTokens: this.estimateTokens(prompt) + this.estimateTokens(fullContent),
      };

      const result = {
        success: true,
        content: fullContent,
        usage,
      };

      callbacks.onComplete?.(result);
      return result;

    } catch (error) {
      throw error;
    } finally {
      heartbeat.stop();
    }
  }

  /**
   * Stream with OpenAI GPT
   * @param {LLMConfig} config
   * @param {string} prompt
   * @param {StreamCallbacks} callbacks
   * @param {string} agentName
   * @returns {Promise<LLMResult>}
   */
  async streamOpenAI(config, prompt, callbacks, agentName) {
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

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    callbacks.onThinking?.(`🤖 ${agentName} starting...`);

    // ─── Heartbeat: emit "still alive" if 12s without chunk ───────────────
    const heartbeat = createHeartbeat(callbacks, agentName, 12_000);

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
              const chunk = parsed.choices?.[0]?.delta?.content || '';
              
              if (chunk) {
                heartbeat.reset();
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
    } finally {
      heartbeat.stop();
    }

    const result = {
      success: true,
      content: fullContent,
    };

    callbacks.onComplete?.(result);
    return result;
  }

  /**
   * Non-streaming generate (for simple queries)
   * @param {string} agentName
   * @param {string} prompt
   * @returns {Promise<LLMResult>}
   */
  async generate(agentName, prompt) {
    return this.streamGenerate(agentName, prompt, {});
  }

  /**
   * Check if provider is available
   * @param {LLMProvider} provider
   * @returns {boolean}
   */
  isAvailable(provider) {
    return this.apiKeys.has(provider);
  }

  /**
   * Fallback to available provider
   * @param {string} agentName
   * @param {string} prompt
   * @param {StreamCallbacks} callbacks
   * @returns {Promise<LLMResult>}
   */
  async generateWithFallback(agentName, prompt, callbacks) {
    if (this.isAvailable('openrouter')) {
      const originalConfig = { ...AGENT_CONFIGS[agentName] };
      AGENT_CONFIGS[agentName] = { ...originalConfig, provider: 'openrouter', model: OPENROUTER_MODELS.smart };
      const result = await this.streamGenerate(agentName, prompt, callbacks);
      AGENT_CONFIGS[agentName] = originalConfig;
      return result;
    }

    if (this.isAvailable('anthropic')) {
      return this.streamGenerate(agentName, prompt, callbacks);
    }

    if (this.isAvailable('openai')) {
      const originalConfig = { ...AGENT_CONFIGS[agentName] };
      AGENT_CONFIGS[agentName] = { ...originalConfig, provider: 'openai', model: 'gpt-4o' };
      const result = await this.streamGenerate(agentName, prompt, callbacks);
      AGENT_CONFIGS[agentName] = originalConfig;
      return result;
    }

    throw new Error('No LLM provider available. Configure OPENROUTER_API_KEY, ANTHROPIC_API_KEY or OPENAI_API_KEY.');
  }

  /**
   * Stream with OpenRouter (OpenAI-compatible API)
   * @param {LLMConfig} config
   * @param {string} prompt
   * @param {StreamCallbacks} callbacks
   * @param {string} agentName
   * @returns {Promise<LLMResult>}
   */
  async streamOpenRouter(config, prompt, callbacks, agentName) {
    const apiKey = this.apiKeys.get('openrouter');
    if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');

    // ── Extended Thinking via OpenRouter (Phase 1) ─────────────────────────
    const thinkingBudget = supportsExtendedThinking(config.model)
      ? getThinkingBudget(agentName, config.maxTokens)
      : 0;
    const useThinking = thinkingBudget > 0;

    const body = {
      model: config.model,
      messages: [
        ...(config.systemPrompt ? [{ role: 'system', content: config.systemPrompt }] : []),
        { role: 'user', content: prompt },
      ],
      temperature: useThinking ? 1.0 : config.temperature,
      max_tokens: config.maxTokens + (useThinking ? thinkingBudget : 0),
      stream: true,
    };
    if (useThinking) {
      // OpenRouter passes-through Anthropic's thinking parameter for Claude models
      body.thinking = { type: 'enabled', budget_tokens: thinkingBudget };
      // Also expose reasoning summary in choices.delta.reasoning when supported
      body.reasoning = { effort: 'high' };
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.APP_URL || 'https://huggy.app',
        'X-Title': 'Huggy AI Builder',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${error}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    callbacks.onThinking?.(`🤖 ${agentName} starting via OpenRouter...`);

    // ─── Heartbeat: emit "still alive" if 12s without chunk ───────────────
    const heartbeat = createHeartbeat(callbacks, agentName, 12_000);

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
              const delta = parsed.choices?.[0]?.delta;
              // Surface reasoning summaries (OpenRouter exposes them in delta.reasoning)
              const reasoning = delta?.reasoning;
              if (reasoning && typeof reasoning === 'string' && reasoning.trim()) {
                heartbeat.reset();
                const lines = reasoning.split('\n').filter(l => l.trim());
                for (const ln of lines) {
                  callbacks.onThinking?.(ln);
                  globalEventBus.emitAgentProgress(agentName, ln);
                }
              }
              const chunk = delta?.content || '';
              if (chunk) {
                heartbeat.reset();
                fullContent += chunk;
                callbacks.onChunk?.(chunk);
                globalEventBus.emitReplyChunk(chunk, agentName);
              }
            } catch { /* ignore */ }
          }
        }
      }
    } finally {
      heartbeat.stop();
    }

    const result = { success: true, content: fullContent };
    callbacks.onComplete?.(result);
    return result;
  }

  /**
   * Estimate token count (rough approximation)
   * @param {string} text
   * @returns {number}
   */
  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  /**
   * Delay helper
   * @param {number} ms
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Parse files from content (used by agents)
   * @param {string} content
   * @returns {Array<{path: string, content: string}>}
   */
  parseFiles(content) {
    if (typeof content !== 'string' || !content.trim()) return [];

    const files = [];
    const seen = new Set();
    const pushFile = (rawPath, rawContent) => {
      if (!rawPath || !rawContent) return;
      const path = rawPath.trim().replace(/^[`"'<>]+|[`"'<>]+$/g, '').replace(/^\/+/, '').replace(/\\/g, '/');
      if (!path) return;
      // Accept regular source files OR known full-stack artifacts
      const isSource     = /[a-z0-9_\-]\.(tsx?|jsx?|css|html|json|md|svg|sql)$/i.test(path);
      const isSupaFn     = /^supabase\/functions\/[\w\-./]+\.(ts|js)$/i.test(path);
      const isMigration  = /^supabase\/.*\.sql$/i.test(path);
      const isReadme     = /^README\.md$/i.test(path);
      const isEnvExample = /^\.env\.example$/i.test(path);
      const isPublic     = /^public\/.+\.(svg|png|json|txt|ico)$/i.test(path);
      if (!isSource && !isSupaFn && !isMigration && !isReadme && !isEnvExample && !isPublic) return;
      if (seen.has(path)) return;
      seen.add(path);
      files.push({ path, content: rawContent.trim() });
    };

    // 1) Strict format ```file:path
    const strict = /```(?:[a-z]+\s+)?file:([^\n`]+)\n([\s\S]*?)```/gi;
    let match;
    while ((match = strict.exec(content)) !== null) {
      pushFile(match[1], match[2]);
    }

    // 2) Format with language + path inline: ```tsx src/App.tsx
    if (!files.length) {
      const langPath = /```(?:tsx|ts|jsx|js|typescript|javascript|html|css|json)\s+([^\n`]+)\n([\s\S]*?)```/gi;
      while ((match = langPath.exec(content)) !== null) {
        pushFile(match[1], match[2]);
      }
    }

    // 3) Inline header before fence: "src/App.tsx\n```tsx\n...```"
    if (!files.length) {
      const headerFence = /(^|\n)\s*(?:\/\/\s*|#\s*|\*\s*)?([\w./-]+\.(?:tsx?|jsx?|css|html|json|md|svg))\s*\n```(?:[a-z]+)?\n([\s\S]*?)```/gi;
      while ((match = headerFence.exec(content)) !== null) {
        pushFile(match[2], match[3]);
      }
    }

    // 4) Single bare code fence containing JSX/React → assume src/App.tsx
    if (!files.length) {
      const bare = content.match(/```(?:tsx|jsx|typescript|javascript|ts|js)?\n([\s\S]*?)```/i);
      if (bare && /export\s+default|return\s*\(/.test(bare[1])) {
        pushFile('src/App.tsx', bare[1]);
      }
    }

    return files;
  }

  /**
   * Extract JSON from content
   * @param {string} content
   * @returns {any}
   */
  parseJSON(content) {
    try {
      return JSON.parse(content);
    } catch {
      const fencedJsonMatch = content.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
      if (fencedJsonMatch) {
        try {
          return JSON.parse(fencedJsonMatch[1].trim());
        } catch {
          // Continue with object extraction below
        }
      }

      const objectStart = content.indexOf('{');
      const objectEnd = content.lastIndexOf('}');
      if (objectStart >= 0 && objectEnd > objectStart) {
        const candidate = content.slice(objectStart, objectEnd + 1);
        try {
          return JSON.parse(candidate);
        } catch {
          // Continue to throw consistent error below
        }
      }

      throw new Error('No valid JSON found in content');
    }
  }
}

// Export singleton
export const llmGateway = new LLMGateway();

export default LLMGateway;
