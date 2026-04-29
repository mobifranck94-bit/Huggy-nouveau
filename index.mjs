import { runFullPipeline } from './lib/pipeline.mjs';

// Exemple d'utilisation
const result = await runFullPipeline(
  "Crée un SaaS de gestion de tâches avec authentification, dark mode, et drag & drop"
);

console.log('Files generated:', result.files.map(f => f.path));
console.log('Reply:', result.reply);
console.log('Security score:', result.meta.secReport.score);
console.log('QA score:', result.meta.review.score);
