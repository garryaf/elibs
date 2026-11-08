import { PrismaClient, Prisma } from '@prisma/client';

/**
 * Sensitive fields that must be excluded from audit log oldValues/newValues.
 */
const SENSITIVE_FIELDS = [
  'passwordHash',
  'password',
  'token',
  'secret',
  'accessToken',
  'refreshToken',
];

/**
 * Models that should be intercepted by the audit middleware.
 * T-AT-04: Added Visit, PaymentComponent, BatchInvoice, PatientInsurance, OrderInsurance
 * T-AT-05: Added SystemSetting
 */
const AUDITED_MODELS = [
  'Order',
  'OrderDetail',
  'Patient',
  'TestCategory',
  'TestMaster',
  'Panel',
  'Tariff',
  'Doctor',
  'Clinic',
  'Insurance',
  'Equipment',
  'Reagent',
  'SampleTypeMaster',
  'MeasurementUnit',
  'User',
  // T-AT-04: Financial & visit models
  'Visit',
  'PaymentComponent',
  'BatchInvoice',
  'PatientInsurance',
  'OrderInsurance',
  // T-AT-05: System settings
  'SystemSetting',
];

/**
 * Strips sensitive fields from an object before storing in audit logs.
 */
function stripSensitiveFields(
  data: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!data) return null;
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!SENSITIVE_FIELDS.includes(key)) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/**
 * Maps Prisma model names to the delegate accessor on PrismaClient.
 */
function getModelDelegate(
  prisma: PrismaClient,
  model: string,
): { findUnique: (args: { where: any }) => Promise<unknown> } | null {
  const delegates: Record<string, unknown> = {
    Order: prisma.order,
    OrderDetail: prisma.orderDetail,
    Patient: prisma.patient,
    TestCategory: prisma.testCategory,
    TestMaster: prisma.testMaster,
    Panel: prisma.panel,
    Tariff: prisma.tariff,
    Doctor: prisma.doctor,
    Clinic: prisma.clinic,
    Insurance: prisma.insurance,
    Equipment: prisma.equipment,
    Reagent: prisma.reagent,
    SampleTypeMaster: prisma.sampleTypeMaster,
    MeasurementUnit: prisma.measurementUnit,
    User: prisma.user,
    // T-AT-04: Financial & visit models
    Visit: prisma.visit,
    PaymentComponent: prisma.paymentComponent,
    BatchInvoice: prisma.batchInvoice,
    PatientInsurance: prisma.patientInsurance,
    OrderInsurance: prisma.orderInsurance,
    // T-AT-05: System settings (uses 'key' as PK, not 'id')
    SystemSetting: prisma.systemSetting,
  };

  return (
    (delegates[model] as {
      findUnique: (args: { where: any }) => Promise<unknown>;
    }) ?? null
  );
}

/**
 * Registers a Prisma middleware that logs Create, Update, and Delete
 * operations on audited models into the audit_logs table.
 *
 * Note: Since Prisma middlewares do not have access to the HTTP request context,
 * this middleware logs with userId='SYSTEM'. For full user context, use
 * AuditService.log() explicitly in service methods.
 */
export function registerAuditLogMiddleware(prisma: PrismaClient): void {
  prisma.$use(
    async (
      params: Prisma.MiddlewareParams,
      next: (params: Prisma.MiddlewareParams) => Promise<unknown>,
    ) => {
      const model = params.model;
      const action = params.action;

      if (!model || !AUDITED_MODELS.includes(model)) {
        return next(params);
      }

      const auditableActions = ['create', 'update', 'delete'];
      if (!auditableActions.includes(action)) {
        return next(params);
      }

      let oldValues: Record<string, unknown> | null = null;

      // For update and delete, fetch the existing record before the operation
      if ((action === 'update' || action === 'delete') && params.args?.where) {
        const whereId = params.args.where.id || params.args.where.key; // Support 'key' PK for SystemSetting
        if (whereId) {
          const delegate = getModelDelegate(prisma, model);
          if (delegate) {
            try {
              const existing = await delegate.findUnique({
                where: params.args.where,
              });
              oldValues = stripSensitiveFields(
                existing as Record<string, unknown>,
              );
            } catch {
              // Silently skip if findUnique fails (e.g., different PK shape)
            }
          }
        }
      }

      // Execute the operation
      const result = next(params);
      const resolvedResult = await result;

      // Determine new values
      let newValues: Record<string, unknown> | null = null;
      if (action === 'create' || action === 'update') {
        newValues = stripSensitiveFields(
          resolvedResult as Record<string, unknown>,
        );
      }

      // Determine entity ID (supports models with 'id' or 'key' as PK)
      let entityId: string | null = null;
      if (
        action === 'create' &&
        resolvedResult &&
        typeof resolvedResult === 'object'
      ) {
        if ('id' in resolvedResult) {
          entityId = (resolvedResult as { id: string }).id;
        } else if ('key' in resolvedResult) {
          // SystemSetting uses 'key' as PK — store it as entityId
          entityId = (resolvedResult as { key: string }).key;
        }
      } else if (params.args?.where?.id) {
        entityId = params.args.where.id as string;
      } else if (params.args?.where?.key) {
        entityId = params.args.where.key as string;
      }

      // Log to audit_logs (fire-and-forget to not block the main operation)
      // Note: entityId must be a valid UUID for the database column constraint.
      // For models using non-UUID PKs (e.g., SystemSetting 'key'), we generate a
      // deterministic UUID v5-like hash or skip if entityId is not UUID-shaped.
      const UUID_REGEX =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isUuid = entityId ? UUID_REGEX.test(entityId) : false;

      if (entityId) {
        const actionMap: Record<string, string> = {
          create: 'CREATE',
          update: 'UPDATE',
          delete: 'DELETE',
        };

        // For non-UUID entityIds (e.g., SystemSetting key), store the key in
        // newValues/oldValues and use a static namespace UUID as entityId.
        const SYSTEM_SETTING_NAMESPACE_UUID =
          '00000000-0000-0000-0000-000000000001';
        const resolvedEntityId = isUuid
          ? entityId
          : SYSTEM_SETTING_NAMESPACE_UUID;

        // If entityId is not a UUID (e.g., SystemSetting key), include it in newValues for traceability
        let finalNewValues = newValues;
        let finalOldValues = oldValues;
        if (!isUuid) {
          finalNewValues = { ...newValues, _settingKey: entityId };
          finalOldValues = oldValues
            ? { ...oldValues, _settingKey: entityId }
            : null;
        }

        try {
          await prisma.auditLog.create({
            data: {
              userId: '00000000-0000-0000-0000-000000000000', // SYSTEM - no request context in middleware
              action: actionMap[action] ?? action.toUpperCase(),
              entityName: model,
              entityId: resolvedEntityId,
              oldValues:
                (finalOldValues as Prisma.InputJsonValue) ?? Prisma.JsonNull,
              newValues:
                (finalNewValues as Prisma.InputJsonValue) ?? Prisma.JsonNull,
              ipAddress: null,
            },
          });
        } catch {
          // Silently fail audit log creation to not disrupt the main operation
          console.error(
            `[AuditMiddleware] Failed to create audit log for ${action} on ${model}:${entityId}`,
          );
        }
      }

      return resolvedResult;
    },
  );
}
