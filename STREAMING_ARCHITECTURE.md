# Huggy Streaming AI Architecture

## Overview

This document describes the advanced streaming AI architecture implemented in Huggy, designed to match or surpass competitors like Bolt, Lovable, V0, Claude Code, and Windsurf.

## Pipeline Phases (17 total)

The pipeline now includes 17 granular phases with real-time progress tracking:

1. **initializing** - Setting up environment
2. **understanding** - Analyzing user request
3. **exploring** - Exploring context
4. **researching** - Gathering knowledge (web search)
5. **planning** - Creating plan
6. **architecting** - Designing system
7. **thinking** - Considering approach
8. **coding** - Building application
9. **installing** - Installing dependencies
10. **building** - Compiling
11. **testing** - Running tests
12. **reviewing** - Security audit
13. **repairing** - Fixing issues
14. **optimizing** - Optimizing code
15. **finalizing** - Final touches
16. **done** - Complete
17. **error** - Something went wrong

## Tool Types (24 total)

Granular tool tracking with icons:

- **File Operations**: read, write, edit, create, delete
- **Search & Analysis**: search, index, analyze
- **Build & Deploy**: bundle, install, test, lint, format, deploy
- **Interaction**: touch, explore, query
- **External**: web_search, api_call
- **Security & Fix**: scan, fix
- **Design**: design, model

## Event Types

### Agent Events
- `agent.start` - Agent begins work
- `agent.progress` - Agent thinking/progress
- `agent.complete` - Agent finished
- `agent.skip` - Agent skipped (conditional)

### Phase Events
- `phase.start` - Phase begins
- `phase.progress` - Phase progress update (0-100)
- `phase.complete` - Phase finished

### Tool Events
- `tool.start` - Tool operation begins
- `tool.progress` - Tool operation in progress
- `tool.complete` - Tool operation finished
- `tool.error` - Tool operation failed

### Content Events
- `thinking` - Agent thinking line
- `reply.chunk` - Reply streaming
- `code.chunk` - Code streaming
- `files.partial` - Partial file update

### Pipeline Events
- `pipeline.initialized` - Pipeline started
- `pipeline.complete` - Pipeline finished
- `pipeline.error` - Pipeline error

### Metrics Events
- `metrics` - Performance metrics (duration, tokens, files)

## UI Components

### PhaseIndicator
- Shows current phase with animated badge
- Progress bar (0-100%)
- Elapsed time display
- Pulse animation for active phases

### ToolBlock
- 24 tool types with Lucide icons
- Status: pending, active, completed, error
- Shimmer animation for active tools
- Detail text (lines, etc.)

### StatusPill
- Compact phase badge
- Category-based colors
- Pulse ring animation
- Elapsed time

### AgentStep
- Timeline connector with gradient
- Status: idle, pending, active, completed, skipped, error
- Pulse dot animation
- Tool blocks as children

## Configuration

### Required Environment Variables

```bash
# AI Provider (choose one)
OPENROUTER_API_KEY="sk-or-v1-..."  # Recommended
# OR
ANTHROPIC_API_KEY="sk-ant-..."

# Supabase (required for projects)
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Optional but recommended
OPENAI_API_KEY="sk-..."  # For RAG embeddings
VERCEL_TOKEN="..."  # For deployments
```

## Usage

The streaming UI automatically activates when a build starts. The PhaseIndicator shows at the top of the AI bubble during streaming, displaying:
- Current phase with animated icon
- Progress bar showing completion percentage
- Description of current activity

Tool blocks appear under each agent in the timeline, showing real-time file operations with their status.

## Architecture Flow

```
User Request
    ↓
Intent Parser (understanding)
    ↓
Research Agent (researching) - conditional
    ↓
Product Manager (planning)
    ↓
System Architect + UX Designer + DBA Architect (architecting)
    ↓
Builder Agent (thinking → coding)
    ↓
Preview Compiler (building)
    ↓
QA Reviewer (testing)
    ↓
Security Auditor (reviewing)
    ↓
Repair Agent (repairing) - conditional
    ↓
Finalizing → Done
```

Each phase emits events through the EventBus, which are captured by the UI components for real-time display.

## Files Modified

- `src/lib/api.ts` - Types and configuration
- `lib/orchestrator/eventBus.ts` - Event system
- `lib/lovablePipeline.mjs` - Pipeline implementation
- `src/App.tsx` - Event handling
- `src/components/streaming/PhaseIndicator.tsx` - New component
- `src/components/streaming/StatusPill.tsx` - Updated
- `src/components/streaming/ToolBlock.tsx` - Updated
- `src/components/streaming/AgentStep.tsx` - Updated
- `src/components/streaming/AIBubble.tsx` - Updated

## Real-time Features

- SSE streaming with JSON parsing
- Rolling timeout (extends on activity)
- Retry logic with exponential backoff
- Buffer management for partial JSON
- Throttled event emission
- Shimmer animations for loading states
- Token streaming with typewriter effect
