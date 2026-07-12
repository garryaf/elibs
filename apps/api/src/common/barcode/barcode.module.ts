import { Module } from '@nestjs/common';
import { BarcodeService } from './barcode.service';

/**
 * Standalone barcode module.
 *
 * Import this module into any feature module that needs barcode generation.
 * Extracted from laboratory/payment for reusability (T-065 / FIND-001).
 */
@Module({
  providers: [BarcodeService],
  exports: [BarcodeService],
})
export class BarcodeModule {}
