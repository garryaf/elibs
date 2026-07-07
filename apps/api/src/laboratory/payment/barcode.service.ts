import { Injectable } from '@nestjs/common';
import * as bwipjs from 'bwip-js';

@Injectable()
export class BarcodeService {
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
}
