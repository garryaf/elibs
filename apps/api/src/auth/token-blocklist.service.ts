import { Injectable, OnModuleDestroy } from '@nestjs/common';

/**
 * In-memory JWT token blocklist for logout functionality.
 *
 * Stores JTI (JWT ID) or raw token hashes with TTL-based auto-cleanup.
 * In production, replace with Redis-backed implementation for multi-instance support.
 *
 * NCR-01-03: Implements JWT blocklist for logout endpoint.
 */
@Injectable()
export class TokenBlocklistService implements OnModuleDestroy {
  /** Map of token (sub:iat key) → expiry timestamp (ms) */
  private readonly blocklist = new Map<string, number>();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  onModuleDestroy() {
    clearInterval(this.cleanupInterval);
  }

  /**
   * Block a token by adding it to the blocklist.
   * Uses sub:iat as key (unique per token issuance).
   *
   * @param sub - User ID from the token
   * @param iat - Issued-at timestamp from the token (seconds)
   * @param exp - Expiry timestamp from the token (seconds)
   */
  block(sub: string, iat: number, exp: number): void {
    const key = `${sub}:${iat}`;
    // Store with expiry in milliseconds
    this.blocklist.set(key, exp * 1000);
  }

  /**
   * Block all tokens issued before a certain time for a user.
   * Useful for "logout everywhere" or forced session invalidation.
   *
   * @param sub - User ID
   * @param beforeTimestamp - Block all tokens with iat < this value (seconds)
   */
  blockAllBefore(sub: string, beforeTimestamp: number): void {
    const key = `${sub}:all_before`;
    // Expire in 24h (max token lifetime)
    this.blocklist.set(key, Date.now() + 24 * 60 * 60 * 1000);
    // Store the threshold as a separate entry
    this.blocklist.set(`${sub}:threshold`, beforeTimestamp * 1000);
  }

  /**
   * Check if a token is blocked.
   *
   * @param sub - User ID from the token
   * @param iat - Issued-at timestamp from the token (seconds)
   * @returns true if token is blocked
   */
  isBlocked(sub: string, iat: number): boolean {
    const key = `${sub}:${iat}`;

    // Check specific token block
    if (this.blocklist.has(key)) {
      const expiry = this.blocklist.get(key)!;
      if (Date.now() < expiry) {
        return true;
      }
      // Expired entry — remove it
      this.blocklist.delete(key);
    }

    // Check "all before" threshold
    const thresholdKey = `${sub}:threshold`;
    if (this.blocklist.has(thresholdKey)) {
      const threshold = this.blocklist.get(thresholdKey)!;
      if (iat * 1000 < threshold) {
        return true;
      }
    }

    return false;
  }

  /** Remove expired entries from the blocklist */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, expiry] of this.blocklist.entries()) {
      if (expiry < now) {
        this.blocklist.delete(key);
      }
    }
  }
}
