export type Gender = "MALE" | "FEMALE";

export type PatientStatus = "ACTIVE" | "INACTIVE";

export interface Patient {
  id: string;
  mrn: string;
  nik: string;
  name: string;
  dob: string; // ISO date string (YYYY-MM-DD)
  gender: Gender;
  phone: string;
  address: string;
  email?: string;
  // Phase G: Geographic fields
  province?: string;
  city?: string;
  district?: string;
  village?: string;
  postalCode?: string;
  // Clinical fields
  bloodType?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  // Status
  status: PatientStatus;
  createdAt: string;
  lastVisit?: string;
}

export interface PatientFormData {
  nik: string;
  name: string;
  dob: string;
  gender: Gender;
  phone: string;
  address: string;
  email?: string;
  // Phase G: Geographic fields
  province?: string;
  city?: string;
  district?: string;
  village?: string;
  postalCode?: string;
  // Clinical fields
  bloodType?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
}
