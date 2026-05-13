// ─── Conversation Memory — Persistent per-project history ────────────────────
// Phase 6: stores user/assistant messages in Supabase so the AI remembers
// everything across refreshes and sessions.

import { supabase } from './supabase';

export interface DbMessage {
  id: string;
  project_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface SaveMessageInput {
  projectId: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  meta?: Record<string, unknown>;
}

/**
 * Save a single message to the conversation history.
 * Returns the inserted row or null on failure (non-blocking).
 */
export async function saveMessage(input: SaveMessageInput): Promise<DbMessage | null> {
  if (!input.projectId || !input.userId || !input.content?.trim()) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        project_id: input.projectId,
        user_id: input.userId,
        role: input.role,
        content: input.content.slice(0, 50000), // hard cap
        meta: input.meta || {},
      })
      .select()
      .single();

    if (error) {
      console.warn('[messages] saveMessage failed:', error.message);
      return null;
    }
    return data as DbMessage;
  } catch (err) {
    console.warn('[messages] saveMessage exception:', err);
    return null;
  }
}

/**
 * Load recent messages for a project, oldest-first, capped at `limit`.
 */
export async function loadMessages(projectId: string, limit = 50): Promise<DbMessage[]> {
  if (!projectId) return [];

  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[messages] loadMessages failed:', error.message);
      return [];
    }
    // Reverse so oldest is first (chronological reading order)
    return ((data as DbMessage[]) || []).reverse();
  } catch (err) {
    console.warn('[messages] loadMessages exception:', err);
    return [];
  }
}

/**
 * Get conversation summary (compressed older messages) for a project.
 */
export async function loadConversationSummary(projectId: string): Promise<string> {
  if (!projectId) return '';

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('conversation_summary')
      .eq('id', projectId)
      .single();

    if (error || !data) return '';
    return (data as { conversation_summary?: string }).conversation_summary || '';
  } catch {
    return '';
  }
}

/**
 * Delete all messages for a project (Clear History button).
 */
export async function clearMessages(projectId: string): Promise<boolean> {
  if (!projectId) return false;

  try {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('project_id', projectId);

    if (error) {
      console.warn('[messages] clearMessages failed:', error.message);
      return false;
    }

    // Also clear summary
    await supabase
      .from('projects')
      .update({ conversation_summary: '', summary_message_count: 0 })
      .eq('id', projectId);

    return true;
  } catch (err) {
    console.warn('[messages] clearMessages exception:', err);
    return false;
  }
}

/**
 * Count messages for a project (for UI indicator).
 */
export async function countMessages(projectId: string): Promise<number> {
  if (!projectId) return 0;

  try {
    const { count, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId);

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
