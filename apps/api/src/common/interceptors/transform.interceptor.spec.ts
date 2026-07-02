// Feature: architecture-foundation, Property 11: TransformInterceptor wraps data in success envelope
import * as fc from 'fast-check';
import { of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';
import { CallHandler, ExecutionContext } from '@nestjs/common';

/**
 * Validates: Requirements 7.1, 7.2
 *
 * Property 11: For any value returned by a controller handler (object, array,
 * string, number, null), the TransformInterceptor SHALL produce a response
 * matching { success: true, message: "Success", data: <original_value> }.
 */
describe('TransformInterceptor - Property 11', () => {
  let interceptor: TransformInterceptor<unknown>;
  let mockContext: ExecutionContext;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
    mockContext = {} as ExecutionContext;
  });

  it('wraps arbitrary data in success envelope', () => {
    fc.assert(
      fc.property(fc.anything(), (data) => {
        const mockCallHandler: CallHandler = {
          handle: () => of(data),
        };

        let result: unknown;
        interceptor
          .intercept(mockContext, mockCallHandler)
          .subscribe((value) => {
            result = value;
          });

        expect(result).toEqual({
          success: true,
          message: 'Success',
          data,
        });
      }),
      { numRuns: 100 },
    );
  });
});
