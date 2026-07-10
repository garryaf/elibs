import { z } from "zod";

/**
 * User schemas — mirrors backend CreateUserDto validation
 */

export const Role = z.enum([
  "SUPER_ADMIN",
  "OWNER",
  "MANAGER",
  "ADMIN",
  "KASIR",
  "CS",
  "SAMPLING",
  "ANALIS",
  "DOKTER",
  "MARKETING",
  "KLINIK_PARTNER",
]);

export const createUserSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter"),
  role: Role,
  name: z.string().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().optional(),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .optional()
    .or(z.literal("")),
  role: Role.optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
