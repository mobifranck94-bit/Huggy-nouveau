/**
 * State Machine - Agent Orchestration
 * 
 * Gère les états des agents avec support pour:
 * - Dépendances entre agents
 * - Exécution parallèle
 * - Retry avec circuit breaker
 * - Fallback sur échec
 */

import { EventEmitter } from 'events';

/**
 * @typedef {'idle' | 'active' | 'completed' | 'failed' | 'retrying'} AgentStatus
 */

/**
 * @typedef {Object} AgentNode
 * @property {string} name
 * @property {AgentStatus} status
 * @property {number} index
 * @property {string[]} dependencies
 * @property {number} retryCount
 * @property {number} maxRetries
 * @property {boolean} parallelizable
 * @property {string} description
 * @property {(context: ExecutionContext) => Promise<AgentResult>} execute
 */

/**
 * @typedef {Object} AgentResult
 * @property {boolean} success
 * @property {Array<{path: string, content: string}>} [files]
 * @property {string} [reply]
 * @property {*} [meta]
 * @property {string} [error]
 */

/**
 * @typedef {Object} ExecutionContext
 * @property {string} prompt
 * @property {Array<{path: string, content: string}>} [existingFiles]
 * @property {string | null} [projectId]
 * @property {'build' | 'plan'} [mode]
 * @property {Map<string, AgentResult>} results
 * @property {AbortSignal} [abortSignal]
 */

const VALID_TRANSITIONS = [
  { from: 'idle', to: 'active', allowed: true },
  { from: 'idle', to: 'failed', allowed: false },
  { from: 'active', to: 'completed', allowed: true },
  { from: 'active', to: 'failed', allowed: true },
  { from: 'failed', to: 'retrying', allowed: true },
  { from: 'retrying', to: 'active', allowed: true },
  { from: 'retrying', to: 'failed', allowed: true },
  { from: 'completed', to: 'active', allowed: false },
];

export class AgentStateMachine extends EventEmitter {
  /**
   * @param {import('./eventBus.js').WindsurfEventBus} eventBus
   */
  constructor(eventBus) {
    super();
    /** @type {Map<string, AgentNode>} */
    this.agents = new Map();
    this.eventBus = eventBus;
    /** @type {string[]} */
    this.executionOrder = [];
    this.isRunning = false;
    this.initializeDefaultAgents();
  }

  /**
   * Initialize default agent configuration
   */
  initializeDefaultAgents() {
    const agentDefs = [
      {
        name: 'Web Research',
        description: 'Analyzing references and context',
        dependencies: [],
        parallelizable: false,
        maxRetries: 2,
      },
      {
        name: 'Product Manager',
        description: 'Drafting project plan',
        dependencies: ['Web Research'],
        parallelizable: false,
        maxRetries: 3,
      },
      {
        name: 'DBA Architect',
        description: 'Designing database schema',
        dependencies: ['Product Manager'],
        parallelizable: true,
        maxRetries: 2,
      },
      {
        name: 'UX Designer',
        description: 'Building design system',
        dependencies: ['Product Manager'],
        parallelizable: true,
        maxRetries: 2,
      },
      {
        name: 'Coder Agent',
        description: 'Writing code',
        dependencies: ['DBA Architect', 'UX Designer'],
        parallelizable: false,
        maxRetries: 3,
      },
      {
        name: 'Security Auditor',
        description: 'Auditing vulnerabilities',
        dependencies: ['Coder Agent'],
        parallelizable: true,
        maxRetries: 2,
      },
      {
        name: 'QA Reviewer',
        description: 'Code review',
        dependencies: ['Coder Agent'],
        parallelizable: true,
        maxRetries: 2,
      },
      {
        name: 'i18n Agent',
        description: 'Internationalization',
        dependencies: ['QA Reviewer', 'Security Auditor'],
        parallelizable: false,
        maxRetries: 2,
      },
    ];

    agentDefs.forEach((def, index) => {
      this.agents.set(def.name, {
        name: def.name,
        status: 'idle',
        index,
        dependencies: def.dependencies,
        retryCount: 0,
        maxRetries: def.maxRetries,
        parallelizable: def.parallelizable,
        description: def.description,
        execute: async () => ({ success: true }),
      });
    });

    this.calculateExecutionOrder();
  }

  /**
   * Calculate optimal execution order with parallelization
   */
  calculateExecutionOrder() {
    const visited = new Set();
    const order = [];

    const visit = (agentName) => {
      if (visited.has(agentName)) return;
      visited.add(agentName);

      const agent = this.agents.get(agentName);
      if (!agent) return;

      agent.dependencies.forEach(dep => visit(dep));
      order.push(agentName);
    };

    this.agents.forEach((_, name) => visit(name));
    this.executionOrder = order;
  }

  /**
   * Get agents that can run in parallel at a given stage
   * @param {number} stage
   * @returns {string[]}
   */
  getParallelAgents(stage) {
    const agentName = this.executionOrder[stage];
    if (!agentName) return [];

    const agent = this.agents.get(agentName);
    if (!agent) return [];

    if (!agent.parallelizable) return [agentName];

    const parallelAgents = [agentName];
    
    for (let i = stage + 1; i < this.executionOrder.length; i++) {
      const otherName = this.executionOrder[i];
      const other = this.agents.get(otherName);
      
      if (
        other &&
        other.parallelizable &&
        JSON.stringify(other.dependencies) === JSON.stringify(agent.dependencies) &&
        other.status === 'idle'
      ) {
        parallelAgents.push(otherName);
      } else {
        break;
      }
    }

    return parallelAgents;
  }

  /**
   * Check if all dependencies are completed for an agent
   * @param {string} agentName
   * @returns {boolean}
   */
  areDependenciesMet(agentName) {
    const agent = this.agents.get(agentName);
    if (!agent) return false;

    return agent.dependencies.every(depName => {
      const dep = this.agents.get(depName);
      return dep?.status === 'completed';
    });
  }

  /**
   * Check if transition is valid
   * @param {string} agentName
   * @param {AgentStatus} newStatus
   * @returns {boolean}
   */
  canTransition(agentName, newStatus) {
    const agent = this.agents.get(agentName);
    if (!agent) return false;

    const transition = VALID_TRANSITIONS.find(
      t => t.from === agent.status && t.to === newStatus
    );

    return transition?.allowed ?? false;
  }

  /**
   * Transition agent to new state
   * @param {string} agentName
   * @param {AgentStatus} newStatus
   * @param {*} [data]
   * @returns {Promise<boolean>}
   */
  async transition(agentName, newStatus, data) {
    if (!this.canTransition(agentName, newStatus)) {
      console.warn(`[StateMachine] Invalid transition: ${agentName} cannot go from ${this.agents.get(agentName)?.status} to ${newStatus}`);
      return false;
    }

    const agent = this.agents.get(agentName);
    if (!agent) return false;

    const oldStatus = agent.status;
    agent.status = newStatus;

    this.emit('stateChange', {
      agent: agentName,
      from: oldStatus,
      to: newStatus,
      index: agent.index,
      data,
    });

    if (newStatus === 'active') {
      this.eventBus.emitAgentStart(agentName, agent.index, this.agents.size, agent.description);
    } else if (newStatus === 'completed') {
      this.eventBus.emitAgentComplete(agentName, data?.files, data?.meta);
    } else if (newStatus === 'failed') {
      this.eventBus.emitAgentError(agentName, data?.error || 'Unknown error');
    } else if (newStatus === 'retrying') {
      this.eventBus.emitAgentRetry(agentName, agent.retryCount, agent.maxRetries);
    }

    return true;
  }

  /**
   * Execute an agent with retry logic
   * @param {string} agentName
   * @param {ExecutionContext} context
   * @param {(thinkingLine: string) => void} [onProgress]
   * @returns {Promise<AgentResult>}
   */
  async executeAgent(agentName, context, onProgress) {
    const agent = this.agents.get(agentName);
    if (!agent) {
      return { success: false, error: `Agent ${agentName} not found` };
    }

    if (!this.areDependenciesMet(agentName)) {
      return { 
        success: false, 
        error: `Dependencies not met for ${agentName}` 
      };
    }

    await this.transition(agentName, 'active');

    try {
      const result = await agent.execute(context);

      if (result.success) {
        await this.transition(agentName, 'completed', result);
        context.results.set(agentName, result);
        return result;
      } else {
        throw new Error(result.error || 'Agent execution failed');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      if (agent.retryCount < agent.maxRetries) {
        agent.retryCount++;
        await this.transition(agentName, 'retrying', {
          error: errorMsg,
          retryCount: agent.retryCount,
        });

        await this.delay(1000 * agent.retryCount);
        return this.executeAgent(agentName, context, onProgress);
      }

      await this.transition(agentName, 'failed', { error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Execute agents in parallel
   * @param {string[]} agentNames
   * @param {ExecutionContext} context
   * @returns {Promise<AgentResult[]>}
   */
  async executeParallel(agentNames, context) {
    const promises = agentNames.map(name => this.executeAgent(name, context));
    return Promise.all(promises);
  }

  /**
   * Run full pipeline
   * @param {ExecutionContext} context
   * @param {(completed: number, total: number) => void} [onProgress]
   * @returns {Promise<Map<string, AgentResult>>}
   */
  async runPipeline(context, onProgress) {
    if (this.isRunning) {
      throw new Error('Pipeline already running');
    }

    this.isRunning = true;
    let completedCount = 0;
    const totalCount = this.agents.size;

    try {
      this.agents.forEach(agent => {
        agent.status = 'idle';
        agent.retryCount = 0;
      });

      let stage = 0;
      while (stage < this.executionOrder.length) {
        const parallelAgents = this.getParallelAgents(stage);
        const results = await this.executeParallel(parallelAgents, context);

        const failures = results.filter(r => !r.success);
        if (failures.length > 0) {
          throw new Error(
            `Pipeline failed: ${failures.map(f => f.error).join(', ')}`
          );
        }

        completedCount += parallelAgents.length;
        onProgress?.(completedCount, totalCount);

        stage += parallelAgents.length;
      }

      return context.results;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Set custom execute function for an agent
   * @param {string} agentName
   * @param {(context: ExecutionContext) => Promise<AgentResult>} execute
   */
  setAgentExecutor(agentName, execute) {
    const agent = this.agents.get(agentName);
    if (agent) {
      agent.execute = execute;
    }
  }

  /**
   * Get current state of all agents
   * @returns {Array<{name: string, status: AgentStatus, index: number}>}
   */
  getAllStates() {
    return Array.from(this.agents.values()).map(agent => ({
      name: agent.name,
      status: agent.status,
      index: agent.index,
    }));
  }

  /**
   * Get agent by name
   * @param {string} name
   * @returns {AgentNode | undefined}
   */
  getAgent(name) {
    return this.agents.get(name);
  }

  /**
   * Check if pipeline is running
   * @returns {boolean}
   */
  get running() {
    return this.isRunning;
  }

  /**
   * Abort running pipeline
   */
  abort() {
    this.emit('abort');
    this.isRunning = false;
  }

  /**
   * Helper: delay
   * @param {number} ms
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default AgentStateMachine;
