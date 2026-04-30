import pg from 'pg';
const { Client } = pg;

/**
 * Creates an isolated Postgres schema for a project and runs the DBA agent's tables/RLS.
 * Requires DATABASE_URL env var (Supabase direct connection string).
 * Optionally exposes the schema to PostgREST if SUPABASE_ACCESS_TOKEN is set.
 *
 * Returns { schemaName } on success, { skipped: true } when DATABASE_URL is missing.
 */
export async function executeSchema(dbaPlan, projectId) {
  if (!dbaPlan?.needsDatabase || !dbaPlan.tables?.length) {
    return { skipped: true, reason: 'no database needed' };
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn('[Schema] DATABASE_URL not set — skipping schema execution');
    return { skipped: true, reason: 'DATABASE_URL not set' };
  }

  // Schema name: proj_ + first 20 chars of projectId without hyphens
  const schemaName = 'proj_' + projectId.replace(/-/g, '').slice(0, 20);

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    // ── Create schema ──────────────────────────────────────────────────────────
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

    // Grant permissions to Supabase roles
    await client.query(`GRANT USAGE ON SCHEMA "${schemaName}" TO anon, authenticated, service_role`);
    await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA "${schemaName}" GRANT ALL ON TABLES TO authenticated`);
    await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA "${schemaName}" GRANT SELECT ON TABLES TO anon`);

    // ── Create tables ──────────────────────────────────────────────────────────
    for (const table of dbaPlan.tables) {
      const colDefs = table.columns.map(buildColDef);
      const sql = `CREATE TABLE IF NOT EXISTS "${schemaName}"."${table.name}" (\n  ${colDefs.join(',\n  ')}\n)`;
      await client.query(sql).catch(e =>
        console.warn(`[Schema] CREATE TABLE "${table.name}":`, e.message)
      );

      // Indexes — rewrite unquoted table refs to schema-qualified ones
      for (const idx of (table.indexes ?? [])) {
        const scoped = idx.replace(/\bON\s+(\w+)\s*\(/gi, `ON "${schemaName}"."$1" (`);
        // CREATE INDEX IF NOT EXISTS to tolerate reruns
        const safe = scoped.replace(/^CREATE INDEX\b/i, 'CREATE INDEX IF NOT EXISTS');
        await client.query(safe).catch(() => {});
      }

      // RLS policies — rewrite TABLE/ON refs to schema-qualified ones
      for (const pol of (table.rls_policies ?? [])) {
        const scoped = pol.replace(/((?:TABLE|ON)\s+)(\w+)\b/gi, `$1"${schemaName}"."$2"`);
        await client.query(scoped).catch(() => {}); // ignore duplicate policy errors
      }
    }

    // Seed data (best-effort)
    for (const seed of (dbaPlan.seedData ?? [])) {
      for (const row of (seed.rows ?? [])) {
        const cols   = Object.keys(row).map(k => `"${k}"`).join(', ');
        const vals   = Object.values(row).map((_, i) => `$${i + 1}`).join(', ');
        const params = Object.values(row);
        await client
          .query(`INSERT INTO "${schemaName}"."${seed.table}" (${cols}) VALUES (${vals}) ON CONFLICT DO NOTHING`, params)
          .catch(() => {});
      }
    }

    // Expose schema to PostgREST via Supabase Management API (optional)
    await exposeSchemaToPostgREST(schemaName);

    console.log(`[Schema] ✅ "${schemaName}" created — ${dbaPlan.tables.length} table(s)`);
    return { schemaName };

  } finally {
    await client.end().catch(() => {});
  }
}

// ── Helper: build a column definition string ───────────────────────────────────
function buildColDef(col) {
  let def = `"${col.name}" ${col.type.toUpperCase()}`;
  if (col.primary)    def += ' PRIMARY KEY';
  if (col.default)    def += ` DEFAULT ${col.default}`;
  if (col.required && !col.primary) def += ' NOT NULL';
  if (col.references) {
    def += ` REFERENCES ${col.references}`;
    if (col.onDelete)  def += ` ON DELETE ${col.onDelete}`;
  }
  return def;
}

// ── Expose schema to Supabase PostgREST ────────────────────────────────────────
async function exposeSchemaToPostgREST(schemaName) {
  const token      = process.env.SUPABASE_ACCESS_TOKEN;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!token || !supabaseUrl) return;

  try {
    const ref = new URL(supabaseUrl).hostname.split('.')[0];
    const mgmt = `https://api.supabase.com/v1/projects/${ref}/postgrest`;

    const current = await fetch(mgmt, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).catch(() => null);

    if (!current) return;

    const schemas = (current.db_schema || 'public').split(',').map(s => s.trim());
    if (schemas.includes(schemaName)) return;

    await fetch(mgmt, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ db_schema: [...schemas, schemaName].join(', ') }),
    });

    console.log(`[Schema] PostgREST updated to include "${schemaName}"`);
  } catch (e) {
    console.warn('[Schema] PostgREST update skipped:', e.message);
  }
}
