export interface PatientOption {
  id: string;
  name: string;
  mrn: string;
  nik: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE";
}
