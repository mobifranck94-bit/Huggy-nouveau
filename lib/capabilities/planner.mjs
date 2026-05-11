import { llmGateway } from '../llm/gateway.mjs';
import { CAPABILITY_PLANNER_PROMPT } from '../prompts/systemBuilderPrompt.mjs';

const DEFAULT_PLAN = {
  needsBackend: false,
  backendReason: '',
  needsDatabase: false,
  databaseTables: [],
  needsAuth: false,
  needsStorage: false,
  needsPayments: false,
  needsEmail: false,
  needsExternalApi: false,
  externalApis: [],
  envVars: [],
  needsWebSearch: false,
  webSearchQueries: [],
  supabaseArtifacts: [],
  setupChecklist: [],
};

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).filter(v => typeof v === 'string').map(v => v.trim()).filter(Boolean))];
}

function normalizeExternalApis(values) {
  return (Array.isArray(values) ? values : [])
    .filter(v => v && typeof v === 'object')
    .map(v => ({
      name: String(v.name || 'External API').trim(),
      requiresKey: v.requiresKey !== false,
      envVar: String(v.envVar || '').trim(),
      reason: String(v.reason || '').trim(),
      secretPlacement: v.secretPlacement === 'client' ? 'client' : 'server',
    }))
    .filter(v => v.name);
}

function bool(v) {
  return v === true;
}

function inferPlanFromPrompt(prompt = '') {
  const text = prompt.toLowerCase();
  const plan = structuredClone(DEFAULT_PLAN);

  const authWords = /(login|signup|sign up|connexion|inscription|compte|auth|utilisateur|profil|profile|collaboratif|collaborative)/i;
  const dbWords = /(database|base de donn|persist|sauvegard|save|crud|collaboratif|collaborative|temps r.el|real.?time|admin|dashboard utilisateur|user data|posts|articles|tasks|orders|bookings|reservations)/i;
  const storageWords = /(upload|image upload|fichier|file upload|avatar|storage|photo)/i;
  const paymentWords = /(stripe|paiement|payment|checkout|subscription|abonnement|billing|facturation)/i;
  const emailWords = /(email|mail|newsletter|contact form|formulaire de contact|resend|brevo)/i;
  const weatherWords = /(m.t.o|meteo|weather|forecast|openweather)/i;
  const mapWords = /(map|carte|maps|google maps|mapbox|geolocation|g.olocalisation|itin.raire)/i;
  const aiWords = /(openai|chatgpt|claude|gemini|ai api|g.n.rateur ia|assistant ia)/i;

  if (authWords.test(text)) plan.needsAuth = true;
  if (dbWords.test(text)) plan.needsDatabase = true;
  if (storageWords.test(text)) plan.needsStorage = true;
  if (paymentWords.test(text)) plan.needsPayments = true;
  if (emailWords.test(text)) plan.needsEmail = true;

  plan.needsBackend = plan.needsDatabase || plan.needsAuth || plan.needsStorage || plan.needsPayments || plan.needsEmail;
  if (plan.needsBackend) plan.backendReason = 'The request implies persistent, secure, or server-side data handling.';

  if (weatherWords.test(text)) {
    plan.needsExternalApi = true;
    plan.needsWebSearch = true;
    plan.externalApis.push({ name: 'OpenWeather', requiresKey: true, envVar: 'OPENWEATHER_API_KEY', reason: 'Weather forecast/current weather data', secretPlacement: 'server' });
    plan.webSearchQueries.push('OpenWeather current weather API docs');
  }
  if (mapWords.test(text)) {
    plan.needsExternalApi = true;
    plan.needsWebSearch = true;
    plan.externalApis.push({ name: 'Maps provider', requiresKey: true, envVar: 'MAPS_API_KEY', reason: 'Maps/geolocation rendering', secretPlacement: 'server' });
    plan.webSearchQueries.push('Google Maps JavaScript API or Mapbox docs');
  }
  if (aiWords.test(text)) {
    plan.needsExternalApi = true;
    plan.needsBackend = true;
    plan.externalApis.push({ name: 'AI provider', requiresKey: true, envVar: 'AI_PROVIDER_API_KEY', reason: 'AI model calls must be protected server-side', secretPlacement: 'server' });
  }

  if (plan.needsDatabase) {
    plan.databaseTables = ['profiles', 'items'];
    plan.supabaseArtifacts.push('supabase/migration.sql');
  }
  if (plan.needsAuth) plan.supabaseArtifacts.push('supabase auth client integration');
  if (plan.needsPayments) plan.supabaseArtifacts.push('supabase/functions/checkout/index.ts', 'supabase/functions/stripe-webhook/index.ts');
  if (plan.needsExternalApi) plan.supabaseArtifacts.push('supabase/functions/api-proxy/index.ts');

  plan.envVars = [
    ...(plan.needsBackend || plan.needsDatabase || plan.needsAuth ? ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] : []),
    ...(plan.needsPayments ? ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] : []),
    ...plan.externalApis.map(api => api.envVar).filter(Boolean),
  ];

  plan.setupChecklist = plan.envVars.map(v => `Configure ${v} in your deployment environment`);
  return plan;
}

export function normalizeCapabilityPlan(plan, prompt = '') {
  const fallback = inferPlanFromPrompt(prompt);
  const raw = plan && typeof plan === 'object' ? plan : fallback;
  const externalApis = normalizeExternalApis(raw.externalApis);
  const envVars = uniqueStrings([...(raw.envVars || []), ...externalApis.map(api => api.envVar)]);
  const needsBackend = bool(raw.needsBackend) || bool(raw.needsDatabase) || bool(raw.needsAuth) || bool(raw.needsStorage) || bool(raw.needsPayments) || bool(raw.needsEmail) || externalApis.some(api => api.secretPlacement !== 'client');

  return {
    ...DEFAULT_PLAN,
    ...raw,
    needsBackend,
    backendReason: String(raw.backendReason || fallback.backendReason || '').slice(0, 240),
    needsDatabase: bool(raw.needsDatabase),
    databaseTables: uniqueStrings(raw.databaseTables || fallback.databaseTables),
    needsAuth: bool(raw.needsAuth),
    needsStorage: bool(raw.needsStorage),
    needsPayments: bool(raw.needsPayments),
    needsEmail: bool(raw.needsEmail),
    needsExternalApi: bool(raw.needsExternalApi) || externalApis.length > 0,
    externalApis,
    envVars: uniqueStrings(envVars.concat(fallback.envVars || [])),
    needsWebSearch: bool(raw.needsWebSearch),
    webSearchQueries: uniqueStrings(raw.webSearchQueries || fallback.webSearchQueries).slice(0, 3),
    supabaseArtifacts: uniqueStrings(raw.supabaseArtifacts || fallback.supabaseArtifacts),
    setupChecklist: uniqueStrings(raw.setupChecklist || fallback.setupChecklist).slice(0, 8),
  };
}

export async function planCapabilities(prompt, intent = {}, existingFiles = [], callbacks = {}) {
  const userPrompt = [
    `# USER REQUEST\n${prompt}`,
    `# INTENT\n${JSON.stringify(intent, null, 2)}`,
    existingFiles.length ? `# EXISTING FILES\n${existingFiles.map(f => f.path).join('\n')}` : '',
  ].filter(Boolean).join('\n\n');

  try {
    const result = await llmGateway.streamGenerate('Capability Planner', userPrompt, {
      temperature: 0.05,
      onThinking: line => callbacks.onThinking?.(line),
    }, CAPABILITY_PLANNER_PROMPT);

    if (!result.success) throw new Error(result.error || 'Capability Planner failed');
    const parsed = llmGateway.parseJSON(result.content);
    return normalizeCapabilityPlan(parsed, prompt);
  } catch (err) {
    callbacks.onThinking?.(`Capability fallback used: ${err.message}`);
    return normalizeCapabilityPlan(inferPlanFromPrompt(prompt), prompt);
  }
}

export function buildCapabilityContext(plan) {
  if (!plan) return '';
  return `# CAPABILITY PLAN\n${JSON.stringify(plan, null, 2)}\n\n# SETUP REQUIREMENTS\n- Generate .env.example or README setup instructions for every env var above.\n- Never hardcode secrets.\n- If a private API key is required, use a Supabase Edge Function proxy rather than exposing it in frontend code.`;
}
