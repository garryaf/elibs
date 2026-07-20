/**
 * Lab domain types for frontend type safety
 */

export type SampleCondition =
  | "ACCEPTABLE"
  | "LIPEMIC"
  | "HEMOLYTIC"
  | "CLOTTED"
  | "INSUFFICIENT";

export const SAMPLE_CONDITIONS: { value: SampleCondition; label: string }[] = [
  { value: "ACCEPTABLE", label: "Layak" },
  { value: "LIPEMIC", label: "Lipemik" },
  { value: "HEMOLYTIC", label: "Hemolisis" },
  { value: "CLOTTED", label: "Membeku" },
  { value: "INSUFFICIENT", label: "Volume Kurang" },
];
