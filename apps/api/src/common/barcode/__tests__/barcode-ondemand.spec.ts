import { BarcodeService } from '../barcode.service';

describe('BarcodeService - On-demand Regeneration (Requirement 18.1)', () => {
  let service: BarcodeService;

  beforeEach(() => {
    service = new BarcodeService();
  });

  describe('generateBuffer', () => {
    it('should generate a PNG buffer from deterministic text', async () => {
      const text = 'LAB-20260101-0001';
      const buffer = await service.generateBuffer(text);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      // PNG magic bytes: 137 80 78 71
      expect(buffer[0]).toBe(137);
      expect(buffer[1]).toBe(80);
      expect(buffer[2]).toBe(78);
      expect(buffer[3]).toBe(71);
    });

    it('should produce deterministic output for the same text', async () => {
      const text = 'LAB-20260101-0042';
      const buffer1 = await service.generateBuffer(text);
      const buffer2 = await service.generateBuffer(text);

      expect(buffer1.equals(buffer2)).toBe(true);
    });

    it('should produce different output for different text', async () => {
      const buffer1 = await service.generateBuffer('LAB-20260101-0001');
      const buffer2 = await service.generateBuffer('LAB-20260101-0002');

      expect(buffer1.equals(buffer2)).toBe(false);
    });

    it('should accept custom options', async () => {
      const text = 'CUSTOM-001';
      const buffer = await service.generateBuffer(text, {
        scale: 5,
        height: 15,
        includetext: false,
      });

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('generateImage', () => {
    it('should return a base64 string from text', async () => {
      const text = 'LAB-20260101-0001';
      const base64 = await service.generateImage(text);

      expect(typeof base64).toBe('string');
      expect(base64.length).toBeGreaterThan(0);
      // Verify it's valid base64 by decoding
      const buffer = Buffer.from(base64, 'base64');
      expect(buffer[0]).toBe(137); // PNG header
    });
  });

  describe('generate (legacy compatibility)', () => {
    it('should still return barcodeData and barcodeImage for backward compat', async () => {
      const orderId = 'test-uuid';
      const orderNumber = 'LAB-20260101-0001';
      const result = await service.generate(orderId, orderNumber);

      expect(result.orderId).toBe(orderId);
      expect(result.barcodeData).toBe(orderNumber);
      expect(typeof result.barcodeImage).toBe('string');
      expect(result.barcodeImage.length).toBeGreaterThan(0);
    });
  });
});
