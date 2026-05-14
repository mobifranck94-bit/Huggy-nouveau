/**
 * Event Bus - Windsurf Style
 * 
 * Transforme les événements internes de l'orchestrateur en événements
 * compatibles avec l'UI streaming style Windsurf.
 */

export type EventType =
  // Agent lifecycle
  | 'agent.start'
  | 'agent.progress'
  | 'agent.active'
  | 'agent.complete'
  | 'agent.error'
  | 'agent.retry'
  | 'agent.skip'  // NEW: agent skipped (conditional)
  // Tool events (NEW)
  | 'tool.start'
  | 'tool.progress'
  | 'tool.complete'
  | 'tool.error'
  // Phase events (NEW)
  | 'phase.start'
  | 'phase.progress'
  | 'phase.complete'
  // Content events
  | 'thinking'
  | 'reply.chunk'
  | 'code.chunk'  // NEW: code streaming
  | 'files.ready'
  | 'files.partial'  // NEW: partial files
  // Pipeline lifecycle
  | 'pipeline.initialized'  // NEW
  | 'pipeline.complete'
  | 'pipeline.error'
  // Meta events (NEW)
  | 'metrics'
  | 'warning';

export type AgentStatus = 'idle' | 'active' | 'completed' | 'failed' | 'retrying';

export interface AgentState {
  name: string;
  status: AgentStatus;
  index: number;
  description?: string;
  retryCount?: number;
}

export interface WindsurfEvent {
  type: EventType;
  agent?: string;
  timestamp: number;
  data: {
    // Agent track data
    agentStatus?: AgentStatus;
    agentIndex?: number;
    totalAgents?: number;
    description?: string;

    // Phase data (NEW)
    phase?: string;
    previousPhase?: string;
    phaseProgress?: number;

    // Tool data (NEW)
    tool?: string;
    toolStatus?: 'pending' | 'active' | 'completed' | 'error';
    toolLabel?: string;
    toolDetail?: string;
    toolPath?: string;
    toolLines?: number;

    // Terminal thinking block data
    thinkingLines?: string[];
    thinkingLine?: string;

    // Reply streaming data
    replyChunk?: string;
    fullReply?: string;

    // Code streaming data (NEW)
    codeChunk?: string;
    codePath?: string;

    // Files data
    files?: Array<{ path: string; content: string }>;
    fileCount?: number;
    partialFile?: { path: string; content: string; isComplete: boolean };

    // Error/Retry data
    error?: string;
    errorCode?: string;
    retryCount?: number;
    maxRetries?: number;
    recoverable?: boolean;

    // Metrics (NEW)
    metrics?: {
      startTime?: number;
      duration?: number;
      tokensIn?: number;
      tokensOut?: number;
      filesCreated?: number;
      filesModified?: number;
    };

    // Metadata
    meta?: {
      securityScore?: number;
      qaScore?: number;
      complexity?: string;
      projectName?: string;
    };

    // Skip reason (NEW)
    skipReason?: string;
  };
}

export type EventHandler = (event: WindsurfEvent) => void;

export class WindsurfEventBus {
  private subscribers: Map<EventType, EventHandler[]> = new Map();
  private globalHandlers: EventHandler[] = [];
  private sseClients: Set<(event: WindsurfEvent) => void> = new Set();

  /**
   * Subscribe to a specific event type
   */
  on(eventType: EventType, handler: EventHandler): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.subscribers.get(eventType);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) handlers.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to all events
   */
  onAll(handler: EventHandler): () => void {
    this.globalHandlers.push(handler);
    return () => {
      const index = this.globalHandlers.indexOf(handler);
      if (index > -1) this.globalHandlers.splice(index, 1);
    };
  }

  /**
   * Register SSE client for streaming
   */
  registerSSEClient(handler: (event: WindsurfEvent) => void): () => void {
    this.sseClients.add(handler);
    return () => this.sseClients.delete(handler);
  }

  /**
   * Emit an event to all subscribers and SSE clients
   */
  emit(event: WindsurfEvent): void {
    // Set timestamp if not provided
    if (!event.timestamp) {
      event.timestamp = Date.now();
    }

    // Notify type-specific subscribers
    const handlers = this.subscribers.get(event.type);
    if (handlers) {
      handlers.forEach(h => {
        try {
          h(event);
        } catch (err) {
          console.error(`[EventBus] Handler error for ${event.type}:`, err);
        }
      });
    }

    // Notify global handlers
    this.globalHandlers.forEach(h => {
      try {
        h(event);
      } catch (err) {
        console.error('[EventBus] Global handler error:', err);
      }
    });

    // Stream to SSE clients
    this.sseClients.forEach(client => {
      try {
        client(event);
      } catch (err) {
        console.error('[EventBus] SSE client error:', err);
      }
    });
  }

  /**
   * Emit agent start event
   */
  emitAgentStart(agent: string, index: number, total: number, description?: string): void {
    this.emit({
      type: 'agent.start',
      agent,
      timestamp: Date.now(),
      data: {
        agentStatus: 'active',
        agentIndex: index,
        totalAgents: total,
        description,
      },
    });
  }

  /**
   * Emit agent progress event (thinking lines)
   */
  emitAgentProgress(agent: string, thinkingLine: string): void {
    this.emit({
      type: 'thinking',
      agent,
      timestamp: Date.now(),
      data: {
        thinkingLine,
        thinkingLines: [thinkingLine],
      },
    });
  }

  /**
   * Emit agent complete event
   */
  emitAgentComplete(agent: string, files?: Array<{ path: string; content: string }>, meta?: any): void {
    this.emit({
      type: 'agent.complete',
      agent,
      timestamp: Date.now(),
      data: {
        agentStatus: 'completed',
        files,
        fileCount: files?.length,
        meta,
      },
    });
  }

  /**
   * Emit agent error event
   */
  emitAgentError(agent: string, error: string, retryCount?: number, maxRetries?: number): void {
    this.emit({
      type: 'agent.error',
      agent,
      timestamp: Date.now(),
      data: {
        agentStatus: 'failed',
        error,
        retryCount,
        maxRetries,
      },
    });
  }

  /**
   * Emit agent retry event
   */
  emitAgentRetry(agent: string, retryCount: number, maxRetries: number): void {
    this.emit({
      type: 'agent.retry',
      agent,
      timestamp: Date.now(),
      data: {
        agentStatus: 'retrying',
        retryCount,
        maxRetries,
      },
    });
  }

  /**
   * Emit reply chunk for word-by-word streaming
   */
  emitReplyChunk(chunk: string, agent?: string): void {
    this.emit({
      type: 'reply.chunk',
      agent,
      timestamp: Date.now(),
      data: {
        replyChunk: chunk,
      },
    });
  }

  /**
   * Emit files ready event
   */
  emitFilesReady(files: Array<{ path: string; content: string }>): void {
    this.emit({
      type: 'files.ready',
      timestamp: Date.now(),
      data: {
        files,
        fileCount: files.length,
      },
    });
  }

  /**
   * Emit pipeline complete event
   */
  emitPipelineComplete(finalResult: any): void {
    this.emit({
      type: 'pipeline.complete',
      timestamp: Date.now(),
      data: {
        fullReply: finalResult.reply,
        files: finalResult.files,
        meta: finalResult.meta,
      },
    });
  }

  /**
   * Emit tool start event (NEW)
   */
  emitToolStart(tool: string, label: string, path?: string): void {
    this.emit({
      type: 'tool.start',
      timestamp: Date.now(),
      data: {
        tool,
        toolStatus: 'active',
        toolLabel: label,
        toolPath: path,
      },
    });
  }

  /**
   * Emit tool progress event (NEW)
   */
  emitToolProgress(tool: string, label: string, progress: number, detail?: string): void {
    this.emit({
      type: 'tool.progress',
      timestamp: Date.now(),
      data: {
        tool,
        toolStatus: 'active',
        toolLabel: label,
        toolDetail: detail,
        phaseProgress: progress,
      },
    });
  }

  /**
   * Emit tool complete event (NEW)
   */
  emitToolComplete(tool: string, label: string, detail?: string, lines?: number): void {
    this.emit({
      type: 'tool.complete',
      timestamp: Date.now(),
      data: {
        tool,
        toolStatus: 'completed',
        toolLabel: label,
        toolDetail: detail,
        toolLines: lines,
      },
    });
  }

  /**
   * Emit tool error event (NEW)
   */
  emitToolError(tool: string, label: string, error: string): void {
    this.emit({
      type: 'tool.error',
      timestamp: Date.now(),
      data: {
        tool,
        toolStatus: 'error',
        toolLabel: label,
        error,
      },
    });
  }

  /**
   * Emit phase change event (NEW)
   */
  emitPhaseStart(phase: string, previousPhase?: string, description?: string): void {
    this.emit({
      type: 'phase.start',
      timestamp: Date.now(),
      data: {
        phase,
        previousPhase,
        description,
        phaseProgress: 0,
      },
    });
  }

  /**
   * Emit phase progress event (NEW)
   */
  emitPhaseProgress(phase: string, progress: number, description?: string): void {
    this.emit({
      type: 'phase.progress',
      timestamp: Date.now(),
      data: {
        phase,
        phaseProgress: progress,
        description,
      },
    });
  }

  /**
   * Emit phase complete event (NEW)
   */
  emitPhaseComplete(phase: string, nextPhase?: string): void {
    this.emit({
      type: 'phase.complete',
      timestamp: Date.now(),
      data: {
        phase: nextPhase || phase,
        previousPhase: phase,
        phaseProgress: 100,
      },
    });
  }

  /**
   * Emit agent skip event (NEW)
   */
  emitAgentSkip(agent: string, reason: string): void {
    this.emit({
      type: 'agent.skip',
      agent,
      timestamp: Date.now(),
      data: {
        agentStatus: 'completed',
        skipReason: reason,
        description: `Skipped: ${reason}`,
      },
    });
  }

  /**
   * Emit code chunk for live code streaming (NEW)
   */
  emitCodeChunk(chunk: string, path?: string, agent?: string): void {
    this.emit({
      type: 'code.chunk',
      agent,
      timestamp: Date.now(),
      data: {
        codeChunk: chunk,
        codePath: path,
      },
    });
  }

  /**
   * Emit partial file update (NEW)
   */
  emitPartialFile(path: string, content: string, isComplete: boolean = false): void {
    this.emit({
      type: 'files.partial',
      timestamp: Date.now(),
      data: {
        partialFile: { path, content, isComplete },
        toolPath: path,
      },
    });
  }

  /**
   * Emit pipeline initialized event (NEW)
   */
  emitPipelineInitialized(totalAgents: number, description?: string): void {
    this.emit({
      type: 'pipeline.initialized',
      timestamp: Date.now(),
      data: {
        totalAgents,
        description,
        phase: 'initializing',
      },
    });
  }

  /**
   * Emit metrics event (NEW)
   */
  emitMetrics(metrics: {
    startTime?: number;
    duration?: number;
    tokensIn?: number;
    tokensOut?: number;
    filesCreated?: number;
    filesModified?: number;
  }): void {
    this.emit({
      type: 'metrics',
      timestamp: Date.now(),
      data: { metrics },
    });
  }

  /**
   * Emit warning event (NEW)
   */
  emitWarning(warning: string, code?: string, recoverable: boolean = true): void {
    this.emit({
      type: 'warning',
      timestamp: Date.now(),
      data: {
        error: warning,
        errorCode: code,
        recoverable,
      },
    });
  }

  /**
   * Transform Windsurf event to SSE format for client streaming
   */
  toSSEFormat(event: WindsurfEvent): string {
    return `data: ${JSON.stringify(event)}\n\n`;
  }

  /**
   * Clear all subscribers
   */
  clear(): void {
    this.subscribers.clear();
    this.globalHandlers = [];
    this.sseClients.clear();
  }
}

// Singleton instance for global use
export const globalEventBus = new WindsurfEventBus();

export default WindsurfEventBus;
