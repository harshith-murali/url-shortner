/**
 * aliasUtils.js
 *
 * Single source of truth for custom-alias handling.
 * Used by the shorten API and any future route that accepts user-defined slugs.
 *
 * Slug namespace note:
 *   Both shortCode (auto-generated) and customAlias share the same public
 *   URL namespace (/[slug]). Every collision check must query BOTH fields.
 */

/** Maximum allowed alias length (characters). */
export const MAX_ALIAS_LENGTH = 60;

/**
 * Routes and static paths that must never be usable as aliases.
 * Extend this list when new top-level routes are added.
 */
export const RESERVED_ALIASES = new Set([
  // Application routes
  'api',
  'dashboard',
  'analytics',
  'sign-in',
  'sign-up',
  'not-found',
  // Next.js internals
  '_next',
  '_vercel',
  // Static assets
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
  'manifest.json',
  // Common reserved names
  'admin',
  'login',
  'logout',
  'register',
  'account',
  'settings',
  'profile',
  'help',
  'support',
  'about',
  'pricing',
  'terms',
  'privacy',
  'home',
  'index',
  'null',
  'undefined',
]);

/**
 * Normalize a raw alias string into a canonical slug.
 *
 * Steps:
 *   1. Trim leading/trailing whitespace
 *   2. Convert to lowercase
 *   3. Replace one or more whitespace characters with a single hyphen
 *
 * Returns the normalized string, or an empty string if the input was empty/null.
 *
 * @param {string|null|undefined} raw
 * @returns {string}
 */
export function normalizeAlias(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

/**
 * Validate a **already-normalized** alias.
 *
 * Rules:
 *   - Must not be empty
 *   - Must not exceed MAX_ALIAS_LENGTH characters
 *   - Must contain only lowercase letters, digits, hyphens, and underscores
 *
 * @param {string} alias — the output of normalizeAlias()
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateAlias(alias) {
  if (!alias) {
    return { valid: false, error: 'Alias cannot be empty.' };
  }
  if (alias.length > MAX_ALIAS_LENGTH) {
    return {
      valid: false,
      error: `Alias must be ${MAX_ALIAS_LENGTH} characters or fewer.`,
    };
  }
  if (!/^[a-z0-9-_]+$/.test(alias)) {
    return {
      valid: false,
      error:
        'Alias may only contain lowercase letters, numbers, hyphens, and underscores.',
    };
  }
  return { valid: true };
}

/**
 * Check whether a normalized alias conflicts with a reserved application route.
 *
 * @param {string} alias — the output of normalizeAlias()
 * @returns {boolean}
 */
export function isReservedAlias(alias) {
  return RESERVED_ALIASES.has(alias);
}
