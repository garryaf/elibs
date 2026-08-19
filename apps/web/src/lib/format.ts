/**
 * Shared formatters for the eLIS frontend.
 */

/**
 * Formats a number as Indonesian Rupiah (Rp) using Intl.NumberFormat.
 * Returns "Rp 0" for zero/NaN values.
 * Handles Prisma Decimal values (which may arrive as strings) by coercing to number.
 */
export function formatRupiah(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (!num && num !== 0) return "Rp 0";
  if (isNaN(num)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Generates uppercase initials from a person or entity name (up to `maxInitials`, default 2).
 * Examples:
 * - "Budi Santoso" -> "BS"
 * - "Siti Aminah Putri" -> "SA"
 * - "Budi" -> "B"
 * - "Dr. John Doe" -> "DJ"
 * - "" / null / undefined -> "?"
 */
export function getInitials(name?: string | null, maxInitials: number = 2): string {
  if (!name || typeof name !== "string") return "?";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  return words
    .slice(0, maxInitials)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase();
}

