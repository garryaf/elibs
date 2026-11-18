/**
 * Extracts a named cookie value from a raw HTTP `Cookie` header string
 * without requiring external middleware such as `cookie-parser`.
 */
export function extractCookie(
  cookieHeader: string | undefined,
  name: string,
): string | null {
  if (!cookieHeader) return null;
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const eqIndex = pair.indexOf('=');
    if (eqIndex === -1) continue;
    const key = pair.slice(0, eqIndex).trim();
    if (key === name) {
      try {
        return decodeURIComponent(pair.slice(eqIndex + 1).trim());
      } catch {
        return pair.slice(eqIndex + 1).trim();
      }
    }
  }
  return null;
}
