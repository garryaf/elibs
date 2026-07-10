/**
 * Interface contract for the Notification module.
 *
 * Consuming modules (laboratory/order, approval, etc.) should depend on
 * this interface for triggering notifications rather than importing
 * the concrete NotificationService directly.
 */

export interface INotificationService {
  queueNotification(
    type: 'email' | 'whatsapp',
    payload: NotificationPayload,
  ): Promise<void>;
  sendTestEmail(
    recipientEmail: string,
  ): Promise<{ success: boolean; message: string }>;
}

export interface NotificationPayload {
  recipient: string;
  subject?: string;
  template: string;
  data: Record<string, unknown>;
}

/**
 * Injection token for INotificationService.
 * Use with @Inject(NOTIFICATION_SERVICE) in consuming modules.
 */
export const NOTIFICATION_SERVICE = 'NOTIFICATION_SERVICE';
