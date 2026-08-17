/**
 * Auto-flagging logic for laboratory results.
 *
 * This module contains the pure function that determines the result flag
 * based on the numeric result value and configured reference ranges.
 *
 * Requirements: 2.7, 3.1
 */

/**
 * Result flags produced by auto-flagging logic.
 */
export enum ResultFlag {
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  LOW = 'LOW',
  CRITICAL = 'CRITICAL',
}

/**
 * Reference range configuration for a test parameter.
 *
 * - minRef/maxRef define the normal range (inclusive)
 * - criticalMin/criticalMax define life-threatening thresholds (exclusive bounds for CRITICAL)
 */
export interface ReferenceRange {
  minRef: number;
  maxRef: number;
  criticalMin?: number;
  criticalMax?: number;
}

/**
 * Determines the result flag for a numeric result value based on configured reference ranges.
 *
 * Rules:
 * - NORMAL: value is between minRef and maxRef (inclusive)
 * - HIGH: value > maxRef and value <= criticalMax (or no criticalMax configured)
 * - LOW: value < minRef and value >= criticalMin (or no criticalMin configured)
 * - CRITICAL: value > criticalMax or value < criticalMin
 *
 * @param value - The numeric result value
 * @param range - The reference range configuration
 * @returns The computed result flag
 */
export function applyAutoFlag(value: number, range: ReferenceRange): ResultFlag {
  const { minRef, maxRef, criticalMin, criticalMax } = range;

  // Check NORMAL first (inclusive bounds)
  if (value >= minRef && value <= maxRef) {
    return ResultFlag.NORMAL;
  }

  // Value is above normal range
  if (value > maxRef) {
    // Check if it exceeds critical high threshold
    if (criticalMax !== undefined && value > criticalMax) {
      return ResultFlag.CRITICAL;
    }
    return ResultFlag.HIGH;
  }

  // Value is below normal range (value < minRef)
  if (criticalMin !== undefined && value < criticalMin) {
    return ResultFlag.CRITICAL;
  }
  return ResultFlag.LOW;
}
