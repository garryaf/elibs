/**
 * Notification Module — Public Interface
 * Only these methods/types should be used by other modules.
 */
export interface INotificationService {
  queueNotification(
    orderId: string,
    type: string,
    recipient: string,
    metadata?: Record<string, string>,
  ): Promise<void>;
}
