import { Role } from '@prisma/client';

/**
 * Configuration for threshold-based routing of discount approval requests.
 *
 * Each entry defines a discount percentage range [minPercent, maxPercent)
 * and the corresponding approval requirements:
 * - requiredMaxLevel: How many approval levels are needed
 * - allowedRoles: Which roles can approve at this threshold
 *
 * Requirements: 9.4, 9.5
 */
export interface DiscountRoutingRule {
  /** Inclusive lower bound of discount percentage */
  minPercent: number;
  /** Exclusive upper bound of discount percentage (use Infinity for open-ended) */
  maxPercent: number;
  /** Number of approval levels required */
  requiredMaxLevel: number;
  /** Roles allowed to approve discounts in this range */
  allowedRoles: Role[];
}

/**
 * Default discount routing configuration.
 *
 * Tiered structure:
 * - 0–10%: Single-level approval by MANAGER, OWNER, or SUPER_ADMIN
 * - 10–25%: Two-level approval by MANAGER, OWNER, or SUPER_ADMIN
 * - 25–50%: Two-level approval by OWNER or SUPER_ADMIN only
 * - 50%+: Three-level approval by SUPER_ADMIN only
 */
export const DISCOUNT_ROUTING_CONFIG: DiscountRoutingRule[] = [
  {
    minPercent: 0,
    maxPercent: 10,
    requiredMaxLevel: 1,
    allowedRoles: [Role.MANAGER, Role.OWNER, Role.SUPER_ADMIN],
  },
  {
    minPercent: 10,
    maxPercent: 25,
    requiredMaxLevel: 2,
    allowedRoles: [Role.MANAGER, Role.OWNER, Role.SUPER_ADMIN],
  },
  {
    minPercent: 25,
    maxPercent: 50,
    requiredMaxLevel: 2,
    allowedRoles: [Role.OWNER, Role.SUPER_ADMIN],
  },
  {
    minPercent: 50,
    maxPercent: Infinity,
    requiredMaxLevel: 3,
    allowedRoles: [Role.SUPER_ADMIN],
  },
];

/**
 * Resolve the routing rule for a given discount percentage.
 * Returns the matching rule or null if no rule matches (should not happen
 * with a well-configured routing table that covers 0–Infinity).
 */
export function resolveDiscountRoutingRule(
  discountPercent: number,
  config: DiscountRoutingRule[] = DISCOUNT_ROUTING_CONFIG,
): DiscountRoutingRule | null {
  return (
    config.find(
      (rule) =>
        discountPercent >= rule.minPercent && discountPercent < rule.maxPercent,
    ) ?? null
  );
}
