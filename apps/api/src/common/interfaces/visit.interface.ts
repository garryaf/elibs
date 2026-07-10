/**
 * Visit Module — Public Interface
 * Only these methods/types should be used by other modules.
 */
export interface IVisitService {
  validateVisitForOrder(visitId: string): Promise<void>;
  transitionToInProgress(visitId: string): Promise<void>;
}

export interface VisitInfo {
  id: string;
  visitNumber: string;
  patientId: string;
  status: string;
}
