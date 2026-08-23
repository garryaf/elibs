import { z } from "zod";

/**
 * Patient schemas — mirrors backend CreatePatientDto validation
 */

export const Gender = z.enum(["MALE", "FEMALE"]);

/**
 * Region IDs use EMSIFA (Indonesian administrative code) format:
 * - Provinsi: 2 digits (e.g., "11", "32")
 * - Kabupaten/Kota: 4 digits (e.g., "1101", "3201")
 * - Kecamatan: 6-7 digits (e.g., "110101", "1107061")
 * - Kelurahan/Desa: 10-13 digits (e.g., "1101012001")
 */
const regionCodeSchema = z.string().regex(/^\d{2,13}$/, "Kode wilayah tidak valid");

export const createPatientSchema = z.object({
  nik: z
    .string()
    .regex(/^\d{16}$/, "NIK harus tepat 16 digit angka"),
  name: z
    .string()
    .min(1, "Nama wajib diisi")
    .max(200, "Nama maksimal 200 karakter"),
  dateOfBirth: z
    .string()
    .min(1, "Tanggal lahir wajib diisi")
    .refine((val) => !isNaN(Date.parse(val)), "Format tanggal tidak valid")
    .refine((val) => new Date(val) <= new Date(), "Tanggal lahir tidak boleh di masa depan"),
  gender: Gender,
  phone: z.string().optional(),
  address: z.string().optional(),
  email: z.string().email("Format email tidak valid").optional().or(z.literal("")),
  province: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  village: z.string().optional(),
  postalCode: z.string().optional(),
  provinsiId: regionCodeSchema.optional(),
  kabupatenKotaId: regionCodeSchema.optional(),
  kecamatanId: regionCodeSchema.optional(),
  kelurahanDesaId: regionCodeSchema.optional(),
  bloodType: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  insuranceId: z.string().uuid().optional(),
  consentDigitalNotification: z.boolean().optional(),
});

export const updatePatientSchema = createPatientSchema.partial().omit({ nik: true });

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
