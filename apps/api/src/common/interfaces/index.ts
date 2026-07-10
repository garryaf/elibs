/**
 * Module Interface Contracts — Barrel Export
 *
 * These interfaces define the public API contracts between modules.
 * Other modules should depend on these interfaces rather than
 * importing service implementations directly (where practical).
 */
export * from './patient.interface';
export * from './order.interface';
export * from './visit.interface';
export * from './payment.interface';
export * from './notification.interface';
export * from './claim.interface';
