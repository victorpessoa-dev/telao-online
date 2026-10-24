const CHURCH_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Normalizes route and query input before it reaches public database RPCs.
 *
 * @param {unknown} value - Raw value received from a route or query string.
 * @returns {string} Lowercase, trimmed candidate slug.
 */
export function normalizeChurchSlug(value) {
  return String(value || "").trim().toLowerCase();
}

/**
 * Checks whether a value follows the public church URL contract.
 *
 * @param {unknown} value - Raw or normalized slug candidate.
 * @returns {boolean} True only for lowercase hyphen-separated identifiers.
 */
export function isValidChurchSlug(value) {
  return CHURCH_SLUG_PATTERN.test(normalizeChurchSlug(value));
}
