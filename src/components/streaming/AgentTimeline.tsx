/**
 * AgentTimeline - vertical pipeline of agents with connecting gradient line.
 * Renders one AgentStep per agent and slots arbitrary children (ToolBlocks)
 * under the currently-active or recently-completed agent.
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
}

export function AgentTimeline({ agents, childrenByAgent = {} }: AgentTimelineProps) {
  if (!agents.length) return null;

  return (
    <div className="flex flex-col" aria-label="Pipeline agents">
      {agents.map((agent, idx) => (
        <AgentStep
          key={agent.name}
          name={agent.name}
          status={agent.status}
          description={agent.description}
          isLast={idx === agents.length - 1}
        >
          {childrenByAgent[agent.name]}
        </AgentStep>
      ))}
    </div>
  );
}

export default AgentTimeline;
