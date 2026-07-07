import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class RegionValidationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validates that a set of region IDs form a valid parent-child chain.
   *
   * Rules:
   * - All four IDs empty/null/undefined → valid (region is optional)
   * - Some but not all provided → throws BadRequestException (partial selection not allowed)
   * - All four provided → verifies parent-child chain via Prisma nested query
   * - Chain inconsistent → throws BadRequestException
   */
  async validateHierarchy(
    provinsiId?: string | null,
    kabupatenKotaId?: string | null,
    kecamatanId?: string | null,
    kelurahanDesaId?: string | null,
  ): Promise<boolean> {
    const values = [provinsiId, kabupatenKotaId, kecamatanId, kelurahanDesaId];
    const filled = values.filter(
      (v) => v !== null && v !== undefined && v !== '',
    );

    // All empty → valid (region selection is optional per requirement 6.2)
    if (filled.length === 0) {
      return true;
    }

    // Partial selection → reject per requirement 6.1
    if (filled.length < 4) {
      throw new BadRequestException({
        errorCode: 'ERR_VALIDATION',
        message:
          'All region levels are required when any region is selected',
      });
    }

    // All four provided → verify parent-child chain consistency per requirement 6.3/6.4
    const kelurahan = await this.prisma.kelurahanDesa.findFirst({
      where: {
        id: kelurahanDesaId!,
        kecamatanId: kecamatanId!,
        kecamatan: {
          kabupatenKotaId: kabupatenKotaId!,
          kabupatenKota: {
            provinsiId: provinsiId!,
          },
        },
      },
    });

    if (!kelurahan) {
      throw new BadRequestException({
        errorCode: 'ERR_VALIDATION',
        message: 'Region hierarchy is inconsistent',
      });
    }

    return true;
  }
}
