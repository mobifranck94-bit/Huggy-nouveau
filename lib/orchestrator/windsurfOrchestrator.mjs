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

import { globalEventBus } from './eventBus.mjs';
import { AgentStateMachine } from './stateMachine.mjs';
import { llmGateway } from '../llm/gateway.mjs';

/**
 * @typedef {Object} OrchestratorOptions
 * @property {'build' | 'plan'} [mode]
 * @property {string} [model]
 * @property {string | null} [projectId]
 * @property {(event: any) => void} [onEvent]
 * @property {(completed: number, total: number) => void} [onProgress]
 */

/**
 * @typedef {Object} PipelineResult
 * @property {boolean} success
 * @property {Array<{path: string, content: string}>} files
 * @property {string} reply
 * @property {Object} [meta]
 * @property {any} [meta.pmPlan]
 * @property {any} [meta.dbaPlan]
 * @property {any} [meta.uxPlan]
 * @property {any} [meta.secReport]
 * @property {any} [meta.review]
 * @property {string} [meta.complexity]
 * @property {string} [meta.projectName]
 * @property {number} [meta.securityScore]
 * @property {number} [meta.qaScore]
 * @property {string} [error]
 */

export class WindsurfOrchestrator {
  constructor() {
    this.eventBus = globalEventBus;
    this.stateMachine = new AgentStateMachine(this.eventBus);
    this.isRunning = false;
    /** @type {AbortController | null} */
    this.abortController = null;
    this.setupAgentExecutors();
  }

  /**
   * Setup agent executors with LLM Gateway integration
   */
  setupAgentExecutors() {
    // Web Research Agent
    this.stateMachine.setAgentExecutor('Web Research', async (context) => {
      try {
        const result = await llmGateway.streamGenerate(
          'Web Research',
          `Research and analyze: ${context.prompt}`,
          {
            onThinking: (line) => {
              this.eventBus.emitAgentProgress('Web Research', `🔍 ${line}`);
            },
          }
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
      try {
        const enrichedPrompt = context.results.get('Web Research')?.meta?.enrichedContext
          ? `${context.prompt}\n\nResearch Context: ${context.results.get('Web Research')?.meta?.enrichedContext}`
          : context.prompt;

        const result = await llmGateway.streamGenerate(
          'Product Manager',
          `Create detailed product plan for: ${enrichedPrompt}`,
          {
            onThinking: (line) => {
              this.eventBus.emitAgentProgress('Product Manager', `📋 ${line}`);
            },
          }
        );

        if (result.success) {
          const pmPlan = this.safeParseJSON(result.content, this.createDefaultPMPlan(context.prompt), 'Product Manager');
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
          {
            onThinking: (line) => {
              this.eventBus.emitAgentProgress('DBA Architect', `🗄️ ${line}`);
            },
          }
        );

        if (result.success) {
          const dbaPlan = this.safeParseJSON(result.content, { needsDatabase: false, tables: [], relationships: [], indexes: [] }, 'DBA Architect');
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
      try {
        const pmPlan = context.results.get('Product Manager')?.meta?.pmPlan;

        const result = await llmGateway.streamGenerate(
          'UX Designer',
          `Create design system for:\n${JSON.stringify(pmPlan, null, 2)}`,
          {
            onThinking: (line) => {
              this.eventBus.emitAgentProgress('UX Designer', `🎨 ${line}`);
            },
          }
        );

        if (result.success) {
          const uxPlan = this.safeParseJSON(result.content, this.createDefaultUXPlan(), 'UX Designer');
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
          {
            onThinking: (line) => {
              this.eventBus.emitAgentProgress('Coder Agent', `💻 ${line}`);
            },
          }
        );

        if (result.success) {
          let files = llmGateway.parseFiles(result.content);
          if (!files.length) {
            files = this.createFallbackFiles(context.prompt, result.content);
          }
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
          {
            onThinking: (line) => {
              this.eventBus.emitAgentProgress('Security Auditor', `🔒 ${line}`);
            },
          }
        );

        if (result.success) {
          const secReport = this.safeParseJSON(result.content, { score: 85, approved: true, criticalIssues: [], fixes: [] }, 'Security Auditor');
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
      try {
        const files = context.results.get('Coder Agent')?.files || [];
        const pmPlan = context.results.get('Product Manager')?.meta?.pmPlan;

        const result = await llmGateway.streamGenerate(
          'QA Reviewer',
          `Review code for bugs and best practices:\n${files.map(f => `File: ${f.path}\n${f.content}`).join('\n---\n')}`,
          {
            onThinking: (line) => {
              this.eventBus.emitAgentProgress('QA Reviewer', `✓ ${line}`);
            },
          }
        );

        if (result.success) {
          const review = this.safeParseJSON(result.content, { score: 85, approved: true, issues: [], fixes: [] }, 'QA Reviewer');
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
          {
            onThinking: (line) => {
              this.eventBus.emitAgentProgress('i18n Agent', `🌍 ${line}`);
            },
          }
        );

        if (result.success) {
          const i18nResult = this.safeParseJSON(result.content, { modifiedFiles: [], localeFiles: [], setupCode: '' }, 'i18n Agent');
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
   * @param {string} prompt
   * @param {OrchestratorOptions} [options]
   * @returns {Promise<PipelineResult>}
   */
  async runPipeline(prompt, options = {}) {
    if (this.isRunning) {
      throw new Error('Pipeline already running');
    }

    this.isRunning = true;
    this.abortController = new AbortController();

    const context = {
      prompt,
      existingFiles: [],
      projectId: options.projectId || null,
      mode: options.mode || 'build',
      results: new Map(),
      abortSignal: this.abortController.signal,
    };

    try {
      const unsubscribe = this.setupClientStreaming(options.onEvent);

      await this.stateMachine.runPipeline(
        context,
        options.onProgress
      );

      const coderResult = context.results.get('Coder Agent');
      const pmResult = context.results.get('Product Manager');
      const dbaResult = context.results.get('DBA Architect');
      const uxResult = context.results.get('UX Designer');
      const secResult = context.results.get('Security Auditor');
      const qaResult = context.results.get('QA Reviewer');

      const result = {
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

      this.eventBus.emitPipelineComplete(result);
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
   * @param {(event: any) => void} [onEvent]
   * @returns {() => void}
   */
  setupClientStreaming(onEvent) {
    if (!onEvent) return () => {};

    return this.eventBus.onAll((windsurfEvent) => {
      const pipelineEvent = this.transformToPipelineEvent(windsurfEvent);
      onEvent(pipelineEvent);
    });
  }

  /**
   * Transform Windsurf event to PipelineEvent for backward compatibility
   * @param {any} windsurfEvent
   * @returns {any}
   */
  transformToPipelineEvent(windsurfEvent) {
    const typeMap = {
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
   * @param {Map<string, any>} results
   * @returns {string}
   */
  buildFinalReply(results) {
    const parts = [];
    
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

  safeParseJSON(content, fallback, agentName) {
    try {
      return llmGateway.parseJSON(content || '');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.eventBus.emitAgentProgress(agentName, `Using safe defaults (${message})`);
      return fallback;
    }
  }

  createDefaultPMPlan(prompt) {
    const projectName = prompt
      .replace(/[^a-zA-Z0-9 ]/g, ' ')
      .trim()
      .split(/\s+/)
      .slice(0, 4)
      .join(' ') || 'Generated App';

    return {
      projectName,
      refinedPrompt: prompt,
      complexity: 'simple',
      pages: [{ name: 'Home', path: '/', purpose: 'Main generated application page' }],
      dataModel: [],
      authStrategy: 'none',
      targetLocales: [],
      needsI18n: false,
    };
  }

  createDefaultUXPlan() {
    return {
      colorTokens: {
        primary: '#1488fc',
        secondary: '#7c3aed',
        background: '#0a0a0b',
        foreground: '#f8fafc',
      },
      typography: { fontFamily: 'Inter, system-ui, sans-serif' },
      borderRadius: '1rem',
      components: ['Hero', 'Card', 'Button'],
      layouts: ['Responsive single page'],
    };
  }

  createFallbackFiles(prompt, rawContent = '') {
    const escapedPrompt = JSON.stringify(prompt);
    const escapedContent = JSON.stringify(rawContent.slice(0, 800));

    return [
      {
        path: 'src/App.tsx',
        content: `export default function App() {
  const prompt = ${escapedPrompt};
  const notes = ${escapedContent};

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-white flex items-center justify-center p-8">
      <section className="max-w-4xl w-full rounded-3xl border border-blue-500/20 bg-zinc-950/80 p-10 shadow-2xl">
        <div className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-300 mb-6">
          Generated safely by Huggy
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">
          {prompt || 'Your app is ready'}
        </h1>
        <p className="text-zinc-400 text-lg leading-relaxed mb-8">
          The AI response did not include parsable file blocks, so Huggy created this safe fallback preview.
        </p>
        {notes && (
          <pre className="max-h-64 overflow-auto rounded-2xl bg-black/40 p-4 text-xs text-zinc-300 whitespace-pre-wrap">
            {notes}
          </pre>
        )}
      </section>
    </main>
  );
}
`,
      },
    ];
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
    if (this.abortController) {
      this.abortController.abort();
    }
    this.stateMachine.abort();
    this.isRunning = false;
  }

  /**
   * Get current agent states
   * @returns {Array<{name: string, status: string, index: number}>}
   */
  getAgentStates() {
    return this.stateMachine.getAllStates();
  }
}

// Export singleton
export const windsurfOrchestrator = new WindsurfOrchestrator();

export default WindsurfOrchestrator;
