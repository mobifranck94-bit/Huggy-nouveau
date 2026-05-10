export interface PipelineEvent {
    type?: 'connected' | 'agent' | 'complete' | 'error';
    agent?: string;
    status?: 'active' | 'completed';
    index?: number;
    total?: number;
    description?: string;
    message?: string;
    files?: Array<{
        path: string;
        content: string;
    }>;
    reply?: string;
    meta?: {
        securityScore?: number;
        qaScore?: number;
        securityApproved?: boolean;
        qaApproved?: boolean;
        complexity?: string;
        projectName?: string;
    };
}
/**
 * Start the build pipeline via SSE streaming.
 * Calls `onEvent` for each server-sent event (agent progress, completion, error).
 * Returns a Promise that resolves when the stream ends.
 */
export declare function startBuildPipeline(prompt: string, onEvent: (event: PipelineEvent) => void, existingFiles?: Array<{
    path: string;
    content: string;
}>, mode?: 'build' | 'plan', model?: string, projectId?: string | null): Promise<void>;
/**
 * Check if the pipeline server is reachable.
 */
export declare function checkServerHealth(): Promise<boolean>;
