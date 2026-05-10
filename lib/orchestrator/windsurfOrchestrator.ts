/**
 * Windsurf Orchestrator
 * 
 * Orchestrateur principal qui combine:
 * - Event Bus pour streaming UI style Windsurf
 * - State Machine pour gestion agents
 * - LLM Gateway pour génération IA
 * 
 * Préserve exactement le style visuel Windsurf existant
 * tout en ajoutant la robustesse de l'architecture Lovable.
 */

import { WindsurfEventBus, globalEventBus } from './eventBus';
import { AgentStateMachine, type ExecutionContext, type AgentResult } from './stateMachine';
import { llmGateway, type StreamCallbacks } from '../llm/gateway';
import type { PipelineEvent } from '../../src/lib/api';

// Agent imports (à adapter selon ton projet)
// import { runWebResearchAgent } from '../../agents/webResearchAgent.mjs';
// import { runPMAgent } from '../../agents/pmAgent.mjs';
// etc.

export interface OrchestratorOptions {
  mode?: 'build' | 'plan';
  model?: string;
  projectId?: string | null;
  onEvent?: (event: PipelineEvent) => void;
  onProgress?: (completed: number, total: number) => void;
}

export interface PipelineResult {
  success: boolean;
  files: Array<{ path: string; content: string }>;
  reply: string;
  meta?: {
    pmPlan?: any;
    dbaPlan?: any;
    uxPlan?: any;
    secReport?: any;
    review?: any;
    complexity?: string;
    projectName?: string;
    securityScore?: number;
    qaScore?: number;
  };
  error?: string;
}

export class WindsurfOrchestrator {
  private eventBus: WindsurfEventBus;
  private stateMachine: AgentStateMachine;
  private isRunning = false;
  private abortController: AbortController | null = null;

  constructor() {
    this.eventBus = globalEventBus;
    this.stateMachine = new AgentStateMachine(this.eventBus);
    this.setupAgentExecutors();
  }

  /**
   * Setup agent executors with LLM Gateway integration
   */
  private setupAgentExecutors(): void {
    // Web Research Agent
    this.stateMachine.setAgentExecutor('Web Research', async (context) => {
      const callbacks: StreamCallbacks = {
        onThinking: (line) => {
          this.eventBus.emitAgentProgress('Web Research', `🔍 ${line}`);
        },
        onChunk: (chunk) => {
          // Web research doesn't stream main output, just thinking
        },
      };

      try {
        const result = await llmGateway.streamGenerate(
          'Web Research',
          `Research and analyze: ${context.prompt}`,
          callbacks
        );

        if (result.success) {
          return {
            success: true,
            reply: result.content,
            meta: { enrichedContext: result.content },
          };
        }
        return { success: false, error: result.error };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        };
      }
    });

    // Product Manager Agent
    this.stateMachine.setAgentExecutor('Product Manager', async (context) => {
      const callbacks: StreamCallbacks = {
        onThinking: (line) => {
          this.eventBus.emitAgentProgress('Product Manager', `📋 ${line}`);
        },
        onChunk: (chunk) => {
          // Product manager outputs structured JSON
        },
      };

      try {
        const enrichedPrompt = context.results.get('Web Research')?.meta?.enrichedContext
          ? `${context.prompt}\n\nResearch Context: ${context.results.get('Web Research')?.meta?.enrichedContext}`
          : context.prompt;

        const result = await llmGateway.streamGenerate(
          'Product Manager',
          `Create detailed product plan for: ${enrichedPrompt}`,
          callbacks
        );

        if (result.success) {
          const pmPlan = llmGateway.parseJSON(result.content);
          return {
            success: true,
            reply: result.content,
            meta: { pmPlan },
          };
        }
        return { success: false, error: result.error };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        };
      }
    });

    // DBA Architect Agent (parallelizable)
    this.stateMachine.setAgentExecutor('DBA Architect', async (context) => {
      const callbacks: StreamCallbacks = {
        onThinking: (line) => {
          this.eventBus.emitAgentProgress('DBA Architect', `🗄️ ${line}`);
        },
      };

      try {
        const pmPlan = context.results.get('Product Manager')?.meta?.pmPlan;
        const hasDataLayer = pmPlan?.dataModel?.length > 0 || pmPlan?.authStrategy !== 'none';

        if (!hasDataLayer) {
          return {
            success: true,
            reply: 'No database needed for this project',
            meta: { needsDatabase: false, tables: [] },
          };
        }

        const result = await llmGateway.streamGenerate(
          'DBA Architect',
          `Design database schema for:\n${JSON.stringify(pmPlan, null, 2)}`,
          callbacks
        );

        if (result.success) {
          const dbaPlan = llmGateway.parseJSON(result.content);
          return {
            success: true,
            reply: result.content,
            meta: { dbaPlan },
          };
        }
        return { success: false, error: result.error };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        };
      }
    });

    // UX Designer Agent (parallelizable)
    this.stateMachine.setAgentExecutor('UX Designer', async (context) => {
      const callbacks: StreamCallbacks = {
        onThinking: (line) => {
          this.eventBus.emitAgentProgress('UX Designer', `🎨 ${line}`);
        },
      };

      try {
        const pmPlan = context.results.get('Product Manager')?.meta?.pmPlan;

        const result = await llmGateway.streamGenerate(
          'UX Designer',
          `Create design system for:\n${JSON.stringify(pmPlan, null, 2)}`,
          callbacks
        );

        if (result.success) {
          const uxPlan = llmGateway.parseJSON(result.content);
          return {
            success: true,
            reply: result.content,
            meta: { uxPlan },
          };
        }
        return { success: false, error: result.error };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        };
      }
    });

    // Coder Agent
    this.stateMachine.setAgentExecutor('Coder Agent', async (context) => {
      const callbacks: StreamCallbacks = {
        onThinking: (line) => {
          this.eventBus.emitAgentProgress('Coder Agent', `💻 ${line}`);
        },
        onChunk: (chunk) => {
          // Coder streams file content
        },
      };

      try {
        const pmPlan = context.results.get('Product Manager')?.meta?.pmPlan;
        const dbaPlan = context.results.get('DBA Architect')?.meta?.dbaPlan;
        const uxPlan = context.results.get('UX Designer')?.meta?.uxPlan;

        const designSystem = {
          colors: uxPlan?.colorTokens,
          typography: uxPlan?.typography,
          radius: uxPlan?.borderRadius,
          components: uxPlan?.components,
        };

        const fullPrompt = `
${pmPlan?.refinedPrompt || context.prompt}

# DESIGN SYSTEM
${JSON.stringify(designSystem, null, 2)}

${dbaPlan?.needsDatabase ? `# DATABASE CLIENT\n${dbaPlan?.supabaseClientCode}` : ''}

Generate React/TypeScript files with Tailwind CSS.
Output format: \`\`\`file:path\ncontent\`\`\`
`;

        const result = await llmGateway.streamGenerate(
          'Coder Agent',
          fullPrompt,
          callbacks
        );

        if (result.success) {
          const files = llmGateway.parseFiles(result.content);
          return {
            success: true,
            reply: result.content,
            files,
            meta: { fileCount: files.length },
          };
        }
        return { success: false, error: result.error };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        };
      }
    });

    // Security Auditor Agent
    this.stateMachine.setAgentExecutor('Security Auditor', async (context) => {
      const callbacks: StreamCallbacks = {
        onThinking: (line) => {
          this.eventBus.emitAgentProgress('Security Auditor', `🔒 ${line}`);
        },
      };

      try {
        const files = context.results.get('Coder Agent')?.files || [];
        const pmPlan = context.results.get('Product Manager')?.meta?.pmPlan;
        
        const isSimple = pmPlan?.complexity === 'simple' && !pmPlan?.dataModel?.length;
        
        if (isSimple) {
          return {
            success: true,
            reply: 'Auto-approved: simple static app',
            meta: { 
              score: 95, 
              approved: true, 
              criticalIssues: [],
            },
          };
        }

        const result = await llmGateway.streamGenerate(
          'Security Auditor',
          `Audit code for vulnerabilities:\n${files.map(f => `File: ${f.path}\n${f.content}`).join('\n---\n')}`,
          callbacks
        );

        if (result.success) {
          const secReport = llmGateway.parseJSON(result.content);
          
          // Auto-apply fixes if not approved
          if (!secReport.approved && secReport.fixes) {
            // Apply fixes logic here
          }

          return {
            success: true,
            reply: result.content,
            meta: { secReport },
          };
        }
        return { success: false, error: result.error };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        };
      }
    });

    // QA Reviewer Agent
    this.stateMachine.setAgentExecutor('QA Reviewer', async (context) => {
      const callbacks: StreamCallbacks = {
        onThinking: (line) => {
          this.eventBus.emitAgentProgress('QA Reviewer', `✓ ${line}`);
        },
      };

      try {
        const files = context.results.get('Coder Agent')?.files || [];
        const pmPlan = context.results.get('Product Manager')?.meta?.pmPlan;

        const result = await llmGateway.streamGenerate(
          'QA Reviewer',
          `Review code for bugs and best practices:\n${files.map(f => `File: ${f.path}\n${f.content}`).join('\n---\n')}`,
          callbacks
        );

        if (result.success) {
          const review = llmGateway.parseJSON(result.content);

          // Auto-apply fixes if not approved
          if (!review.approved && review.fixes) {
            // Apply fixes logic here
          }

          return {
            success: true,
            reply: result.content,
            meta: { review },
          };
        }
        return { success: false, error: result.error };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        };
      }
    });

    // i18n Agent (conditional)
    this.stateMachine.setAgentExecutor('i18n Agent', async (context) => {
      const callbacks: StreamCallbacks = {
        onThinking: (line) => {
          this.eventBus.emitAgentProgress('i18n Agent', `🌍 ${line}`);
        },
      };

      try {
        const pmPlan = context.results.get('Product Manager')?.meta?.pmPlan;
        const files = context.results.get('Coder Agent')?.files || [];

        if (!pmPlan?.needsI18n || !pmPlan?.targetLocales?.length) {
          return {
            success: true,
            reply: 'i18n not needed',
            meta: { skipped: true },
          };
        }

        const result = await llmGateway.streamGenerate(
          'i18n Agent',
          `Add i18n support for ${pmPlan.targetLocales.join(', ')}:\n${files.map(f => `File: ${f.path}\n${f.content}`).join('\n---\n')}`,
          callbacks
        );

        if (result.success) {
          const i18nResult = llmGateway.parseJSON(result.content);
          return {
            success: true,
            reply: result.content,
            meta: { i18nResult },
          };
        }
        return { success: false, error: result.error };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        };
      }
    });
  }

  /**
   * Run full pipeline with Windsurf-style streaming
   */
  async runPipeline(
    prompt: string,
    options: OrchestratorOptions = {}
  ): Promise<PipelineResult> {
    if (this.isRunning) {
      throw new Error('Pipeline already running');
    }

    this.isRunning = true;
    this.abortController = new AbortController();

    const context: ExecutionContext = {
      prompt,
      existingFiles: [], // Can be populated from options
      projectId: options.projectId || null,
      mode: options.mode || 'build',
      results: new Map(),
      abortSignal: this.abortController.signal,
    };

    try {
      // Setup SSE streaming to client
      const unsubscribe = this.setupClientStreaming(options.onEvent);

      // Run pipeline
      await this.stateMachine.runPipeline(
        context,
        options.onProgress
      );

      // Collect final results
      const coderResult = context.results.get('Coder Agent');
      const pmResult = context.results.get('Product Manager');
      const dbaResult = context.results.get('DBA Architect');
      const uxResult = context.results.get('UX Designer');
      const secResult = context.results.get('Security Auditor');
      const qaResult = context.results.get('QA Reviewer');

      const result: PipelineResult = {
        success: true,
        files: coderResult?.files || [],
        reply: this.buildFinalReply(context.results),
        meta: {
          pmPlan: pmResult?.meta?.pmPlan,
          dbaPlan: dbaResult?.meta?.dbaPlan,
          uxPlan: uxResult?.meta?.uxPlan,
          secReport: secResult?.meta?.secReport,
          review: qaResult?.meta?.review,
          complexity: pmResult?.meta?.pmPlan?.complexity,
          projectName: pmResult?.meta?.pmPlan?.projectName,
          securityScore: secResult?.meta?.secReport?.score,
          qaScore: qaResult?.meta?.review?.score,
        },
      };

      // Emit completion
      this.eventBus.emitPipelineComplete(result);

      // Cleanup
      unsubscribe();
      this.isRunning = false;

      return result;

    } catch (error) {
      this.isRunning = false;
      
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.eventBus.emit({
        type: 'agent.error',
        timestamp: Date.now(),
        data: { error: errorMsg },
      });

      return {
        success: false,
        files: [],
        reply: `Pipeline failed: ${errorMsg}`,
        error: errorMsg,
      };
    }
  }

  /**
   * Setup streaming to client via SSE
   */
  private setupClientStreaming(onEvent?: (event: PipelineEvent) => void): () => void {
    if (!onEvent) return () => {};

    return this.eventBus.onAll((windsurfEvent) => {
      // Transform Windsurf event to PipelineEvent (existing format)
      const pipelineEvent = this.transformToPipelineEvent(windsurfEvent);
      onEvent(pipelineEvent);
    });
  }

  /**
   * Transform Windsurf event to PipelineEvent for backward compatibility
   */
  private transformToPipelineEvent(windsurfEvent: any): PipelineEvent {
    const typeMap: Record<string, string> = {
      'agent.start': 'agent',
      'agent.complete': 'agent',
      'agent.error': 'error',
      'thinking': 'thinking',
      'reply.chunk': 'reply',
      'files.ready': 'complete',
      'pipeline.complete': 'complete',
    };

    return {
      type: typeMap[windsurfEvent.type] || windsurfEvent.type,
      agent: windsurfEvent.agent,
      status: windsurfEvent.data?.agentStatus,
      index: windsurfEvent.data?.agentIndex,
      total: windsurfEvent.data?.totalAgents,
      description: windsurfEvent.data?.description,
      message: windsurfEvent.data?.error,
      files: windsurfEvent.data?.files,
      reply: windsurfEvent.data?.replyChunk || windsurfEvent.data?.fullReply,
      meta: windsurfEvent.data?.meta,
    };
  }

  /**
   * Build final reply message
   */
  private buildFinalReply(results: Map<string, AgentResult>): string {
    const parts: string[] = [];
    
    const pm = results.get('Product Manager');
    const sec = results.get('Security Auditor');
    const qa = results.get('QA Reviewer');

    if (pm?.meta?.pmPlan) {
      parts.push(`✅ Project "${pm.meta.pmPlan.projectName}" completed successfully!\n`);
    }

    if (sec?.meta?.secReport) {
      parts.push(`🔒 Security Score: ${sec.meta.secReport.score}/100`);
    }

    if (qa?.meta?.review) {
      parts.push(`✓ QA Score: ${qa.meta.review.score}/100\n`);
    }

    parts.push('Your application is ready for preview and deployment! 🚀');

    return parts.join('\n');
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
    if (this.abortController) {
      this.abortController.abort();
    }
    this.stateMachine.abort();
    this.isRunning = false;
  }

  /**
   * Get current agent states
   */
  getAgentStates(): Array<{ name: string; status: string; index: number }> {
    return this.stateMachine.getAllStates();
  }
}

// Export singleton
export const windsurfOrchestrator = new WindsurfOrchestrator();

export default WindsurfOrchestrator;
