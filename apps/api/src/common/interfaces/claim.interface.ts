/**
 * Claim Module — Public Interface
 * Only these methods/types should be used by other modules.
 */
export interface IClaimService {
  submitClaim(dto: {
    orderInsuranceId: string;
    claimReference?: string;
  }): Promise<any>;
  getClaimHistory(orderId: string): Promise<{ data: ClaimInfo[] }>;
}

export interface ClaimInfo {
  id: string;
  orderId: string;
  insuranceId: string;
  coverageType: string;
  claimStatus: string;
  claimReference: string | null;
  coveredAmount: number | null;
}
