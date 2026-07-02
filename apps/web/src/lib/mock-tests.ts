import type { TestMaster } from "@/types/order";

export const MOCK_TESTS: TestMaster[] = [
  // Hematologi
  { id: "t-001", code: "DL", name: "Darah Lengkap (CBC)", category: "Hematologi", price: 85000, unit: "Panel", turnaroundHours: 2 },
  { id: "t-002", code: "LED", name: "Laju Endap Darah", category: "Hematologi", price: 35000, unit: "mm/jam", minRef: 0, maxRef: 20, turnaroundHours: 2 },
  { id: "t-003", code: "GOLDAR", name: "Golongan Darah", category: "Hematologi", price: 45000, unit: "-", turnaroundHours: 1 },
  { id: "t-004", code: "APTT", name: "APTT (Koagulasi)", category: "Hematologi", price: 120000, unit: "detik", minRef: 25, maxRef: 38, turnaroundHours: 3 },

  // Kimia Klinik
  { id: "t-005", code: "GDS", name: "Gula Darah Sewaktu", category: "Kimia Klinik", price: 40000, unit: "mg/dL", minRef: 70, maxRef: 200, turnaroundHours: 1 },
  { id: "t-006", code: "GDP", name: "Gula Darah Puasa", category: "Kimia Klinik", price: 40000, unit: "mg/dL", minRef: 70, maxRef: 100, turnaroundHours: 1 },
  { id: "t-007", code: "HBA1C", name: "HbA1c", category: "Kimia Klinik", price: 175000, unit: "%", minRef: 4.0, maxRef: 5.6, turnaroundHours: 4 },
  { id: "t-008", code: "CHOL", name: "Kolesterol Total", category: "Kimia Klinik", price: 55000, unit: "mg/dL", minRef: 0, maxRef: 200, turnaroundHours: 2 },
  { id: "t-009", code: "TRIG", name: "Trigliserida", category: "Kimia Klinik", price: 65000, unit: "mg/dL", minRef: 0, maxRef: 150, turnaroundHours: 2 },
  { id: "t-010", code: "HDL", name: "Kolesterol HDL", category: "Kimia Klinik", price: 65000, unit: "mg/dL", minRef: 40, maxRef: 60, turnaroundHours: 2 },
  { id: "t-011", code: "LDL", name: "Kolesterol LDL", category: "Kimia Klinik", price: 65000, unit: "mg/dL", minRef: 0, maxRef: 130, turnaroundHours: 2 },
  { id: "t-012", code: "UREUM", name: "Ureum (BUN)", category: "Kimia Klinik", price: 60000, unit: "mg/dL", minRef: 10, maxRef: 50, turnaroundHours: 2 },
  { id: "t-013", code: "KREAT", name: "Kreatinin Serum", category: "Kimia Klinik", price: 55000, unit: "mg/dL", minRef: 0.6, maxRef: 1.2, turnaroundHours: 2 },

  // Liver Function
  { id: "t-014", code: "SGOT", name: "SGOT (AST)", category: "Liver Function", price: 60000, unit: "U/L", minRef: 0, maxRef: 40, turnaroundHours: 2 },
  { id: "t-015", code: "SGPT", name: "SGPT (ALT)", category: "Liver Function", price: 60000, unit: "U/L", minRef: 0, maxRef: 41, turnaroundHours: 2 },
  { id: "t-016", code: "BILTOT", name: "Bilirubin Total", category: "Liver Function", price: 70000, unit: "mg/dL", minRef: 0, maxRef: 1.2, turnaroundHours: 3 },

  // Serologi
  { id: "t-017", code: "HBsAg", name: "HBsAg (Hepatitis B)", category: "Serologi", price: 95000, unit: "Reaktif/Non-reaktif", turnaroundHours: 3 },
  { id: "t-018", code: "ANTIHHIV", name: "Anti-HIV", category: "Serologi", price: 150000, unit: "Reaktif/Non-reaktif", turnaroundHours: 4 },
  { id: "t-019", code: "WIDAL", name: "Widal Test (Tifoid)", category: "Serologi", price: 85000, unit: "Titer", turnaroundHours: 3 },
  { id: "t-020", code: "DENGUE", name: "Dengue NS1 Antigen", category: "Serologi", price: 175000, unit: "Reaktif/Non-reaktif", turnaroundHours: 3 },

  // Urinalisis
  { id: "t-021", code: "UA", name: "Urinalisis Lengkap", category: "Urinalisis", price: 50000, unit: "Panel", turnaroundHours: 1 },
  { id: "t-022", code: "UACID", name: "Asam Urat", category: "Urinalisis", price: 55000, unit: "mg/dL", minRef: 3.5, maxRef: 7.2, turnaroundHours: 2 },

  // Thyroid
  { id: "t-023", code: "TSH", name: "TSH (Thyroid Stimulating)", category: "Thyroid", price: 130000, unit: "mIU/L", minRef: 0.4, maxRef: 4.0, turnaroundHours: 4 },
  { id: "t-024", code: "FT4", name: "Free T4 (Tiroksin Bebas)", category: "Thyroid", price: 140000, unit: "ng/dL", minRef: 0.8, maxRef: 1.8, turnaroundHours: 4 },
];

export const TEST_CATEGORIES = [...new Set(MOCK_TESTS.map((t) => t.category))];
