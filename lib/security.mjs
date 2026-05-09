import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { z } from 'zod';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

// ─── File Validation Schema ────────────────────────────────────────────────
const FileSchema = z.object({
  path: z.string().regex(/^[a-zA-Z0-9_\-\/\.]+$/, 'Invalid file path'),
  content: z.string().max(500000, 'File too large (max 500KB)'),
});

const FilesSchema = z.array(FileSchema).max(50, 'Too many files (max 50)');

// ─── Dangerous Patterns ────────────────────────────────────────────────────
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /eval\s*\(/gi,
  /new\s+Function\s*\(/gi,
  /setTimeout\s*\(\s*["'].*["']/gi,
  /setInterval\s*\(\s*["'].*["']/gi,
  /document\.write/gi,
  /innerHTML\s*=\s*["'].*["']/gi,
  /on\w+\s*=\s*["'].*["']/gi, // onclick, onload, etc.
  /fetch\s*\(\s*["']https?:\/\/(?!localhost|127\.0\.0\.1)/gi,
  /XMLHttpRequest/gi,
  /WebSocket/gi,
  /postMessage/gi,
];

// ─── Allowed File Extensions ─────────────────────────────────────────────────
const ALLOWED_EXTENSIONS = [
  '.tsx', '.ts', '.jsx', '.js', '.css', '.scss', '.less',
  '.html', '.json', '.md', '.svg', '.png', '.jpg', '.jpeg',
  '.gif', '.ico', '.woff', '.woff2', '.ttf', '.eot',
];

// ─── Security Headers to Inject ──────────────────────────────────────────────
const SECURITY_HEADERS = `
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co;">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<meta http-equiv="X-Frame-Options" content="DENY">
<meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin">
`;

export function validateFiles(files) {
  const errors = [];
  
  // 1. Schema validation
  try {
    FilesSchema.parse(files);
  } catch (err) {
    if (err instanceof z.ZodError) {
      err.errors.forEach(e => errors.push(`Schema error: ${e.message}`));
    }
    return { valid: false, errors };
  }
  
  // 2. Check each file
  for (const file of files) {
    const ext = file.path.slice(file.path.lastIndexOf('.')).toLowerCase();
    
    // Check extension
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      errors.push(`File "${file.path}": Extension "${ext}" not allowed`);
    }
    
    // Check for dangerous patterns in code files
    if (['.tsx', '.ts', '.jsx', '.js', '.html'].includes(ext)) {
      for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(file.content)) {
          errors.push(`File "${file.path}": Contains potentially dangerous code pattern`);
          break;
        }
      }
      
      // Check for external URLs (except allowed ones)
      const externalUrlPattern = /(https?:\/\/)(?!localhost|127\.0\.0\.1|0\.0\.0\.0|\.vercel\.app|\.netlify\.app|\.huggy\.app)[a-zA-Z0-9\-\.]+/g;
      const externalUrls = file.content.match(externalUrlPattern);
      if (externalUrls && externalUrls.length > 0) {
        // Only flag if not in comments or strings that look like imports
        const suspiciousUrls = externalUrls.filter(url => 
          !url.includes('unpkg.com') && 
          !url.includes('cdn.jsdelivr.net') && 
          !url.includes('esm.sh') &&
          !url.includes('fonts.googleapis.com')
        );
        if (suspiciousUrls.length > 0) {
          errors.push(`File "${file.path}": Contains suspicious external URLs: ${suspiciousUrls.join(', ')}`);
        }
      }
    }
    
    // 3. Sanitize HTML content
    if (ext === '.html') {
      file.content = purify.sanitize(file.content, {
        ALLOWED_TAGS: ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
                       'br', 'hr', 'strong', 'em', 'b', 'i', 'u', 's', 'a', 'img',
                       'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
                       'form', 'input', 'button', 'select', 'option', 'textarea',
                       'label', 'nav', 'header', 'footer', 'main', 'section', 'article',
                       'aside', 'figure', 'figcaption', 'blockquote', 'code', 'pre',
                       'canvas', 'svg', 'path', 'circle', 'rect', 'line', 'polyline',
                       'polygon', 'text', 'g', 'defs', 'use', 'symbol', 'linearGradient',
                       'radialGradient', 'stop', 'clipPath', 'mask'],
        ALLOWED_ATTR: ['class', 'id', 'style', 'href', 'src', 'alt', 'title', 
                       'width', 'height', 'type', 'placeholder', 'value', 'name',
                       'for', 'target', 'rel', 'disabled', 'readonly', 'required',
                       'checked', 'selected', 'multiple', 'size', 'min', 'max',
                       'step', 'pattern', 'accept', 'download', 'draggable', 'role',
                       'aria-label', 'aria-hidden', 'aria-expanded', 'aria-haspopup',
                       'aria-controls', 'aria-describedby', 'd', 'fill', 'stroke',
                       'stroke-width', 'viewBox', 'xmlns', 'x', 'y', 'cx', 'cy', 'r',
                       'rx', 'ry', 'x1', 'y1', 'x2', 'y2', 'points', 'transform',
                       'clip-path', 'mask', 'opacity', 'fill-opacity', 'stroke-opacity',
                       'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray',
                       'font-size', 'font-family', 'font-weight', 'text-anchor',
                       'dominant-baseline', 'letter-spacing', 'word-spacing'],
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    sanitized: true
  };
}

export function sanitizePrompt(prompt) {
  // Remove potential injection attempts
  return prompt
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .slice(0, 10000); // Max 10k characters
}

export function addSecurityHeaders(html) {
  // Inject security headers into HTML head
  return html.replace(/<head>/i, `<head>${SECURITY_HEADERS}`);
}

export function validateBuildRequest(req) {
  const { prompt, model, projectId } = req.body;
  const errors = [];
  
  if (!prompt || prompt.trim().length < 10) {
    errors.push('Prompt must be at least 10 characters');
  }
  
  if (prompt && prompt.length > 10000) {
    errors.push('Prompt too long (max 10k characters)');
  }
  
  const allowedModels = ['claude-sonnet-4-6', 'claude-haiku-4-5', 'gpt-4', 'gpt-3.5-turbo'];
  if (model && !allowedModels.includes(model)) {
    errors.push('Invalid model specified');
  }
  
  // Check for prompt injection attempts
  const suspiciousPatterns = [
    /ignore previous instructions/gi,
    /disregard all prior/gi,
    /system prompt/gi,
    /you are now/gi,
    /DAN mode/gi,
    /jailbreak/gi,
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(prompt)) {
      errors.push('Prompt contains potentially harmful patterns');
      break;
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    sanitizedPrompt: sanitizePrompt(prompt)
  };
}

export { SECURITY_HEADERS };
