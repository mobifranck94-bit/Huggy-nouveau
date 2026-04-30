import { runWebResearchAgent } from '../agents/webResearchAgent.mjs';
import { runPMAgent }          from '../agents/pmAgent.mjs';
import { runDBAAgent }         from '../agents/dbaAgent.mjs';
import { runUXDesignerAgent }  from '../agents/uxDesignerAgent.mjs';
import { runCoderAgent }       from '../agents/coderAgent.mjs';
import { runSecurityAuditor }  from '../agents/securityAuditorAgent.mjs';
import { runReviewerAgent }    from '../agents/reviewerAgent.mjs';
import { runI18nAgent }        from '../agents/i18nAgent.mjs';
import { applyFixes }          from './applyFixes.mjs';
import { executeSchema }       from './executeSchema.mjs';

export async function runFullPipeline(userPrompt, options = {}) {
  const { onProgress, existingFiles = [], mode = 'build', projectId = null } = options;
  const log = (step, data) => console.log(`[Pipeline] ${step}`, data ?? '');

  const emit = (index, agent, status, description = '') => {
    onProgress?.({ type: 'agent', index, agent, status, total: 8, description });
  };

  // ─── 1. Web Research (skipped unless URL or "inspired by") ─────────────────
  emit(0, 'Web Research', 'active', 'Analyzing references...');
  const research = await runWebResearchAgent(userPrompt);
  const enrichedPrompt = research.enrichedContext
    ? `${userPrompt}\n\n${research.enrichedContext}`
    : userPrompt;
  emit(0, 'Web Research', 'completed', research.enrichedContext ? 'Context enriched' : 'No external refs');

  // ─── 2. Product Manager ───────────────────────────────────────────────────
  emit(1, 'Product Manager', 'active', 'Drafting plan...');
  const pmPlan = await runPMAgent(enrichedPrompt, existingFiles);
  emit(1, 'Product Manager', 'completed', `${pmPlan.complexity} · ${pmPlan.pages?.length ?? 0} pages`);

  if (mode === 'plan') {
    log('Pipeline stopped early (Plan mode)');
    return {
      files: [],
      reply: `Voici le plan d'exécution pour "${pmPlan.projectName}":\n\n${pmPlan.refinedPrompt}\n\nApprouvez-vous ce plan ?`,
      meta:  { pmPlan },
    };
  }

  // Decide which optional agents we actually need
  const hasDataLayer = pmPlan.dataModel?.length > 0 || pmPlan.authStrategy !== 'none';
  const isSimple     = pmPlan.complexity === 'simple' && !hasDataLayer;

  // ─── 3. DBA Architect (conditional) ───────────────────────────────────────
  emit(2, 'DBA Architect', 'active', hasDataLayer ? 'Designing schema...' : 'Checking data needs...');
  const dbaPlan = hasDataLayer
    ? await runDBAAgent(pmPlan, userPrompt)
    : { needsDatabase: false, tables: [], supabaseClientCode: '' };
  emit(2, 'DBA Architect', hasDataLayer ? 'completed' : 'skipped',
    hasDataLayer ? `${dbaPlan.tables?.length ?? 0} tables · RLS enabled` : 'No DB needed');

  // Isolated schema execution
  if (dbaPlan.needsDatabase && projectId) {
    const schemaResult = await executeSchema(dbaPlan, projectId)
      .catch(e => { console.warn('[Pipeline] Schema exec failed:', e.message); return { skipped: true }; });
    if (schemaResult?.schemaName && dbaPlan.supabaseClientCode) {
      dbaPlan.supabaseClientCode = dbaPlan.supabaseClientCode.replace(
        /createClient\(([^)]+)\)/,
        `createClient($1, { db: { schema: '${schemaResult.schemaName}' } })`
      );
      dbaPlan._schemaName = schemaResult.schemaName;
    }
  }

  // ─── 4. UX Designer ───────────────────────────────────────────────────────
  emit(3, 'UX Designer', 'active', 'Building design system...');
  const uxPlan = await runUXDesignerAgent(pmPlan, dbaPlan);
  emit(3, 'UX Designer', 'completed', `${uxPlan.components?.length ?? 0} components specced`);

  // ─── 5. Coder — slim context (only essentials, never full UX JSON) ────────
  emit(4, 'Coder Agent', 'active', 'Writing code...');
  const slimDesign = {
    colors:     uxPlan.colorTokens,
    typography: uxPlan.typography,
    radius:     uxPlan.borderRadius,
    components: uxPlan.components?.map(c => ({ name: c.name, spec: c.spec ?? c.description })) ?? [],
    layouts:    uxPlan.layouts,
  };
  const coderPrompt = [
    pmPlan.refinedPrompt,
    `\n\n# DESIGN SYSTEM (use exact tokens)\n${JSON.stringify(slimDesign)}`,
    dbaPlan.needsDatabase ? `\n\n# DB CLIENT\n${dbaPlan.supabaseClientCode}` : '',
  ].join('');

  let codeResult = await runCoderAgent(coderPrompt, pmPlan.complexity, existingFiles);
  emit(4, 'Coder Agent', 'completed', `${codeResult.files?.length ?? 0} files generated`);

  // ─── 6. Security Auditor (skipped on simple static apps) ──────────────────
  let secReport;
  if (isSimple) {
    secReport = { score: 95, criticalIssues: [], approved: true, securitySummary: 'Auto-approved (no DB/auth)' };
    emit(5, 'Security Auditor', 'skipped', 'Skipped — static app');
  } else {
    emit(5, 'Security Auditor', 'active', 'Auditing vulns...');
    secReport = await runSecurityAuditor(codeResult.files, dbaPlan);
    if (!secReport.approved) {
      log('Security fixes:', secReport.criticalIssues?.length, 'issues');
      codeResult.files = applyFixes(codeResult.files, secReport.fixes);
    }
    emit(5, 'Security Auditor', 'completed', `${secReport.score}/100 — ${secReport.approved ? 'OK' : 'Fixed'}`);
  }

  // ─── 7. QA Reviewer ───────────────────────────────────────────────────────
  emit(6, 'QA Reviewer', 'active', 'Code review...');
  const review = await runReviewerAgent(codeResult.files, pmPlan.refinedPrompt);
  if (!review.approved) {
    log('QA fixes:', review.issues?.length, 'issues');
    codeResult.files = applyFixes(codeResult.files, review.fixes);
  }
  emit(6, 'QA Reviewer', 'completed', `${review.score}/100 — ${review.approved ? 'OK' : 'Fixed'}`);

  // ─── 8. i18n Agent (conditional) ──────────────────────────────────────────
  if (pmPlan.needsI18n && pmPlan.targetLocales?.length > 0) {
    emit(7, 'i18n Agent', 'active', `Translating: ${pmPlan.targetLocales.join(', ')}`);
    const i18nResult = await runI18nAgent(codeResult.files, pmPlan.targetLocales);
    codeResult.files = [
      ...i18nResult.modifiedFiles,
      ...i18nResult.localeFiles,
      { path: 'src/i18n.ts', content: i18nResult.setupCode },
    ];
    emit(7, 'i18n Agent', 'completed', `${pmPlan.targetLocales.length} locales`);
  } else {
    emit(7, 'i18n Agent', 'skipped', 'Not needed');
  }

  return {
    ...codeResult,
    meta: { pmPlan, dbaPlan, uxPlan, secReport, review },
  };
}
