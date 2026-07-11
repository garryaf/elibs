/**
 * Shared formatters for the eLIS frontend.
 */

/**
 * Formats a number as Indonesian Rupiah (Rp) using Intl.NumberFormat.
 * Returns "Rp 0" for zero/NaN values.
 */
export function formatRupiah(amount: number): string {
  if (!amount && amount !== 0) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
