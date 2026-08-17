/**
 * Thrown when a notification delivery channel is not configured.
 * For example: FONNTE_TOKEN missing for WhatsApp, or SMTP credentials missing for email.
 *
 * This error signals that the delivery should be immediately marked as FAILED
 * with a descriptive lastError rather than silently succeeding.
 *
 * @see Requirements 11.6
 */
export class NotConfiguredError extends Error {
  constructor(
    public readonly channel: string,
    public readonly missingConfig: string,
  ) {
    super(
      `${channel} delivery not configured: ${missingConfig} is missing. ` +
        `Please configure ${missingConfig} before attempting ${channel} delivery.`,
    );
    this.name = 'NotConfiguredError';
  }
}
