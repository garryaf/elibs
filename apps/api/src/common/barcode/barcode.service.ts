import { Injectable } from '@nestjs/common';
import * as bwipjs from 'bwip-js';

/**
 * Standalone barcode image generation service.
 *
 * Extracted from laboratory/payment module (T-065 / FIND-001) to be reusable
 * across any module that needs barcode generation (orders, labels, receipts).
 */
@Injectable()
export class BarcodeService {
  /**
   * Generate a Code 128 barcode as a base64-encoded PNG image.
   *
   * @param orderId - The order UUID (returned as-is for caller convenience)
   * @param orderNumber - The text to encode in the barcode
   * @returns Object with orderId, barcodeData (text), and barcodeImage (base64 PNG)
   */
  async generate(
    orderId: string,
    orderNumber: string,
  ): Promise<{ orderId: string; barcodeData: string; barcodeImage: string }> {
    const pngBuffer = await bwipjs.toBuffer({
      bcid: 'code128',
      text: orderNumber,
      scale: 3,
      height: 10,
      includetext: true,
      textxalign: 'center',
    });

    const barcodeImage = pngBuffer.toString('base64');

    return {
      orderId,
      barcodeData: orderNumber,
      barcodeImage,
    };
  }

  /**
   * Generate a barcode for arbitrary text (not tied to orders).
   *
   * @param text - The text to encode
   * @param options - Optional barcode configuration overrides
   * @returns base64-encoded PNG string
   */
  async generateImage(
    text: string,
    options?: { bcid?: string; scale?: number; height?: number; includetext?: boolean },
  ): Promise<string> {
    const pngBuffer = await bwipjs.toBuffer({
      bcid: options?.bcid ?? 'code128',
      text,
      scale: options?.scale ?? 3,
      height: options?.height ?? 10,
      includetext: options?.includetext ?? true,
      textxalign: 'center',
    });

    return pngBuffer.toString('base64');
  }
}
