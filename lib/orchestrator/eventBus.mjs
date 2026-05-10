/**
 * Event Bus - Windsurf Style
 * 
 * Transforme les événements internes de l'orchestrateur en événements
 * compatibles avec l'UI streaming style Windsurf.
 */

/**
 * @typedef {'agent.start' | 'agent.progress' | 'agent.complete' | 'agent.error' | 'agent.retry' | 'thinking' | 'reply.chunk' | 'files.ready' | 'pipeline.complete'} EventType
 */

/**
 * @typedef {'idle' | 'active' | 'completed' | 'failed' | 'retrying'} AgentStatus
 */

/**
 * @typedef {Object} AgentState
 * @property {string} name
 * @property {AgentStatus} status
 * @property {number} index
 * @property {string} [description]
 * @property {number} [retryCount]
 */

/**
 * @typedef {Object} WindsurfEvent
 * @property {EventType} type
 * @property {string} [agent]
 * @property {number} timestamp
 * @property {Object} data
 * @property {AgentStatus} [data.agentStatus]
 * @property {number} [data.agentIndex]
 * @property {number} [data.totalAgents]
 * @property {string} [data.description]
 * @property {string[]} [data.thinkingLines]
 * @property {string} [data.thinkingLine]
 * @property {string} [data.replyChunk]
 * @property {string} [data.fullReply]
 * @property {Array<{path: string, content: string}>} [data.files]
 * @property {number} [data.fileCount]
 * @property {string} [data.error]
 * @property {number} [data.retryCount]
 * @property {number} [data.maxRetries]
 * @property {Object} [data.meta]
 * @property {number} [data.meta.securityScore]
 * @property {number} [data.meta.qaScore]
 * @property {string} [data.meta.complexity]
 * @property {string} [data.meta.projectName]
 */

/**
 * @typedef {(event: WindsurfEvent) => void} EventHandler
 */

export class WindsurfEventBus {
  constructor() {
    /** @type {Map<EventType, EventHandler[]>} */
    this.subscribers = new Map();
    /** @type {EventHandler[]} */
    this.globalHandlers = [];
    /** @type {Set<(event: WindsurfEvent) => void>} */
    this.sseClients = new Set();
  }

  /**
   * Subscribe to a specific event type
   * @param {EventType} eventType
   * @param {EventHandler} handler
   * @returns {() => void}
   */
  on(eventType, handler) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType).push(handler);

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
   * @param {EventHandler} handler
   * @returns {() => void}
   */
  onAll(handler) {
    this.globalHandlers.push(handler);
    return () => {
      const index = this.globalHandlers.indexOf(handler);
      if (index > -1) this.globalHandlers.splice(index, 1);
    };
  }

  /**
   * Register SSE client for streaming
   * @param {(event: WindsurfEvent) => void} handler
   * @returns {() => void}
   */
  registerSSEClient(handler) {
    this.sseClients.add(handler);
    return () => this.sseClients.delete(handler);
  }

  /**
   * Emit an event to all subscribers and SSE clients
   * @param {WindsurfEvent} event
   */
  emit(event) {
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
   * @param {string} agent
   * @param {number} index
   * @param {number} total
   * @param {string} [description]
   */
  emitAgentStart(agent, index, total, description) {
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
   * @param {string} agent
   * @param {string} thinkingLine
   */
  emitAgentProgress(agent, thinkingLine) {
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
   * @param {string} agent
   * @param {Array<{path: string, content: string}>} [files]
   * @param {*} [meta]
   */
  emitAgentComplete(agent, files, meta) {
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
   * @param {string} agent
   * @param {string} error
   * @param {number} [retryCount]
   * @param {number} [maxRetries]
   */
  emitAgentError(agent, error, retryCount, maxRetries) {
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
   * @param {string} agent
   * @param {number} retryCount
   * @param {number} maxRetries
   */
  emitAgentRetry(agent, retryCount, maxRetries) {
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
   * @param {string} chunk
   * @param {string} [agent]
   */
  emitReplyChunk(chunk, agent) {
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
   * @param {Array<{path: string, content: string}>} files
   */
  emitFilesReady(files) {
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
   * @param {*} finalResult
   */
  emitPipelineComplete(finalResult) {
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
   * Transform Windsurf event to SSE format for client streaming
   * @param {WindsurfEvent} event
   * @returns {string}
   */
  toSSEFormat(event) {
    return `data: ${JSON.stringify(event)}\n\n`;
  }

  /**
   * Clear all subscribers
   */
  clear() {
    this.subscribers.clear();
    this.globalHandlers = [];
    this.sseClients.clear();
  }
}

// Singleton instance for global use
export const globalEventBus = new WindsurfEventBus();

export default WindsurfEventBus;
