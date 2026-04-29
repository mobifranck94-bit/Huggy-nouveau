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
  const log = (step, data) => console.log(`[Pipeline] ${step}`, data ?? '');

  // ─── 1. Web Research ───────────────────────────────────────────────────────
  log('1/8 WebResearch...');
  const research = await runWebResearchAgent(userPrompt);
  const enrichedPrompt = research.enrichedContext
    ? `${userPrompt}\n\n${research.enrichedContext}`
    : userPrompt;

  // ─── 2. Product Manager ───────────────────────────────────────────────────
  log('2/8 PM Agent...');
  const pmPlan = await runPMAgent(enrichedPrompt);

  // ─── 3. DBA Architect (conditionnel) ──────────────────────────────────────
  log('3/8 DBA Agent...');
  const dbaPlan = (pmPlan.dataModel?.length > 0 || pmPlan.authStrategy !== 'none')
    ? await runDBAAgent(pmPlan, userPrompt)
    : { needsDatabase: false, tables: [], supabaseClientCode: '' };

  // ─── 4. UX Designer ───────────────────────────────────────────────────────
  log('4/8 UX Designer Agent...');
  const uxPlan = await runUXDesignerAgent(pmPlan, dbaPlan);

  // ─── 5. Coder ─────────────────────────────────────────────────────────────
  log('5/8 Coder Agent...');
  const coderPrompt = [
    pmPlan.refinedPrompt,
    `\n\n# DESIGN SYSTEM (use these exact tokens)\n${JSON.stringify(uxPlan, null, 2)}`,
    dbaPlan.needsDatabase
      ? `\n\n# DATABASE CLIENT\n${dbaPlan.supabaseClientCode}`
      : '',
  ].join('');

  let codeResult = await runCoderAgent(coderPrompt, pmPlan.complexity);

  // ─── 6. Security Auditor ──────────────────────────────────────────────────
  log('6/8 Security Auditor...');
  const secReport = await runSecurityAuditor(codeResult.files, dbaPlan);
  if (!secReport.approved) {
    log('Security fixes applied:', secReport.criticalIssues.length, 'issues');
    codeResult.files = applyFixes(codeResult.files, secReport.fixes);
  }

  // ─── 7. QA Reviewer ───────────────────────────────────────────────────────
  log('7/8 Reviewer Agent...');
  const review = await runReviewerAgent(codeResult.files, pmPlan.refinedPrompt);
  if (!review.approved) {
    log('QA fixes applied:', review.issues.length, 'issues');
    codeResult.files = applyFixes(codeResult.files, review.fixes);
  }

  // ─── 8. i18n Agent (optionnel) ────────────────────────────────────────────
  if (pmPlan.needsI18n && pmPlan.targetLocales?.length > 0) {
    log('8/8 i18n Agent...');
    const i18nResult = await runI18nAgent(codeResult.files, pmPlan.targetLocales);
    codeResult.files = [
      ...i18nResult.modifiedFiles,
      ...i18nResult.localeFiles,
      { path: 'src/i18n.ts', content: i18nResult.setupCode },
    ];
  } else {
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
