/**
 * Parses a CORS_ORIGINS configuration string into an array of trimmed origin strings,
 * or returns `true` if the wildcard '*' is specified.
 *
 * This mirrors the parsing logic in main.ts:
 *   origins === '*' ? true : origins.split(',').map(o => o.trim())
 */
export function parseCorsOrigins(originsStr: string): true | string[] {
  if (originsStr === '*') {
    return true;
  }
  return originsStr.split(',').map((o) => o.trim());
}
