// Feature: laboratory-management, Property 13: WhatsApp Phone Validation

import * as fc from 'fast-check';
import { WhatsAppService } from '../whatsapp.service';

/**
 * **Validates: Requirements FR11.3**
 */
describe('Notification Property Tests', () => {
  let whatsAppService: WhatsAppService;

  beforeEach(() => {
    whatsAppService = new WhatsAppService();
  });

  /**
   * Property 13: WhatsApp Phone Validation
   *
   * *For any* phone string, isValidPhone SHALL return true if and only if
   * the string starts with "62" or "08". For null/undefined/empty inputs,
   * it SHALL return false.
   *
   * **Validates: Requirements FR11.3**
   */
  describe('Property 13: WhatsApp Phone Validation', () => {
    it('should accept any phone string starting with "62"', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).map((s) => '62' + s),
          (phone) => {
            expect(whatsAppService.isValidPhone(phone)).toBe(true);
          },
        ),
        { numRuns: 200 },
      );
    });

    it('should accept any phone string starting with "08"', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).map((s) => '08' + s),
          (phone) => {
            expect(whatsAppService.isValidPhone(phone)).toBe(true);
          },
        ),
        { numRuns: 200 },
      );
    });

    it('should reject any phone string NOT starting with "62" or "08"', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(
            (s) => !s.startsWith('62') && !s.startsWith('08'),
          ),
          (phone) => {
            expect(whatsAppService.isValidPhone(phone)).toBe(false);
          },
        ),
        { numRuns: 200 },
      );
    });

    it('should return false for null', () => {
      expect(whatsAppService.isValidPhone(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(whatsAppService.isValidPhone(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(whatsAppService.isValidPhone('')).toBe(false);
    });
  });
});
