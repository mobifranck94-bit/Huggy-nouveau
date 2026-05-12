/**
 * Custom Domain Manager - Handles subdomain generation and mappings
 * Similar to Lovable's preview URL model
 */

import crypto from 'crypto';

const DEFAULT_DOMAIN = process.env.HUGGY_DOMAIN || 'huggy.fun';

/**
 * Generate a URL-safe slug from project name
 * @param {string} projectName - Raw project name
 * @param {string} salt - Optional salt for uniqueness
 * @returns {string} URL-safe slug (e.g., "my-app-a1b2c3")
 */
export function generateSlug(projectName, salt = '') {
  if (!projectName || typeof projectName !== 'string') {
    projectName = 'huggy-app';
  }
  
  // Normalize: lowercase, remove special chars, trim
  let base = projectName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')  // Remove special chars except spaces and hyphens
    .replace(/\s+/g, '-')          // Spaces to hyphens
    .replace(/-+/g, '-')           // Collapse multiple hyphens
    .slice(0, 40);                 // Max 40 chars for base
  
  // Remove trailing hyphen
  base = base.replace(/-$/, '');
  
  // Add unique suffix if salt provided
  if (salt) {
    const hash = crypto.createHash('sha256').update(salt).digest('hex');
    const shortHash = hash.slice(0, 6);
    base = `${base}-${shortHash}`;
  } else {
    // Add timestamp-based suffix for uniqueness
    const timeSuffix = Date.now().toString(36).slice(-4);
    base = `${base}-${timeSuffix}`;
  }
  
  // Ensure max 63 chars (DNS label limit)
  return base.slice(0, 63);
}

/**
 * Generate full preview URL
 * @param {string} slug 
 * @param {string} domain 
 * @returns {string}
 */
export function generatePreviewUrl(slug, domain = DEFAULT_DOMAIN) {
  return `https://${slug}.${domain}`;
}

/**
 * Extract slug from preview URL
 * @param {string} url 
 * @param {string} domain 
 * @returns {string|null}
 */
export function extractSlugFromUrl(url, domain = DEFAULT_DOMAIN) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    const suffix = `.${domain}`;
    
    if (hostname.endsWith(suffix)) {
      return hostname.slice(0, -suffix.length);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Validate slug format
 * @param {string} slug 
 * @returns {boolean}
 */
export function isValidSlug(slug) {
  if (!slug || typeof slug !== 'string') return false;
  
  // Must be 1-63 chars, alphanumeric and hyphens only, no leading/trailing hyphen
  const validPattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
  return validPattern.test(slug) && slug.length <= 63;
}

/**
 * Generate deployment metadata for storage
 * @param {Object} params
 * @param {string} params.projectId 
 * @param {string} params.projectName
 * @param {string} params.vercelDeploymentId
 * @param {string} params.slug
 * @param {string} params.domain
 * @param {boolean} params.badgeEnabled
 * @returns {Object} Deployment record
 */
export function createDeploymentRecord({
  projectId,
  projectName,
  vercelDeploymentId,
  slug,
  domain = DEFAULT_DOMAIN,
  badgeEnabled = true,
}) {
  return {
    id: crypto.randomUUID(),
    project_id: projectId,
    project_name: projectName,
    slug,
    domain,
    url: generatePreviewUrl(slug, domain),
    vercel_deployment_id: vercelDeploymentId,
    badge_enabled: badgeEnabled,
    created_at: new Date().toISOString(),
  };
}

/**
 * Check if slug is available (placeholder - implement with DB check)
 * @param {string} slug 
 * @returns {Promise<boolean>}
 */
export async function isSlugAvailable(slug) {
  // TODO: Check Supabase deployments table
  // const { supabase } = await import('./supabase.mjs');
  // const { data } = await supabase.from('deployments').select('slug').eq('slug', slug).single();
  // return !data;
  return true; // For now, assume available
}

/**
 * Generate unique slug with collision detection
 * @param {string} projectName 
 * @returns {Promise<string>}
 */
export async function generateUniqueSlug(projectName) {
  let attempts = 0;
  let slug = generateSlug(projectName);
  
  while (attempts < 5) {
    if (await isSlugAvailable(slug)) {
      return slug;
    }
    // Add random suffix and try again
    const randomSuffix = crypto.randomBytes(3).toString('hex');
    slug = generateSlug(projectName, randomSuffix);
    attempts++;
  }
  
  // Fallback: use timestamp + random
  return generateSlug(projectName, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`);
}
