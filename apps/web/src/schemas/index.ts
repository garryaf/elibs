/**
 * eLIS — Zod Validation Schemas
 *
 * Usage:
 *   import { createPatientSchema, loginSchema } from "@/schemas";
 *
 * Each schema mirrors the backend DTO validation rules.
 * Can be used with React Hook Form via @hookform/resolvers/zod.
 */

export * from "./patient";
export * from "./order";
export * from "./user";
export * from "./visit";
