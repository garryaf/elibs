import { z } from "zod";

/**
 * Order schemas — mirrors backend CreateOrderDto validation
 */

export const PaymentMethod = z.enum([
  "CASH",
  "BPJS",
  "TRANSFER",
  "INSURANCE",
  "EDC",
  "INSURANCE_CASH_FALLBACK",
  "CORPORATE_DEFERRED",
]);

export const createOrderSchema = z.object({
  patientId: z.string().uuid("Patient ID wajib format UUID"),
  visitId: z.string().uuid("Visit ID wajib format UUID"),
  testIds: z
    .array(z.string().uuid())
    .min(1, "Minimal 1 pemeriksaan harus dipilih"),
  clinicId: z.string().uuid().optional(),
  doctorId: z.string().uuid().optional(),
  insuranceId: z.string().uuid().optional(),
});

export const processPaymentSchema = z.object({
  paymentMethod: PaymentMethod,
  amountPaid: z.number().min(0, "Jumlah pembayaran harus positif"),
  notes: z.string().optional(),
});

export const splitPaymentComponentSchema = z.object({
  paymentMethod: PaymentMethod,
  amount: z.number().min(0.01, "Jumlah minimal 0.01"),
  insuranceId: z.string().uuid().optional(),
  reference: z.string().max(100).optional(),
  notes: z.string().optional(),
});

export const splitPaymentSchema = z.object({
  components: z
    .array(splitPaymentComponentSchema)
    .min(1, "Minimal 1 komponen pembayaran"),
});

export const cancelOrderSchema = z.object({
  reason: z.string().min(1, "Alasan pembatalan wajib diisi"),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ProcessPaymentInput = z.infer<typeof processPaymentSchema>;
export type SplitPaymentInput = z.infer<typeof splitPaymentSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
