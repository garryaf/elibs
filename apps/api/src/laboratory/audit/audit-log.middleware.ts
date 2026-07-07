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
 */
const AUDITED_MODELS = ['Order', 'OrderDetail', 'Patient'];

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
): { findUnique: (args: { where: { id: string } }) => Promise<unknown> } | null {
  const delegates: Record<string, unknown> = {
    Order: prisma.order,
    OrderDetail: prisma.orderDetail,
    Patient: prisma.patient,
  };
  return (delegates[model] as { findUnique: (args: { where: { id: string } }) => Promise<unknown> }) ?? null;
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
  prisma.$use(async (params: Prisma.MiddlewareParams, next: (params: Prisma.MiddlewareParams) => Promise<unknown>) => {
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
    if ((action === 'update' || action === 'delete') && params.args?.where?.id) {
      const delegate = getModelDelegate(prisma, model);
      if (delegate) {
        const existing = await delegate.findUnique({
          where: { id: params.args.where.id },
        });
        oldValues = stripSensitiveFields(existing as Record<string, unknown>);
      }
    }

    // Execute the operation
    const result = next(params);
    const resolvedResult = await result;

    // Determine new values
    let newValues: Record<string, unknown> | null = null;
    if (action === 'create' || action === 'update') {
      newValues = stripSensitiveFields(resolvedResult as Record<string, unknown>);
    }

    // Determine entity ID
    let entityId: string | null = null;
    if (action === 'create' && resolvedResult && typeof resolvedResult === 'object' && 'id' in resolvedResult) {
      entityId = (resolvedResult as { id: string }).id;
    } else if (params.args?.where?.id) {
      entityId = params.args.where.id as string;
    }

    // Log to audit_logs (fire-and-forget to not block the main operation)
    if (entityId) {
      const actionMap: Record<string, string> = {
        create: 'CREATE',
        update: 'UPDATE',
        delete: 'DELETE',
      };

      try {
        await prisma.auditLog.create({
          data: {
            userId: '00000000-0000-0000-0000-000000000000', // SYSTEM - no request context in middleware
            action: actionMap[action] ?? action.toUpperCase(),
            entityName: model,
            entityId,
            oldValues: oldValues as Prisma.InputJsonValue ?? Prisma.JsonNull,
            newValues: newValues as Prisma.InputJsonValue ?? Prisma.JsonNull,
            ipAddress: null,
          },
        });
      } catch {
        // Silently fail audit log creation to not disrupt the main operation
        console.error(`[AuditMiddleware] Failed to create audit log for ${action} on ${model}:${entityId}`);
      }
    }

    return resolvedResult;
  });
}
