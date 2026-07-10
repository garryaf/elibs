/**
 * Interface contract for the Approval module.
 *
 * Consuming modules that need to create or query approval requests
 * should depend on this interface rather than importing the concrete
 * ApprovalService directly.
 */

export interface IApprovalService {
  createRequest(
    type: string,
    requesterId: string,
    payload: unknown,
    maxLevel?: number,
  ): Promise<{ id: string; status: string }>;
  getRequestStatus(
    id: string,
  ): Promise<{ id: string; status: string; currentLevel: number }>;
}

/**
 * Injection token for IApprovalService.
 * Use with @Inject(APPROVAL_SERVICE) in consuming modules.
 */
export const APPROVAL_SERVICE = 'APPROVAL_SERVICE';
