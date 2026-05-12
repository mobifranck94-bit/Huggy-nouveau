/**
 * Badge Injector - Adds "Made with Huggy" floating badge to deployed apps
 * Similar to Lovable's branding model
 */

const BADGE_STYLES = `
<style id="huggy-badge-styles">
  #huggy-badge {
    position: fixed;
    bottom: 16px;
    right: 16px;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: rgba(24, 24, 27, 0.95);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(63, 63, 70, 0.5);
    border-radius: 9999px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    font-family: Inter, system-ui, -apple-system, sans-serif;
    font-size: 12px;
    font-weight: 500;
    color: #e4e4e7;
    text-decoration: none;
    transition: all 0.2s ease;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }
  #huggy-badge:hover {
    transform: scale(1.05);
    background: rgba(39, 39, 42, 0.98);
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
  }
  #huggy-badge:active {
    transform: scale(0.98);
  }
  #huggy-badge svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
  #huggy-badge .huggy-text {
    white-space: nowrap;
  }
  @media (max-width: 480px) {
    #huggy-badge {
      bottom: 12px;
      right: 12px;
      padding: 6px 12px;
      font-size: 11px;
    }
    #huggy-badge svg {
      width: 14px;
      height: 14px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    #huggy-badge {
      transition: none;
    }
  }
</style>`;

const HUGGY_LOGO_SVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="24" height="24" rx="6" fill="#3b82f6"/>
  <path d="M7 12l3 3 7-7" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const BADGE_HTML = `
<a href="https://huggy.dev" target="_blank" rel="noopener noreferrer" id="huggy-badge" aria-label="Made with Huggy - AI App Builder">
  ${HUGGY_LOGO_SVG}
  <span class="huggy-text">Made with Huggy</span>
</a>`;

/**
 * Inject badge into HTML content
 * @param {string} html - Original HTML
 * @param {Object} options - Injection options
 * @param {boolean} options.badgeEnabled - Whether to show badge (default: true)
 * @param {string} options.position - Badge position: 'bottom-right' | 'bottom-left' | 'bottom-center'
 * @returns {string} HTML with badge injected
 */
export function injectBadge(html, options = {}) {
  const { badgeEnabled = true, position = 'bottom-right' } = options;
  
  if (!badgeEnabled) return html;
  if (!html || typeof html !== 'string') return html;
  
  // Prepare badge with position override if needed
  let badge = BADGE_HTML;
  let styles = BADGE_STYLES;
  
  if (position === 'bottom-left') {
    styles = styles.replace('right: 16px;', 'left: 16px; right: auto;');
  } else if (position === 'bottom-center') {
    styles = styles.replace('right: 16px;', 'left: 50%; transform: translateX(-50%);');
    styles = styles.replace('#huggy-badge:hover {\n    transform: scale(1.05);', '#huggy-badge:hover {\n    transform: translateX(-50%) scale(1.05);');
  }
  
  // Inject before closing </body> tag
  if (html.includes('</body>')) {
    return html.replace('</body>', `${badge}\n${styles}\n</body>`);
  }
  
  // Fallback: inject before closing </html> tag
  if (html.includes('</html>')) {
    return html.replace('</html>', `${badge}\n${styles}\n</html>`);
  }
  
  // Last resort: append to end
  return html + '\n' + badge + '\n' + styles;
}

/**
 * Check if HTML already has badge
 * @param {string} html 
 * @returns {boolean}
 */
export function hasBadge(html) {
  return html && html.includes('id="huggy-badge"');
}

/**
 * Remove badge from HTML (for Pro tier)
 * @param {string} html 
 * @returns {string}
 */
export function removeBadge(html) {
  if (!html || typeof html !== 'string') return html;
  
  // Remove badge element and styles
  return html
    .replace(/<a[^>]*id="huggy-badge"[^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/<style[^>]*id="huggy-badge-styles"[^>]*>[\s\S]*?<\/style>/gi, '');
}

/**
 * Generate preview URL with custom domain
 * @param {string} slug - Project slug
 * @param {string} customDomain - Base domain (e.g., 'huggy.dev')
 * @returns {string} Full preview URL
 */
export function generatePreviewUrl(slug, customDomain = 'huggy.dev') {
  return `https://${slug}.${customDomain}`;
}
