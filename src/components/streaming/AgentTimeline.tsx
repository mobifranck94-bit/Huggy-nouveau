/**
 * AgentTimeline - vertical pipeline of agents with connecting gradient line.
 * Design System: masquer les agents inactifs, couleur unique accent
 */

import type { ReactNode } from 'react';
import { AgentStep, type AgentStepStatus } from './AgentStep';

export interface AgentNode {
  name: string;
  status: AgentStepStatus;
  description?: string;
}

interface AgentTimelineProps {
  agents: AgentNode[];
  /** Render extra content (e.g. ToolBlocks) under a specific agent name */
  childrenByAgent?: Record<string, ReactNode>;
  /** Hide idle agents, show only active/completed/errors */
  hideIdle?: boolean;
}

export function AgentTimeline({ agents, childrenByAgent = {}, hideIdle = true }: AgentTimelineProps) {
  if (!agents.length) return null;

  // Filter out idle agents if hideIdle is true
  const visibleAgents = hideIdle
    ? agents.filter(a => a.status !== 'idle')
    : agents;

  if (visibleAgents.length === 0) return null;

  return (
    <div className="flex flex-col" aria-label="Pipeline agents">
      {visibleAgents.map((agent, idx) => (
        <AgentStep
          key={agent.name}
          name={agent.name}
          status={agent.status}
          description={agent.description}
          isLast={idx === visibleAgents.length - 1}
        >
          {childrenByAgent[agent.name]}
        </AgentStep>
      ))}
    </div>
  );
}

export default AgentTimeline;
