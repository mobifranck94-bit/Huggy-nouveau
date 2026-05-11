import { motion } from 'motion/react';
import { Database, KeyRound, Server, Globe2, CheckCircle2 } from 'lucide-react';

export interface CapabilityPlan {
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
}

interface CapabilityBlockProps {
  plan?: CapabilityPlan;
}

export function CapabilityBlock({ plan }: CapabilityBlockProps) {
  if (!plan) return null;

  const enabled = [
    plan.needsBackend && 'Backend',
    plan.needsDatabase && 'Database',
    plan.needsAuth && 'Auth',
    plan.needsStorage && 'Storage',
    plan.needsPayments && 'Payments',
    plan.needsEmail && 'Email',
    plan.needsExternalApi && 'External API',
  ].filter(Boolean) as string[];

  const envVars = Array.isArray(plan.envVars) ? plan.envVars.filter(Boolean).slice(0, 5) : [];
  const externalApis = Array.isArray(plan.externalApis) ? plan.externalApis.filter(api => api?.name).slice(0, 3) : [];
  const setup = Array.isArray(plan.setupChecklist) ? plan.setupChecklist.filter(Boolean).slice(0, 4) : [];

  if (!enabled.length && !envVars.length && !externalApis.length && !setup.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-blue-500/20 bg-blue-500/[0.06] p-3"
      role="region"
      aria-label="Décisions techniques Huggy"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
          <Server className="w-3.5 h-3.5 text-blue-300" />
        </div>
        <div>
          <p className="text-[11px] font-semibold text-zinc-100">Décisions techniques</p>
          <p className="text-[10px] text-zinc-500">Backend, API et setup détectés automatiquement</p>
        </div>
      </div>

      {enabled.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {enabled.map(item => (
            <span key={item} className="inline-flex items-center gap-1 rounded-full border border-zinc-700/60 bg-zinc-900/70 px-2 py-1 text-[10px] text-zinc-300">
              <CheckCircle2 className="w-3 h-3 text-emerald-300" />
              {item}
            </span>
          ))}
        </div>
      )}

      {plan.backendReason && (
        <p className="text-[10px] leading-relaxed text-zinc-400 mb-2">{plan.backendReason}</p>
      )}

      {externalApis.length > 0 && (
        <div className="space-y-1 mb-2">
          {externalApis.map(api => (
            <div key={`${api.name}-${api.envVar}`} className="flex items-center justify-between gap-2 rounded-lg bg-zinc-950/50 border border-zinc-800/70 px-2 py-1.5">
              <span className="inline-flex items-center gap-1.5 text-[10px] text-zinc-300">
                <Globe2 className="w-3 h-3 text-cyan-300" />
                {api.name}
              </span>
              {api.envVar && <code className="text-[9px] text-amber-300">{api.envVar}</code>}
            </div>
          ))}
        </div>
      )}

      {envVars.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          <KeyRound className="w-3 h-3 text-amber-300" />
          {envVars.map(v => (
            <code key={v} className="rounded bg-zinc-950/70 px-1.5 py-0.5 text-[9px] text-amber-300 border border-amber-500/15">{v}</code>
          ))}
        </div>
      )}

      {plan.needsDatabase && Array.isArray(plan.databaseTables) && plan.databaseTables.length > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mb-2">
          <Database className="w-3 h-3 text-violet-300" />
          Tables: {plan.databaseTables.slice(0, 4).join(', ')}
        </div>
      )}

      {setup.length > 0 && (
        <ul className="space-y-1 border-t border-zinc-800/70 pt-2">
          {setup.map((item, idx) => (
            <li key={idx} className="text-[10px] text-zinc-500 leading-relaxed">{idx + 1}. {item}</li>
          ))}
        </ul>
      )}

      {plan.needsWebSearch && (
        <p className="mt-2 text-[9px] text-cyan-300/80">
          Recherche web {plan.webResearchUsed ? 'utilisée' : 'prévue si une clé TAVILY_API_KEY ou SERPAPI_API_KEY est configurée'}.
        </p>
      )}
    </motion.div>
  );
}

export default CapabilityBlock;
