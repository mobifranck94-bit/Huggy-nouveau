import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('[Supabase] Missing configuration. Some features may not work.');
}

export const supabase = createClient(
  supabaseUrl || 'http://localhost:54321',
  supabaseKey || 'dummy-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
  }
);

export async function ensureTables() {
  // This function would create necessary tables if they don't exist
  // In production, you'd use Supabase migrations instead
  const tables = [
    {
      name: 'analytics',
      schema: `
        CREATE TABLE IF NOT EXISTS analytics (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          event_type TEXT NOT NULL,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    },
    {
      name: 'feedback',
      schema: `
        CREATE TABLE IF NOT EXISTS feedback (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          type TEXT NOT NULL,
          message TEXT,
          rating INTEGER CHECK (rating >= 1 AND rating <= 5),
          page TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    }
  ];
  
  for (const table of tables) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: table.schema });
      if (error) {
        console.warn(`[Supabase] Could not ensure table ${table.name}:`, error.message);
      }
    } catch (err) {
      // Table might already exist or RPC not available
    }
  }
}
