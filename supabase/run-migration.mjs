// ─── Supabase Migration via REST API ────────────────────────────────────────
// Uses the service_role key to execute SQL statements via Supabase's pg endpoint
// Usage: node supabase/run-migration.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.join(__dirname, 'migration.sql');

const SUPABASE_URL = 'https://ihwvjwojowxxctwngtra.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlod3Zqd29qb3d4eGN0d25ndHJhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzQ5Njc0OSwiZXhwIjoyMDkzMDcyNzQ5fQ.NwsI4FQgOMBTwkO1Qnsf7fslDJf4i2cxGVDkzCjIjmU';

// Split SQL into individual executable statements
function splitStatements(sql) {
  // Remove single-line comments but keep multi-line structure
  const lines = sql.split('\n');
  const cleanLines = lines.map(line => {
    // Remove full-line comments
    if (line.trim().startsWith('--')) return '';
    // Remove inline comments
    return line.replace(/--.*$/, '');
  });

  const cleaned = cleanLines.join('\n');
  
  // Split on semicolons, but be careful with function bodies ($$)
  const statements = [];
  let current = '';
  let inDollarBlock = false;
  
  for (const line of cleaned.split('\n')) {
    const trimmed = line.trim();
    
    if (trimmed.includes('$$')) {
      const count = (trimmed.match(/\$\$/g) || []).length;
      if (count === 1) inDollarBlock = !inDollarBlock;
      // count === 2 means open and close on same line
    }
    
    current += line + '\n';
    
    if (!inDollarBlock && trimmed.endsWith(';')) {
      const stmt = current.trim();
      if (stmt.length > 1) statements.push(stmt);
      current = '';
    }
  }
  
  if (current.trim().length > 1) {
    statements.push(current.trim());
  }
  
  return statements;
}

async function executeSQL(sql, label) {
  const res = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (res.ok) {
    return { success: true };
  }
  
  const text = await res.text();
  return { success: false, status: res.status, error: text };
}

async function runMigration() {
  console.log('📋 Loading migration SQL...');
  const sql = fs.readFileSync(migrationPath, 'utf-8');
  const statements = splitStatements(sql);
  console.log(`   Found ${statements.length} statements\n`);

  // First, try executing the entire file at once
  console.log('🚀 Attempting full migration execution...\n');
  
  const fullResult = await executeSQL(sql, 'Full migration');
  
  if (fullResult.success) {
    console.log('✅ Full migration executed successfully!');
    return;
  }
  
  console.log(`⚠️  Full execution returned ${fullResult.status}, trying statement by statement...\n`);
  
  // Fallback: execute statement by statement
  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.split('\n').filter(l => l.trim()).slice(0, 1)[0]?.trim().slice(0, 70) || '...';
    
    const result = await executeSQL(stmt, preview);
    
    if (result.success) {
      console.log(`  ✅ [${i + 1}/${statements.length}] ${preview}`);
      success++;
    } else if (result.error?.includes('already exists')) {
      console.log(`  ⚠️  [${i + 1}/${statements.length}] ${preview} (already exists)`);
      skipped++;
    } else {
      console.log(`  ❌ [${i + 1}/${statements.length}] ${preview}`);
      console.log(`     → ${result.error?.slice(0, 120)}`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${success} success, ${skipped} skipped, ${failed} failed`);
}

runMigration().catch(console.error);
