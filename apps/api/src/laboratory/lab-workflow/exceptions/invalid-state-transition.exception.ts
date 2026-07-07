import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

export class InvalidStateTransitionException extends BadRequestException {
  constructor(
    currentStatus: OrderStatus,
    targetStatus: OrderStatus,
    validTransitions: OrderStatus[],
  ) {
    super({
      errorCode: 'ERR_INVALID_STATE',
      message: `Cannot transition from ${currentStatus} to ${targetStatus}`,
      errors: [
        {
          field: 'status',
          constraint: `Valid transitions from ${currentStatus}: ${validTransitions.join(', ')}`,
        },
      ],
    });
  }
}
