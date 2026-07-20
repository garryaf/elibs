import { z } from "zod";

/**
 * Visit schemas — mirrors backend CreateVisitDto validation
 */

export const VisitPaymentMethod = z.enum([
  "CASH",
  "BPJS",
  "TRANSFER",
  "INSURANCE",
  "EDC",
  "INSURANCE_CASH_FALLBACK",
  "CORPORATE_DEFERRED",
]);

export const createVisitSchema = z.object({
  patientId: z.string().uuid("Patient ID wajib format UUID"),
  paymentMethod: VisitPaymentMethod,
  doctorId: z.string().uuid().optional(),
  clinicId: z.string().uuid().optional(),
  insuranceId: z.string().uuid().optional(),
  bpjsNumber: z.string().regex(/^\d{13}$/, "Nomor BPJS harus tepat 13 digit").optional(),
}).refine(
  (data) => {
    if (data.paymentMethod === "BPJS") return !!data.bpjsNumber;
    return true;
  },
  { message: "Nomor BPJS wajib diisi untuk pembayaran BPJS", path: ["bpjsNumber"] }
).refine(
  (data) => {
    if (data.paymentMethod === "INSURANCE") return !!data.insuranceId;
    return true;
  },
  { message: "Asuransi wajib dipilih untuk pembayaran Asuransi", path: ["insuranceId"] }
);

export type CreateVisitInput = z.infer<typeof createVisitSchema>;
