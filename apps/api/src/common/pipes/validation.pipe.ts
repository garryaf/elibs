import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';

/**
 * Maps class-validator ValidationError objects to the ErrorEnvelope.errors format.
 * Each constraint violation becomes a separate entry with { field, constraint }.
 */
function flattenValidationErrors(
  errors: ValidationError[],
): Array<{ field?: string; constraint: string }> {
  const result: Array<{ field?: string; constraint: string }> = [];

  for (const error of errors) {
    if (error.constraints) {
      const messages = Object.values(error.constraints);
      for (const message of messages) {
        result.push({ field: error.property, constraint: message });
      }
    }

    // Handle nested validation errors (children)
    if (error.children && error.children.length > 0) {
      const nested = flattenValidationErrors(error.children);
      for (const entry of nested) {
        result.push({
          field: entry.field
            ? `${error.property}.${entry.field}`
            : error.property,
          constraint: entry.constraint,
        });
      }
    }
  }

  return result;
}

export const globalValidationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  exceptionFactory: (errors: ValidationError[]) => {
    const formattedErrors = flattenValidationErrors(errors);
    return new BadRequestException({
      message: 'Validation failed',
      errors: formattedErrors,
    });
  },
});
