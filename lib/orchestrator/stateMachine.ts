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
import type { AgentStatus, WindsurfEventBus } from './eventBus';

export interface AgentNode {
  name: string;
  status: AgentStatus;
  index: number;
  dependencies: string[];
  retryCount: number;
  maxRetries: number;
  parallelizable: boolean;
  description: string;
  execute: (context: ExecutionContext) => Promise<AgentResult>;
}

export interface AgentResult {
  success: boolean;
  files?: Array<{ path: string; content: string }>;
  reply?: string;
  meta?: any;
  error?: string;
}

export interface ExecutionContext {
  prompt: string;
  existingFiles?: Array<{ path: string; content: string }>;
  projectId?: string | null;
  mode?: 'build' | 'plan';
  results: Map<string, AgentResult>;
  abortSignal?: AbortSignal;
}

interface StateTransition {
  from: AgentStatus;
  to: AgentStatus;
  allowed: boolean;
}

const VALID_TRANSITIONS: StateTransition[] = [
  { from: 'idle', to: 'active', allowed: true },
  { from: 'idle', to: 'failed', allowed: false },
  { from: 'active', to: 'completed', allowed: true },
  { from: 'active', to: 'failed', allowed: true },
  { from: 'failed', to: 'retrying', allowed: true },
  { from: 'retrying', to: 'active', allowed: true },
  { from: 'retrying', to: 'failed', allowed: true },
  { from: 'completed', to: 'active', allowed: false }, // No restart after complete
];

export class AgentStateMachine extends EventEmitter {
  private agents: Map<string, AgentNode> = new Map();
  private eventBus: WindsurfEventBus;
  private executionOrder: string[] = [];
  private isRunning = false;

  constructor(eventBus: WindsurfEventBus) {
    super();
    this.eventBus = eventBus;
    this.initializeDefaultAgents();
  }

  /**
   * Initialize default agent configuration
   */
  private initializeDefaultAgents(): void {
    // Agent definitions with dependencies and parallelization
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
        parallelizable: true, // Can run parallel with UX Designer
        maxRetries: 2,
      },
      {
        name: 'UX Designer',
        description: 'Building design system',
        dependencies: ['Product Manager'],
        parallelizable: true, // Can run parallel with DBA
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
        parallelizable: true, // Can run parallel with QA
        maxRetries: 2,
      },
      {
        name: 'QA Reviewer',
        description: 'Code review',
        dependencies: ['Coder Agent'],
        parallelizable: true, // Can run parallel with Security
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
        execute: async () => ({ success: true }), // Placeholder, set by orchestrator
      });
    });

    this.calculateExecutionOrder();
  }

  /**
   * Calculate optimal execution order with parallelization
   */
  private calculateExecutionOrder(): void {
    const visited = new Set<string>();
    const order: string[] = [];

    const visit = (agentName: string) => {
      if (visited.has(agentName)) return;
      visited.add(agentName);

      const agent = this.agents.get(agentName);
      if (!agent) return;

      // Visit dependencies first
      agent.dependencies.forEach(dep => visit(dep));

      order.push(agentName);
    };

    this.agents.forEach((_, name) => visit(name));
    this.executionOrder = order;
  }

  /**
   * Get agents that can run in parallel at a given stage
   */
  getParallelAgents(stage: number): string[] {
    const agentName = this.executionOrder[stage];
    if (!agentName) return [];

    const agent = this.agents.get(agentName);
    if (!agent) return [];

    if (!agent.parallelizable) return [agentName];

    // Find other agents with same dependencies that are also parallelizable
    const parallelAgents: string[] = [agentName];
    
    for (let i = stage + 1; i < this.executionOrder.length; i++) {
      const otherName = this.executionOrder[i];
      const other = this.agents.get(otherName);
      
      if (
        other &&
        other.parallelizable &&
        this.arraysEqual(other.dependencies, agent.dependencies) &&
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
   */
  areDependenciesMet(agentName: string): boolean {
    const agent = this.agents.get(agentName);
    if (!agent) return false;

    return agent.dependencies.every(depName => {
      const dep = this.agents.get(depName);
      return dep?.status === 'completed';
    });
  }

  /**
   * Check if transition is valid
   */
  canTransition(agentName: string, newStatus: AgentStatus): boolean {
    const agent = this.agents.get(agentName);
    if (!agent) return false;

    const transition = VALID_TRANSITIONS.find(
      t => t.from === agent.status && t.to === newStatus
    );

    return transition?.allowed ?? false;
  }

  /**
   * Transition agent to new state
   */
  async transition(agentName: string, newStatus: AgentStatus, data?: any): Promise<boolean> {
    if (!this.canTransition(agentName, newStatus)) {
      console.warn(`[StateMachine] Invalid transition: ${agentName} cannot go from ${this.agents.get(agentName)?.status} to ${newStatus}`);
      return false;
    }

    const agent = this.agents.get(agentName);
    if (!agent) return false;

    const oldStatus = agent.status;
    agent.status = newStatus;

    // Emit state change event
    this.emit('stateChange', {
      agent: agentName,
      from: oldStatus,
      to: newStatus,
      index: agent.index,
      data,
    });

    // Emit to event bus for UI updates
    if (newStatus === 'active') {
      this.eventBus.emitAgentStart(
        agentName,
        agent.index,
        this.agents.size,
        agent.description
      );
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
   */
  async executeAgent(
    agentName: string,
    context: ExecutionContext,
    onProgress?: (thinkingLine: string) => void
  ): Promise<AgentResult> {
    const agent = this.agents.get(agentName);
    if (!agent) {
      return { success: false, error: `Agent ${agentName} not found` };
    }

    // Check dependencies
    if (!this.areDependenciesMet(agentName)) {
      return { 
        success: false, 
        error: `Dependencies not met for ${agentName}` 
      };
    }

    // Set to active
    await this.transition(agentName, 'active');

    try {
      // Execute with progress tracking
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

      // Check if we can retry
      if (agent.retryCount < agent.maxRetries) {
        agent.retryCount++;
        await this.transition(agentName, 'retrying', {
          error: errorMsg,
          retryCount: agent.retryCount,
        });

        // Wait before retry
        await this.delay(1000 * agent.retryCount);

        // Retry
        return this.executeAgent(agentName, context, onProgress);
      }

      // Max retries exceeded
      await this.transition(agentName, 'failed', { error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Execute agents in parallel
   */
  async executeParallel(
    agentNames: string[],
    context: ExecutionContext
  ): Promise<AgentResult[]> {
    const promises = agentNames.map(name => this.executeAgent(name, context));
    return Promise.all(promises);
  }

  /**
   * Run full pipeline
   */
  async runPipeline(
    context: ExecutionContext,
    onProgress?: (completed: number, total: number) => void
  ): Promise<Map<string, AgentResult>> {
    if (this.isRunning) {
      throw new Error('Pipeline already running');
    }

    this.isRunning = true;
    let completedCount = 0;
    const totalCount = this.agents.size;

    try {
      // Reset all agents
      this.agents.forEach(agent => {
        agent.status = 'idle';
        agent.retryCount = 0;
      });

      // Execute in order with parallelization
      let stage = 0;
      while (stage < this.executionOrder.length) {
        const parallelAgents = this.getParallelAgents(stage);

        // Execute parallel agents
        const results = await this.executeParallel(parallelAgents, context);

        // Check for failures
        const failures = results.filter(r => !r.success);
        if (failures.length > 0) {
          // Critical failure - abort pipeline
          throw new Error(
            `Pipeline failed: ${failures.map(f => f.error).join(', ')}`
          );
        }

        completedCount += parallelAgents.length;
        onProgress?.(completedCount, totalCount);

        // Move to next stage
        stage += parallelAgents.length;
      }

      return context.results;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Set custom execute function for an agent
   */
  setAgentExecutor(agentName: string, execute: (context: ExecutionContext) => Promise<AgentResult>): void {
    const agent = this.agents.get(agentName);
    if (agent) {
      agent.execute = execute;
    }
  }

  /**
   * Get current state of all agents
   */
  getAllStates(): Array<{ name: string; status: AgentStatus; index: number }> {
    return Array.from(this.agents.values()).map(agent => ({
      name: agent.name,
      status: agent.status,
      index: agent.index,
    }));
  }

  /**
   * Get agent by name
   */
  getAgent(name: string): AgentNode | undefined {
    return this.agents.get(name);
  }

  /**
   * Check if pipeline is running
   */
  get running(): boolean {
    return this.isRunning;
  }

  /**
   * Abort running pipeline
   */
  abort(): void {
    this.emit('abort');
    this.isRunning = false;
  }

  /**
   * Helper: delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Helper: compare arrays
   */
  private arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((val, i) => val === b[i]);
  }
}

export default AgentStateMachine;
