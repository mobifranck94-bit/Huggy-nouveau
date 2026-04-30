import { runWebResearchAgent } from '../agents/webResearchAgent.mjs';
import { runPMAgent }          from '../agents/pmAgent.mjs';
import { runDBAAgent }         from '../agents/dbaAgent.mjs';
import { runUXDesignerAgent }  from '../agents/uxDesignerAgent.mjs';
import { runCoderAgent }       from '../agents/coderAgent.mjs';
import { runSecurityAuditor }  from '../agents/securityAuditorAgent.mjs';
import { runReviewerAgent }    from '../agents/reviewerAgent.mjs';
import { runI18nAgent }        from '../agents/i18nAgent.mjs';
import { applyFixes }          from './applyFixes.mjs';

export async function runFullPipeline(userPrompt, options = {}) {
  const { onProgress, existingFiles = [], mode = 'build' } = options;
  const log = (step, data) => console.log(`[Pipeline] ${step}`, data ?? '');

  // Helper to emit progress events to the SSE stream
  const emit = (index, agent, status, description = '') => {
    onProgress?.({ type: 'agent', index, agent, status, total: 8, description });
  };

  // ─── 1. Web Research ───────────────────────────────────────────────────────
  emit(0, 'Web Research', 'active', 'Analyzing references and context...');
  log('1/8 WebResearch...');
  const research = await runWebResearchAgent(userPrompt);
  const enrichedPrompt = research.enrichedContext
    ? `${userPrompt}\n\n${research.enrichedContext}`
    : userPrompt;
  emit(0, 'Web Research', 'completed', 'Context enrichment done');

  // ─── 2. Product Manager ───────────────────────────────────────────────────
  emit(1, 'Product Manager', 'active', 'Drafting implementation plan...');
  log('2/8 PM Agent...');
  const pmPlan = await runPMAgent(enrichedPrompt, existingFiles);
  emit(1, 'Product Manager', 'completed', `Plan ready — ${pmPlan.complexity} complexity`);

  if (mode === 'plan') {
    log('Pipeline stopped early (Plan mode)');
    return {
      files: [],
      reply: `Voici le plan d'exécution pour votre projet "${pmPlan.projectName}":\n\n${pmPlan.refinedPrompt}\n\nApprouvez-vous ce plan pour passer au build ?`,
      meta: { pmPlan }
    };
  }

  // ─── 3. DBA Architect (conditionnel) ──────────────────────────────────────
  emit(2, 'DBA Architect', 'active', 'Structuring database & RLS policies...');
  log('3/8 DBA Agent...');
  const dbaPlan = (pmPlan.dataModel?.length > 0 || pmPlan.authStrategy !== 'none')
    ? await runDBAAgent(pmPlan, userPrompt)
    : { needsDatabase: false, tables: [], supabaseClientCode: '' };
  emit(2, 'DBA Architect', 'completed', dbaPlan.needsDatabase ? `${dbaPlan.tables?.length ?? 0} tables designed` : 'No database needed');

  // ─── 4. UX Designer ───────────────────────────────────────────────────────
  emit(3, 'UX Designer', 'active', 'Designing design system & components...');
  log('4/8 UX Designer Agent...');
  const uxPlan = await runUXDesignerAgent(pmPlan, dbaPlan);
  emit(3, 'UX Designer', 'completed', 'Design system & layouts ready');

  // ─── 5. Coder ─────────────────────────────────────────────────────────────
  emit(4, 'Coder Agent', 'active', 'Generating React & TypeScript code...');
  log('5/8 Coder Agent...');
  const coderPrompt = [
    pmPlan.refinedPrompt,
    `\n\n# DESIGN SYSTEM (use these exact tokens)\n${JSON.stringify(uxPlan, null, 2)}`,
    dbaPlan.needsDatabase
      ? `\n\n# DATABASE CLIENT\n${dbaPlan.supabaseClientCode}`
      : '',
  ].join('');

  let codeResult = await runCoderAgent(coderPrompt, pmPlan.complexity, existingFiles);
  emit(4, 'Coder Agent', 'completed', `${codeResult.files?.length ?? 0} files generated`);

  // ─── 6. Security Auditor ──────────────────────────────────────────────────
  emit(5, 'Security Auditor', 'active', 'Auditing for vulnerabilities...');
  log('6/8 Security Auditor...');
  const secReport = await runSecurityAuditor(codeResult.files, dbaPlan);
  if (!secReport.approved) {
    log('Security fixes applied:', secReport.criticalIssues.length, 'issues');
    codeResult.files = applyFixes(codeResult.files, secReport.fixes);
  }
  emit(5, 'Security Auditor', 'completed', `Score: ${secReport.score}/100 — ${secReport.approved ? 'Approved' : 'Fixes applied'}`);

  // ─── 7. QA Reviewer ───────────────────────────────────────────────────────
  emit(6, 'QA Reviewer', 'active', 'Checking for bugs & UX consistency...');
  log('7/8 Reviewer Agent...');
  const review = await runReviewerAgent(codeResult.files, pmPlan.refinedPrompt);
  if (!review.approved) {
    log('QA fixes applied:', review.issues.length, 'issues');
    codeResult.files = applyFixes(codeResult.files, review.fixes);
  }
  emit(6, 'QA Reviewer', 'completed', `Score: ${review.score}/100 — ${review.approved ? 'Approved' : 'Fixes applied'}`);

  // ─── 8. i18n Agent (optionnel) ────────────────────────────────────────────
  if (pmPlan.needsI18n && pmPlan.targetLocales?.length > 0) {
    emit(7, 'i18n Agent', 'active', `Translating to ${pmPlan.targetLocales.join(', ')}...`);
    log('8/8 i18n Agent...');
    const i18nResult = await runI18nAgent(codeResult.files, pmPlan.targetLocales);
    codeResult.files = [
      ...i18nResult.modifiedFiles,
      ...i18nResult.localeFiles,
      { path: 'src/i18n.ts', content: i18nResult.setupCode },
    ];
    emit(7, 'i18n Agent', 'completed', `${pmPlan.targetLocales.length} locales generated`);
  } else {
    emit(7, 'i18n Agent', 'active', 'Checking i18n requirements...');
    emit(7, 'i18n Agent', 'completed', 'Skipped — not needed');
    log('8/8 i18n skipped (not needed)');
  }

  return {
    ...codeResult,
    meta: {
      pmPlan,
      dbaPlan,
      uxPlan,
      secReport,
      review,
    },
  };
}
