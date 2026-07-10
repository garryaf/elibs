/**
 * Patient Module — Public Interface
 * Only these methods/types should be used by other modules.
 */
export interface IPatientService {
  findById(id: string): Promise<PatientInfo | null>;
  findByNik(nik: string): Promise<PatientInfo | null>;
  validatePatientExists(id: string): Promise<void>;
}

export interface PatientInfo {
  id: string;
  mrn: string;
  nik: string;
  name: string;
  dateOfBirth: Date;
  gender: 'MALE' | 'FEMALE';
  phone: string | null;
  email: string | null;
}
