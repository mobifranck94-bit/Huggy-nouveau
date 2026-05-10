/**
 * OpenRouter API Client
 * Multi-provider LLM access with smart model routing
 */

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Model definitions with metadata
export const OPENROUTER_MODELS = {
  'anthropic/claude-3.5-sonnet': {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Sonnet 3.5',
    description: 'Fast & balanced for coding',
    icon: '⚡',
    context: 200000,
    pricing: { prompt: 0.003, completion: 0.015 },
    bestFor: ['code', 'planning', 'general'],
    provider: 'anthropic',
  },
  'anthropic/claude-3-opus': {
    id: 'anthropic/claude-3-opus',
    name: 'Opus 3',
    description: 'Most capable',
    icon: '💪',
    context: 200000,
    pricing: { prompt: 0.015, completion: 0.075 },
    bestFor: ['complex', 'creative', 'analysis'],
    provider: 'anthropic',
  },
  'anthropic/claude-3-haiku': {
    id: 'anthropic/claude-3-haiku',
    name: 'Haiku 3',
    description: 'Lightning fast',
    icon: '⚡⚡',
    context: 200000,
    pricing: { prompt: 0.00025, completion: 0.00125 },
    bestFor: ['quick_tasks', 'review', 'simple'],
    provider: 'anthropic',
  },
  'openai/gpt-4o': {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    description: 'Best for complex reasoning',
    icon: '🧠',
    context: 128000,
    pricing: { prompt: 0.005, completion: 0.015 },
    bestFor: ['complex', 'multimodal', 'analysis'],
    provider: 'openai',
  },
  'google/gemini-2.0-flash-exp': {
    id: 'google/gemini-2.0-flash-exp',
    name: 'Gemini 2.0',
    description: '1M context, multilingual',
    icon: '🌍',
    context: 1000000,
    pricing: { prompt: 0.0001, completion: 0.0004 },
    bestFor: ['large_context', 'multilingual', 'summarization'],
    provider: 'google',
  },
  'meta-llama/llama-3-70b-instruct': {
    id: 'meta-llama/llama-3-70b-instruct',
    name: 'Llama 3 70B',
    description: 'Open source',
    icon: '🦙',
    context: 8192,
    pricing: { prompt: 0.0009, completion: 0.0009 },
    bestFor: ['cost_effective', 'simple'],
    provider: 'meta',
  },
};

/**
 * Task profile for model selection
 */
export function detectTaskProfile(prompt, files = []) {
  const codePatterns = ['code', 'generate', 'write', 'implement', 'create', 'function', 'component'];
  const planPatterns = ['plan', 'architecture', 'design', 'structure', 'organize'];
  const reviewPatterns = ['review', 'audit', 'check', 'analyze', 'fix', 'debug'];
  const complexPatterns = ['complex', 'difficult', 'advanced', 'sophisticated', 'multiple'];
  
  const promptLower = prompt.toLowerCase();
  const fileCount = files.length;
  
  // Detect task type
  let taskType = 'general';
  if (codePatterns.some(p => promptLower.includes(p))) taskType = 'code';
  else if (planPatterns.some(p => promptLower.includes(p))) taskType = 'planning';
  else if (reviewPatterns.some(p => promptLower.includes(p))) taskType = 'review';
  
  // Detect complexity
  let complexity = 'medium';
  if (complexPatterns.some(p => promptLower.includes(p)) || fileCount > 10) {
    complexity = 'high';
  } else if (fileCount < 3) {
    complexity = 'low';
  }
  
  // Calculate context size
  const contextSize = files.reduce((acc, f) => acc + (f.content?.length || 0), 0);
  
  return {
    type: taskType,
    complexity,
    contextSize,
    fileCount,
  };
}

/**
 * Select best model for task
 */
export function selectModelForTask(profile) {
  const { type, complexity, contextSize } = profile;
  
  // Large context → Gemini
  if (contextSize > 500000) {
    return 'google/gemini-2.0-flash-exp';
  }
  
  // High complexity → GPT-4o or Opus
  if (complexity === 'high') {
    return type === 'code' ? 'anthropic/claude-3-opus' : 'openai/gpt-4o';
  }
  
  // Review tasks → Haiku (fast & cheap)
  if (type === 'review') {
    return 'anthropic/claude-3-haiku';
  }
  
  // Code generation → Sonnet (best balance)
  if (type === 'code') {
    return 'anthropic/claude-3.5-sonnet';
  }
  
  // Default → Sonnet
  return 'anthropic/claude-3.5-sonnet';
}

/**
 * OpenRouter API Client
 */
export class OpenRouterClient {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY;
    this.baseUrl = OPENROUTER_BASE_URL;
    this.referrer = process.env.OPENROUTER_HTTP_REFERRER || 'https://huggy.dev';
    this.siteName = process.env.OPENROUTER_SITE_NAME || 'Huggy';
  }
  
  /**
   * Stream chat completion
   */
  async *streamChat(options) {
    const {
      model,
      messages,
      temperature = 0.1,
      maxTokens = 4096,
      onTokenUsage,
    } = options;
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': this.referrer,
        'X-Title': this.siteName,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
        transforms: ['middle-out'], // Compress large contexts
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let tokenCount = { prompt: 0, completion: 0 };
    
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
              
              // Token usage from response
              if (parsed.usage) {
                tokenCount = {
                  prompt: parsed.usage.prompt_tokens || 0,
                  completion: parsed.usage.completion_tokens || 0,
                };
                onTokenUsage?.(tokenCount);
              }
              
              // Content delta
              const delta = parsed.choices?.[0]?.delta;
              if (delta?.content) {
                yield {
                  type: 'content',
                  content: delta.content,
                  tokenCount,
                };
              }
              
              // Tool calls (for agent mode)
              if (delta?.tool_calls) {
                yield {
                  type: 'tool_call',
                  toolCalls: delta.tool_calls,
                  tokenCount,
                };
              }
            } catch {
              // Ignore malformed JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    
    // Final usage stats
    yield {
      type: 'done',
      tokenCount,
    };
  }
  
  /**
   * Non-streaming chat (for simple queries)
   */
  async chat(options) {
    const chunks = [];
    const stream = this.streamChat(options);
    
    for await (const chunk of stream) {
      if (chunk.type === 'content') {
        chunks.push(chunk.content);
      }
      if (chunk.type === 'done') {
        return {
          content: chunks.join(''),
          tokenCount: chunk.tokenCount,
        };
      }
    }
    
    return {
      content: chunks.join(''),
      tokenCount: { prompt: 0, completion: 0 },
    };
  }
  
  /**
   * Get available models from OpenRouter
   */
  async getModels() {
    const response = await fetch(`${this.baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }
    
    return response.json();
  }
  
  /**
   * Check API key validity
   */
  async validateKey() {
    try {
      await this.getModels();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Format tokens for display (user-friendly)
 */
export function formatTokenCount(count) {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
}

/**
 * Calculate cost (for admin/internal use only)
 */
export function calculateCost(modelId, tokenCount) {
  const model = OPENROUTER_MODELS[modelId];
  if (!model) return 0;
  
  const promptCost = (tokenCount.prompt / 1000) * model.pricing.prompt;
  const completionCost = (tokenCount.completion / 1000) * model.pricing.completion;
  
  return promptCost + completionCost;
}

// Export singleton
export const openRouter = new OpenRouterClient();

export default OpenRouterClient;
