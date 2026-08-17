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
