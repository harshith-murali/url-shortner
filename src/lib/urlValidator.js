/**
 * urlValidator.js
 *
 * Server-side URL validation for the shorten API.
 *
 * Consciously accepted limitations:
 *   - This service only performs redirects, not outbound fetches, so it is
 *     NOT vulnerable to conventional SSRF. Blocking private IPs is a defense-
 *     in-depth measure to prevent the short-link service from becoming a proxy
 *     for internal infrastructure links.
 *   - Punycode/IDN hostnames are permitted because Next.js's URL parser handles
 *     them. Blocking exotic Unicode domains would prevent legitimate use cases.
 *   - URL reachability is NOT checked — this keeps latency low.
 */

/** Maximum URL length accepted (chars). Browsers cap URLs around 2 MB; we use 2048. */
export const MAX_URL_LENGTH = 2048;

/** IPv4 private / loopback ranges (prefix checks). */
const PRIVATE_IP_PREFIXES = [
  '127.',    // loopback
  '10.',     // RFC 1918
  '192.168.',// RFC 1918
  '172.16.', '172.17.', '172.18.', '172.19.',
  '172.20.', '172.21.', '172.22.', '172.23.',
  '172.24.', '172.25.', '172.26.', '172.27.',
  '172.28.', '172.29.', '172.30.', '172.31.', // RFC 1918
  '169.254.',// link-local
  '::1',     // IPv6 loopback
  'fc', 'fd', // IPv6 ULA
];

const PRIVATE_HOSTNAMES = new Set([
  'localhost',
  'local',
  '0.0.0.0',
]);

/**
 * Validate a URL string for use as a redirect destination.
 *
 * @param {string} rawUrl
 * @returns {{ valid: boolean, url?: URL, error?: string }}
 */
export function validateUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'URL is required.' };
  }

  const trimmed = rawUrl.trim();

  if (trimmed.length > MAX_URL_LENGTH) {
    return {
      valid: false,
      error: `URL must be ${MAX_URL_LENGTH} characters or fewer.`,
    };
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      valid: false,
      error: 'Please enter a valid URL starting with http:// or https://',
    };
  }

  // Only http and https are permitted
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      valid: false,
      error: 'Please enter a valid URL starting with http:// or https://',
    };
  }

  // Reject embedded credentials (user:pass@host)
  if (parsed.username || parsed.password) {
    return {
      valid: false,
      error: 'URLs with embedded credentials are not permitted.',
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost / private-network destinations in production
  if (process.env.NODE_ENV === 'production') {
    if (PRIVATE_HOSTNAMES.has(hostname)) {
      return {
        valid: false,
        error: 'Destination URLs pointing to localhost or private networks are not permitted.',
      };
    }

    for (const prefix of PRIVATE_IP_PREFIXES) {
      if (hostname.startsWith(prefix)) {
        return {
          valid: false,
          error: 'Destination URLs pointing to localhost or private networks are not permitted.',
        };
      }
    }
  }

  return { valid: true, url: parsed, trimmedUrl: trimmed };
}
