import { OrderInsurance } from '@prisma/client';

export interface OrderInsuranceResult {
  insuranceId: string;
  source: 'ORDER_INSURANCE_JUNCTION' | 'ORDER_LEGACY_FK';
  orderInsurance?: OrderInsurance;
}

export interface CascadeValidationResult {
  isConsistent: boolean;
  breakLevel?: 'ORDER' | 'VISIT' | 'PATIENT';
  message?: string;
  details?: {
    orderInsuranceId?: string;
    visitInsuranceId?: string;
    patientActiveInsurances?: string[];
  };
}

export interface MigrationReport {
  totalPatientRecords: number;
  totalOrderRecords: number;
  patientsMigrated: number;
  patientsSkipped: Array<{ patientId: string; reason: string }>;
  ordersMigrated: number;
  ordersSkipped: Array<{ orderId: string; reason: string }>;
  priorityConflictsResolved: number;
  batchId: string;
  executedAt: Date;
}
