// ─── Pipeline SSE API Client ─────────────────────────────────────────────────
// Connects to the Express backend and streams real-time agent progress events.

// ═══════════════════════════════════════════════════════════════════════════
// NEW: Advanced Streaming Types (Phase 1 of refactor)
// ═══════════════════════════════════════════════════════════════════════════

/** Pipeline phases - detailed breakdown of the build process */
export type PipelinePhase =
  | 'initializing'      // Setup/connection
  | 'understanding'     // Analyzing user prompt
  | 'exploring'         // Exploring codebase/context
  | 'researching'       // Web research (conditional)
  | 'planning'          // Product planning
  | 'architecting'      // System design (parallel: UX + DBA)
  | 'thinking'          // AI reasoning about approach
  | 'coding'            // Code generation
  | 'installing'        // Dependency installation
  | 'building'          // Compilation/build
  | 'testing'           // QA/testing
  | 'reviewing'         // Security audit
  | 'repairing'          // Error fixing (conditional)
  | 'optimizing'        // Performance optimization (conditional)
  | 'finalizing'        // Final touches
  | 'done'              // Complete
  | 'error';            // Error state

/** Tool kinds - granular actions performed by agents */
export type ToolKind =
  | 'read'              // 📖 Reading files
  | 'write'             // 📝 Writing new files
  | 'edit'              // ✏️  Editing existing files
  | 'create'            // ➕ Creating resources
  | 'delete'            // 🗑️  Deleting files
  | 'search'            // 🔍 Searching codebase
  | 'index'             // 📚 Indexing project
  | 'analyze'           // 🧠 Analyzing code
  | 'bundle'            // 📦 Bundling/Building
  | 'install'           // 📥 Installing dependencies
  | 'test'              // 🧪 Running tests
  | 'lint'              // 🔎 Linting code
  | 'format'            // ✨ Formatting code
  | 'deploy'            // 🚀 Deploying
  | 'touch'             // 👆 Touching/accessing files
  | 'explore'           // 🔎 Exploring structure
  | 'query'             // ❓ Asking clarifying questions
  | 'web_search'        // 🌐 Web research
  | 'api_call'          // 🔌 API integration
  | 'scan'              // 🔒 Security scanning
  | 'fix'               // 🔧 Fixing issues
  | 'design'            // 🎨 Designing UI
  | 'model'             // 🗄️  Database modeling
  | 'error';            // ⚠️  Error occurred

export type ToolStatus = 'pending' | 'active' | 'completed' | 'error';

/** Agent definition in the pipeline */
export interface AgentDefinition {
  id: string;
  name: string;
  icon: string;       // Lucide icon name
  color: string;      // Tailwind color name
  phases: PipelinePhase[];
  conditional?: boolean;  // Only runs if needed
  description: string;
  tools: ToolKind[];  // Tools this agent typically uses
}

/** AGENTS_PIPELINE - Complete agent orchestration definition */
export const AGENTS_PIPELINE: AgentDefinition[] = [
  {
    id: 'intent',
    name: 'Intent Parser',
    icon: 'Target',
    color: 'violet',
    phases: ['understanding', 'exploring'],
    description: 'Analyzing your request',
    tools: ['explore', 'read', 'analyze', 'index'],
  },
  {
    id: 'research',
    name: 'Research Agent',
    icon: 'Search',
    color: 'cyan',
    phases: ['researching'],
    conditional: true,
    description: 'Gathering external knowledge',
    tools: ['web_search', 'read', 'analyze'],
  },
  {
    id: 'planner',
    name: 'Product Manager',
    icon: 'ClipboardList',
    color: 'purple',
    phases: ['planning'],
    description: 'Defining requirements',
    tools: ['analyze', 'create', 'query'],
  },
  {
    id: 'architect',
    name: 'System Architect',
    icon: 'Layout',
    color: 'indigo',
    phases: ['architecting'],
    description: 'Designing system structure',
    tools: ['analyze', 'design', 'model'],
  },
  {
    id: 'designer',
    name: 'UX Designer',
    icon: 'Palette',
    color: 'pink',
    phases: ['architecting'],
    conditional: true,
    description: 'Creating design system',
    tools: ['design', 'create'],
  },
  {
    id: 'dba',
    name: 'DBA Architect',
    icon: 'Database',
    color: 'blue',
    phases: ['architecting'],
    conditional: true,
    description: 'Designing database schema',
    tools: ['analyze', 'model', 'create'],
  },
  {
    id: 'coder',
    name: 'Builder Agent',
    icon: 'Code2',
    color: 'accent',
    phases: ['thinking', 'coding'],
    description: 'Building your application',
    tools: ['analyze', 'search', 'write', 'edit', 'create', 'touch'],
  },
  {
    id: 'security',
    name: 'Security Auditor',
    icon: 'Shield',
    color: 'amber',
    phases: ['reviewing'],
    description: 'Auditing security',
    tools: ['scan', 'analyze', 'read'],
  },
  {
    id: 'reviewer',
    name: 'QA Reviewer',
    icon: 'CheckCircle',
    color: 'green',
    phases: ['testing'],
    description: 'Quality assurance',
    tools: ['test', 'lint', 'analyze', 'read'],
  },
  {
    id: 'repair',
    name: 'Repair Agent',
    icon: 'Wrench',
    color: 'orange',
    phases: ['repairing', 'optimizing'],
    conditional: true,
    description: 'Fixing and optimizing',
    tools: ['read', 'edit', 'fix', 'analyze'],
  },
];

/** Phase configuration - UI mapping for each phase */
export interface PhaseConfig {
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

export const PHASE_CONFIG: Record<PipelinePhase, PhaseConfig> = {
  initializing: {
    label: 'Initializing',
    shortLabel: 'Init',
    icon: 'Loader2',
    color: 'text-zinc-300',
    bgColor: 'bg-zinc-500/10',
    borderColor: 'border-zinc-500/25',
    description: 'Setting up environment',
  },
  understanding: {
    label: 'Understanding',
    shortLabel: 'Understand',
    icon: 'Target',
    color: 'text-violet-300',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/25',
    description: 'Analyzing your request',
  },
  exploring: {
    label: 'Exploring',
    shortLabel: 'Explore',
    icon: 'Compass',
    color: 'text-violet-300',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/25',
    description: 'Exploring context',
  },
  researching: {
    label: 'Researching',
    shortLabel: 'Research',
    icon: 'Search',
    color: 'text-cyan-300',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/25',
    description: 'Gathering knowledge',
  },
  planning: {
    label: 'Planning',
    shortLabel: 'Plan',
    icon: 'ClipboardList',
    color: 'text-purple-300',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/25',
    description: 'Creating plan',
  },
  architecting: {
    label: 'Architecting',
    shortLabel: 'Design',
    icon: 'Layout',
    color: 'text-indigo-300',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/25',
    description: 'Designing system',
  },
  thinking: {
    label: 'Thinking',
    shortLabel: 'Think',
    icon: 'Brain',
    color: 'text-blue-300',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/25',
    description: 'Considering approach',
  },
  coding: {
    label: 'Coding',
    shortLabel: 'Code',
    icon: 'Code2',
    color: 'text-accent',
    bgColor: 'bg-accent/10',
    borderColor: 'border-accent/30',
    description: 'Building application',
  },
  installing: {
    label: 'Installing',
    shortLabel: 'Install',
    icon: 'Download',
    color: 'text-cyan-300',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/25',
    description: 'Installing dependencies',
  },
  building: {
    label: 'Building',
    shortLabel: 'Build',
    icon: 'Package',
    color: 'text-cyan-300',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/25',
    description: 'Compiling',
  },
  testing: {
    label: 'Testing',
    shortLabel: 'Test',
    icon: 'FlaskConical',
    color: 'text-green-300',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/25',
    description: 'Running tests',
  },
  reviewing: {
    label: 'Reviewing',
    shortLabel: 'Review',
    icon: 'Shield',
    color: 'text-amber-300',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/25',
    description: 'Security audit',
  },
  repairing: {
    label: 'Repairing',
    shortLabel: 'Fix',
    icon: 'Wrench',
    color: 'text-orange-300',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/25',
    description: 'Fixing issues',
  },
  optimizing: {
    label: 'Optimizing',
    shortLabel: 'Optimize',
    icon: 'Zap',
    color: 'text-orange-300',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/25',
    description: 'Optimizing code',
  },
  finalizing: {
    label: 'Finalizing',
    shortLabel: 'Finalize',
    icon: 'Sparkles',
    color: 'text-emerald-300',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/25',
    description: 'Final touches',
  },
  done: {
    label: 'Done',
    shortLabel: 'Done',
    icon: 'CheckCircle2',
    color: 'text-green-300',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/25',
    description: 'Complete',
  },
  error: {
    label: 'Error',
    shortLabel: 'Error',
    icon: 'AlertCircle',
    color: 'text-red-300',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/25',
    description: 'Something went wrong',
  },
};

/** Map phase to active agent(s) */
export function getAgentsForPhase(phase: PipelinePhase): string[] {
  return AGENTS_PIPELINE
    .filter(agent => agent.phases.includes(phase))
    .map(agent => agent.name);
}

/** Get default phase for agent */
export function getDefaultPhaseForAgent(agentName: string): PipelinePhase {
  const agent = AGENTS_PIPELINE.find(a => a.name === agentName);
  return agent?.phases[0] || 'thinking';
}

// ═══════════════════════════════════════════════════════════════════════════
// Original Types
// ═══════════════════════════════════════════════════════════════════════════

export type AgentMode = 'code' | 'discussion' | 'question';
export type TodoStatus = 'pending' | 'in_progress' | 'done';

export interface TodoStepPayload {
  id: string;
  label: string;
  status?: TodoStatus;
}

export interface ActionLogPayload {
  id: string;
  tool: string;
  action: string;
  why?: string;
  next?: string;
}

export interface PipelineEvent {
  type?:
    // Lifecycle events
    | 'connected' | 'initialized' | 'complete' | 'error' | 'cancelled'
    // Agent events (enhanced)
    | 'agent' | 'agent_start' | 'agent_active' | 'agent_complete' | 'agent_skip' | 'agent_error'
    // Phase events (NEW)
    | 'phase_start' | 'phase_progress' | 'phase_complete'
    // Tool events (NEW)
    | 'tool' | 'tool_start' | 'tool_progress' | 'tool_complete' | 'tool_error'
    // Content events
    | 'thinking' | 'reply' | 'reply_chunk' | 'files_partial'
    // Meta events
    | 'meta' | 'metrics' | 'warning'
    // Interactive events
    | 'mode_announce' | 'question' | 'options'
    // Todo events
    | 'todo_init' | 'todo_update'
    // Action log
    | 'action_log';

  // Agent identification
  agent?: string;
  agentId?: string;
  agentIndex?: number;
  totalAgents?: number;

  // Status
  status?: 'active' | 'completed' | 'skipped' | 'error' | 'idle';

  // Phase information (NEW)
  phase?: PipelinePhase;
  previousPhase?: PipelinePhase;
  phaseProgress?: number; // 0-100

  // Tool information (NEW)
  tool?: ToolKind;
  toolId?: string;
  toolStatus?: ToolStatus;
  toolLabel?: string;
  toolDetail?: string;

  // Legacy index/total
  index?: number;
  total?: number;

  // Descriptions
  description?: string;
  message?: string;

  // Content streaming
  thinkingLine?: string;
  thinkingLines?: string[];
  replyChunk?: string;
  reply?: string;
  codeChunk?: string;

  // Files
  files?: Array<{ path: string; content: string }>;
  fileCount?: number;
  filePath?: string;
  fileLines?: number;

  // Tool event data
  kind?: 'start' | 'progress' | 'complete';
  path?: string;
  lines?: number;

  // Metadata
  meta?: {
    securityScore?: number;
    qaScore?: number;
    securityApproved?: boolean;
    qaApproved?: boolean;
    complexity?: string;
    projectName?: string;
    chatOnly?: boolean;
    elapsedTime?: number;
    tokensUsed?: number;
    capabilityPlan?: {
      needsBackend?: boolean;
      backendReason?: string;
      needsDatabase?: boolean;
      databaseTables?: string[];
      needsAuth?: boolean;
      needsStorage?: boolean;
      needsPayments?: boolean;
      needsEmail?: boolean;
      needsExternalApi?: boolean;
      externalApis?: Array<{ name?: string; requiresKey?: boolean; envVar?: string; reason?: string; secretPlacement?: 'server' | 'client' }>;
      envVars?: string[];
      needsWebSearch?: boolean;
      webSearchQueries?: string[];
      webResearchUsed?: boolean;
      supabaseArtifacts?: string[];
      setupChecklist?: string[];
    };
  };

  // Metrics (NEW)
  metrics?: {
    startTime?: number;
    endTime?: number;
    duration?: number;
    tokensIn?: number;
    tokensOut?: number;
    filesCreated?: number;
    filesModified?: number;
  };

  // Phase C — Transparent Agent payloads
  mode?: AgentMode;
  reason?: string;
  question?: string;
  options?: string[];
  steps?: TodoStepPayload[];
  stepId?: string;
  todoStatus?: TodoStatus;
  action?: string;
  why?: string;
  next?: string;
  actionId?: string;

  // Error (NEW)
  error?: string;
  errorCode?: string;
  recoverable?: boolean;
}

/**
 * Start the build pipeline via SSE streaming.
 * Calls `onEvent` for each server-sent event (agent progress, completion, error).
 * Returns a Promise that resolves when the stream ends.
 * Supports cancellation via AbortSignal.
 */
export interface ChatHistoryEntry {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamingOptions {
  signal?: AbortSignal;
  onConnecting?: () => void;
}

// Robust SSE parser that handles fragmented JSON across chunks
function parseSSEEvents(buffer: string, jsonBuffer: string): {
  events: PipelineEvent[];
  newBuffer: string;
  newJsonBuffer: string;
} {
  const events: PipelineEvent[] = [];
  const parts = buffer.split('\n\n');
  const newBuffer = parts.pop() || '';
  let newJsonBuffer = jsonBuffer;

  for (const part of parts) {
    let dataStr = '';
    for (const line of part.split('\n')) {
      if (line.startsWith('data: ')) {
        dataStr = line.slice(6);
        break;
      }
    }

    if (!dataStr) continue;

    // Try to parse with accumulated buffer
    let parsed: PipelineEvent | null = null;
    const parseAttempt = newJsonBuffer + dataStr;

    try {
      parsed = JSON.parse(parseAttempt);
      newJsonBuffer = '';
    } catch (e) {
      const trimmed = parseAttempt.trim();
      // Check if this looks like incomplete JSON (starts with { but doesn't end with })
      if (trimmed.startsWith('{') && !trimmed.endsWith('}')) {
        newJsonBuffer = parseAttempt;
        continue;
      }
      // Try just the current data
      try {
        parsed = JSON.parse(dataStr);
        newJsonBuffer = '';
      } catch {
        newJsonBuffer = '';
        continue;
      }
    }

    if (parsed) {
      events.push(parsed);
    }
  }

  return { events, newBuffer, newJsonBuffer };
}

export async function startBuildPipeline(
  prompt: string,
  onEvent: (event: PipelineEvent) => void,
  existingFiles?: Array<{ path: string; content: string }>,
  mode: 'build' | 'plan' = 'build',
  model: string = 'claude-sonnet-4-6',
  projectId?: string | null,
  history?: ChatHistoryEntry[],
  options?: StreamingOptions & { conversationSummary?: string },
): Promise<void> {
  const { signal, onConnecting, conversationSummary = '' } = options || {};
  const MAX_RETRIES = 2;

  const attemptFetch = async (attempt: number): Promise<Response> => {
    try {
      onConnecting?.();
      return await fetch('/api/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          files: existingFiles,
          mode,
          model,
          projectId,
          history: history || [],
          conversationSummary,
        }),
        signal,
      });
    } catch (err) {
      // Retry on network-level errors (not on abort or if max retries reached)
      const isAborted = signal?.aborted || (err as Error).name === 'AbortError';
      const isNetworkErr = err instanceof TypeError;
      if (!isAborted && isNetworkErr && attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        return attemptFetch(attempt + 1);
      }
      throw err;
    }
  };

  const response = await attemptFetch(0);

  let errorData;
  if (!response.ok) {
    const text = await response.text();
    try {
      errorData = JSON.parse(text);
    } catch {
      errorData = { error: `Server error (${response.status}): ${text.slice(0, 100)}` };
    }
    throw new Error(errorData.error || `Build request failed: ${response.status}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let jsonBuffer = ''; // Accumulates fragmented JSON

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    // Check for cancellation
    if (signal?.aborted) {
      throw new Error('Stream cancelled');
    }

    buffer += decoder.decode(value, { stream: true });

    const { events, newBuffer, newJsonBuffer } = parseSSEEvents(buffer, jsonBuffer);
    buffer = newBuffer;
    jsonBuffer = newJsonBuffer;

    for (const event of events) {
      onEvent(event);
    }
  }

  // Process any remaining buffer
  if (buffer.trim()) {
    const { events } = parseSSEEvents(buffer + '\n\n', jsonBuffer);
    for (const event of events) {
      onEvent(event);
    }
  }
}

/**
 * Check if the pipeline server is reachable.
 */
export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Phase 6: Compress older messages into a single paragraph summary via LLM.
 * Returns the new summary or the existing one on failure (graceful degradation).
 */
export async function requestSummary(
  messages: ChatHistoryEntry[],
  existingSummary = '',
): Promise<{ summary: string; compressed: boolean }> {
  try {
    const res = await fetch('/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, existingSummary }),
    });
    if (!res.ok) return { summary: existingSummary, compressed: false };
    const data = await res.json();
    return {
      summary: typeof data.summary === 'string' ? data.summary : existingSummary,
      compressed: !!data.compressed,
    };
  } catch {
    return { summary: existingSummary, compressed: false };
  }
}
