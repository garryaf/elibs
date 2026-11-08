import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SampleCondition } from '@prisma/client';
import { RecordConditionDto, CreateHandoffDto } from './dto';

@Injectable()
export class SpecimenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Create specimens for an order by grouping OrderDetails by sampleType.
   * Each distinct sampleType produces one Specimen record with a unique barcode.
   * Barcode format: {orderNumber}-{sampleTypeCode}-{sequence}
   */
  async createSpecimensForOrder(orderId: string, userId: string) {
    // Fetch the order with its details and related tests
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderDetails: {
          include: { test: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check if specimens already exist for this order
    const existingSpecimens = await this.prisma.specimen.findMany({
      where: { orderId },
    });
    if (existingSpecimens.length > 0) {
      throw new BadRequestException('Specimens already created for this order');
    }

    // Group order details by sampleType
    const sampleTypeGroups = new Map<string, typeof order.orderDetails>();

    for (const detail of order.orderDetails) {
      const sampleType = detail.test.sampleType;
      if (!sampleType) continue; // Skip tests without sampleType

      if (!sampleTypeGroups.has(sampleType)) {
        sampleTypeGroups.set(sampleType, []);
      }
      sampleTypeGroups.get(sampleType)!.push(detail);
    }

    if (sampleTypeGroups.size === 0) {
      throw new BadRequestException(
        'No tests with configured sampleType found in this order',
      );
    }

    // Create specimen records within a transaction
    const sampleTypeCodes = Array.from(sampleTypeGroups.keys());

    const specimens = await this.prisma.$transaction(async (tx) => {
      const created = [];
      let sequence = 1;

      for (const sampleTypeCode of sampleTypeCodes) {
        const barcode = `${order.orderNumber}-${sampleTypeCode}-${String(sequence).padStart(2, '0')}`;

        const specimen = await tx.specimen.create({
          data: {
            orderId,
            sampleTypeCode,
            barcode,
            condition: SampleCondition.ACCEPTABLE,
          },
        });

        created.push(specimen);
        sequence++;
      }

      return created;
    });

    // Audit log the creation
    await this.auditService.log(userId, 'CREATE', 'Specimen', orderId, null, {
      specimens: specimens.map((s) => ({ id: s.id, barcode: s.barcode })),
    });

    return specimens;
  }

  /**
   * Regenerate a specimen barcode with audit logging.
   * Restricted to ADMIN and SAMPLING roles (enforced at controller level).
   */
  async regenerateBarcode(specimenId: string, userId: string) {
    const specimen = await this.prisma.specimen.findUnique({
      where: { id: specimenId },
      include: { order: true },
    });

    if (!specimen) {
      throw new NotFoundException('Specimen not found');
    }

    // Count existing specimens for this order to determine the next sequence
    const orderSpecimens = await this.prisma.specimen.findMany({
      where: { orderId: specimen.orderId },
      orderBy: { createdAt: 'asc' },
    });

    const currentIndex = orderSpecimens.findIndex((s) => s.id === specimenId);
    const sequence =
      currentIndex >= 0 ? currentIndex + 1 : orderSpecimens.length + 1;

    // Generate new barcode with a timestamp suffix to ensure uniqueness
    const timestamp = Date.now().toString(36);
    const newBarcode = `${specimen.order.orderNumber}-${specimen.sampleTypeCode}-${String(sequence).padStart(2, '0')}-R${timestamp}`;

    const oldBarcode = specimen.barcode;

    const updated = await this.prisma.specimen.update({
      where: { id: specimenId },
      data: { barcode: newBarcode },
    });

    // Audit log the barcode regeneration
    await this.auditService.log(
      userId,
      'REGENERATE_BARCODE',
      'Specimen',
      specimenId,
      { barcode: oldBarcode },
      { barcode: newBarcode },
    );

    return updated;
  }

  /**
   * Record specimen condition with rejection reason validation.
   * When condition !== ACCEPTABLE, rejectionReason is required (max 200 chars).
   * Also creates a SampleCollectionAttempt record.
   */
  async recordCondition(
    specimenId: string,
    dto: RecordConditionDto,
    userId: string,
  ) {
    const specimen = await this.prisma.specimen.findUnique({
      where: { id: specimenId },
    });

    if (!specimen) {
      throw new NotFoundException('Specimen not found');
    }

    // Validate rejection reason requirement
    if (dto.condition !== SampleCondition.ACCEPTABLE) {
      if (!dto.rejectionReason || dto.rejectionReason.trim().length === 0) {
        throw new BadRequestException(
          'rejectionReason is required when condition is not ACCEPTABLE',
        );
      }
      if (dto.rejectionReason.length > 200) {
        throw new BadRequestException(
          'rejectionReason must not exceed 200 characters',
        );
      }
    }

    // Update specimen condition and create a collection attempt record in a transaction
    const [updatedSpecimen] = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.specimen.update({
        where: { id: specimenId },
        data: {
          condition: dto.condition,
          rejectionReason:
            dto.condition !== SampleCondition.ACCEPTABLE
              ? dto.rejectionReason
              : null,
          transportTemperature: dto.transportTemperature ?? undefined,
          temperatureCompliant: dto.temperatureCompliant ?? undefined,
          collectedAt: new Date(),
          collectedBy: userId,
        },
      });

      // Create SampleCollectionAttempt record
      await tx.sampleCollectionAttempt.create({
        data: {
          orderId: specimen.orderId,
          specimenId,
          sampleCondition: dto.condition,
          rejectionReason:
            dto.condition !== SampleCondition.ACCEPTABLE
              ? (dto.rejectionReason ?? null)
              : null,
          collectedBy: userId,
        },
      });

      return [updated];
    });

    return updatedSpecimen;
  }

  /**
   * Record a custody handoff between personnel.
   * Creates a CustodyHandoff record with specimenId, fromUserId, toUserId, handoffAt, and notes.
   */
  async recordHandoff(dto: CreateHandoffDto, userId: string) {
    const specimen = await this.prisma.specimen.findUnique({
      where: { id: dto.specimenId },
    });

    if (!specimen) {
      throw new NotFoundException('Specimen not found');
    }

    const handoff = await this.prisma.custodyHandoff.create({
      data: {
        specimenId: dto.specimenId,
        fromUserId: userId,
        toUserId: dto.toUserId,
        notes: dto.notes ?? null,
      },
    });

    return handoff;
  }

  /**
   * Get a single specimen by ID including order and patient data.
   */
  async getSpecimenById(specimenId: string) {
    const specimen = await this.prisma.specimen.findUnique({
      where: { id: specimenId },
      include: {
        order: {
          include: {
            patient: true,
          },
        },
        collectionAttempts: {
          orderBy: { attemptedAt: 'desc' },
        },
        handoffs: {
          orderBy: { handoffAt: 'desc' },
        },
      },
    });

    if (!specimen) {
      throw new NotFoundException('Specimen not found');
    }

    return specimen;
  }

  /**
   * List all specimens with pagination, search, and condition filter.
   */
  async listSpecimens(params?: {
    page?: number;
    limit?: number;
    search?: string;
    condition?: SampleCondition;
  }) {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 15;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (params?.condition) {
      where.condition = params.condition;
    }

    if (params?.search) {
      where.OR = [
        { barcode: { contains: params.search, mode: 'insensitive' } },
        {
          order: {
            orderNumber: { contains: params.search, mode: 'insensitive' },
          },
        },
        {
          order: {
            patient: {
              name: { contains: params.search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.specimen.findMany({
        where,
        include: {
          order: {
            include: {
              patient: {
                select: { id: true, name: true, mrn: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.specimen.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit },
    };
  }

  /**
   * Get all specimens for a given order.
   */
  async getSpecimensByOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.prisma.specimen.findMany({
      where: { orderId },
      include: {
        collectionAttempts: {
          orderBy: { attemptedAt: 'desc' },
        },
        handoffs: {
          orderBy: { handoffAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get collection attempt history for a specific specimen.
   */
  async getCollectionHistory(specimenId: string) {
    const specimen = await this.prisma.specimen.findUnique({
      where: { id: specimenId },
    });

    if (!specimen) {
      throw new NotFoundException('Specimen not found');
    }

    return this.prisma.sampleCollectionAttempt.findMany({
      where: { specimenId },
      orderBy: { attemptedAt: 'desc' },
    });
  }

  /**
   * Generate ZPL batch labels for given specimen IDs.
   * Produces basic ZPL commands for Zebra-compatible thermal printers.
   */
  async generateBatchLabels(specimenIds: string[]): Promise<Buffer> {
    if (specimenIds.length === 0) {
      throw new BadRequestException('At least one specimen ID is required');
    }

    const specimens = await this.prisma.specimen.findMany({
      where: { id: { in: specimenIds } },
      include: {
        order: {
          include: {
            patient: true,
          },
        },
      },
    });

    if (specimens.length === 0) {
      throw new NotFoundException('No specimens found for the given IDs');
    }

    // Generate ZPL output for each specimen label
    const zplCommands: string[] = [];

    for (const specimen of specimens) {
      const patientName = specimen.order.patient?.name ?? 'Unknown Patient';
      const orderNumber = specimen.order.orderNumber;

      // ZPL label format for Zebra thermal printers
      const label = [
        '^XA', // Start label
        '^CF0,30', // Font setting
        `^FO50,30^FD${patientName}^FS`, // Patient name
        `^FO50,70^FDOrder: ${orderNumber}^FS`, // Order number
        `^FO50,110^FDType: ${specimen.sampleTypeCode}^FS`, // Sample type
        '^BY2,2,80', // Barcode parameters
        `^FO50,150^BC^FD${specimen.barcode}^FS`, // Barcode (Code 128)
        `^FO50,250^FD${specimen.barcode}^FS`, // Barcode text
        '^XZ', // End label
      ].join('\n');

      zplCommands.push(label);
    }

    return Buffer.from(zplCommands.join('\n'), 'utf-8');
  }
}
