<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Huggy Studio — Architecture Multi-Agents (8 agents)

> Pipeline: **WebResearch → PM → DBA → UXDesigner → Coder → SecurityAuditor → Reviewer → i18n**

A premium AI SaaS builder powered by a multi-agent orchestration pipeline that transforms user prompts into complete, production-ready React applications.

## Architecture

```
huggy-studio/
├── agents/
│   ├── webResearchAgent.mjs        # Agent 1: Web Research (URL scraping + DuckDuckGo)
│   ├── pmAgent.mjs                 # Agent 2: Product Manager
│   ├── dbaAgent.mjs                # Agent 3: DBA Architect (Supabase/PostgreSQL)
│   ├── uxDesignerAgent.mjs         # Agent 4: UX Designer ✦ NEW
│   ├── coderAgent.mjs              # Agent 5: Coder (React/TypeScript)
│   ├── securityAuditorAgent.mjs    # Agent 6: Security Auditor ✦ NEW
│   ├── reviewerAgent.mjs           # Agent 7: QA Reviewer
│   └── i18nAgent.mjs               # Agent 8: i18n Agent ✦ NEW
├── lib/
│   ├── pipeline.mjs                # Orchestrateur principal
│   ├── applyFixes.mjs              # Utilitaire de correction automatique
│   └── callClaude.mjs              # Wrapper API Claude
├── src/                            # Frontend React/Vite
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
└── index.mjs                       # Point d'entrée pipeline
```

## Agent Pipeline

| # | Agent             | Model            | Input                   | Output                        | Conditional |
|---|-------------------|------------------|-------------------------|-------------------------------|:-----------:|
| 1 | Web Research      | (no AI)          | userPrompt              | enrichedContext               | If URL/trigger |
| 2 | Product Manager   | claude-haiku-4-5 | enrichedPrompt          | pmPlan + refinedPrompt        | No          |
| 3 | DBA Architect     | claude-haiku-4-5 | pmPlan                  | tables + RLS + clientCode     | If dataModel |
| 4 | UX Designer ✦     | claude-haiku-4-5 | pmPlan + dbaPlan        | colorTokens + layouts + components | No   |
| 5 | Coder             | claude-sonnet-4-5*| refinedPrompt + UX plan | files[]                       | No          |
| 6 | Security Auditor ✦| claude-haiku-4-5 | files[] + dbaPlan       | score + fixes                 | No          |
| 7 | QA Reviewer       | claude-haiku-4-5 | files[] + prompt        | score + fixes                 | No          |
| 8 | i18n Agent ✦      | claude-haiku-4-5 | files[] + locales       | modifiedFiles + localeFiles   | If needsI18n |

*Coder uses `claude-sonnet-4-5` for complexity=complex, `claude-haiku-4-5` otherwise.
✦ = New agent added to the architecture.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set environment variables in `.env.local`:
   - `GEMINI_API_KEY` — Your Gemini API key
   - `ANTHROPIC_API_KEY` — Your Anthropic API key (for the multi-agent pipeline)
3. Run the frontend:
   ```bash
   npm run dev
   ```
4. Run the pipeline:
   ```bash
   node index.mjs
   ```

## License

MIT
