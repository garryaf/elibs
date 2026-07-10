/**
 * Bug Condition Exploration Test — Double-Envelope Detection
 *
 * **Validates: Requirements 1.1, 1.2, 1.4, 1.5, 2.1, 2.5**
 *
 * This test is EXPECTED TO FAIL on unfixed code.
 * Failure confirms the double-envelope bug exists in UsersController.
 *
 * The test asserts the EXPECTED (correct) behavior:
 * - UsersController methods, when processed through TransformInterceptor,
 *   should produce a SINGLE envelope: { success: true, message: "Success", data: T }
 * - If the response.data has its own { success, message, data } structure,
 *   that means the response is double-wrapped (BUG).
 *
 * Counterexamples expected:
 * - GET /api/v1/users returns { success: true, message: "Success", data: { success: true, message: "Users retrieved", data: { data: [...], meta } } }
 */

import * as fc from 'fast-check';
import { of } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor';
import { CallHandler, ExecutionContext } from '@nestjs/common';

describe('Bug Condition: Double-Envelope Detection in UsersController', () => {
  let controller: UsersController;
  let mockUsersService: Partial<UsersService>;
  let interceptor: TransformInterceptor<unknown>;
  let mockContext: ExecutionContext;

  // Helper: simulate what TransformInterceptor does to a controller return value
  async function simulateInterceptor(controllerReturnValue: unknown) {
    const mockHandler: CallHandler = {
      handle: () => of(controllerReturnValue),
    };
    const result$ = interceptor.intercept(mockContext, mockHandler);
    return lastValueFrom(result$);
  }

  // Helper: check if a response has single-envelope shape (NOT double-wrapped)
  function isSingleEnvelope(response: any): boolean {
    // A correct single-envelope response has { success: true, message: string, data: T }
    // where T does NOT itself have { success: boolean, message: string, data: any }
    if (
      typeof response !== 'object' ||
      response === null ||
      response.success !== true ||
      typeof response.message !== 'string'
    ) {
      return false;
    }

    const innerData = response.data;

    // If innerData has its own success/message/data structure, it's double-wrapped
    if (
      innerData !== null &&
      typeof innerData === 'object' &&
      typeof innerData.success === 'boolean' &&
      typeof innerData.message === 'string' &&
      'data' in innerData
    ) {
      return false; // DOUBLE-WRAPPED — this is the bug
    }

    return true;
  }

  beforeEach(() => {
    // Mock UsersService methods to return realistic data
    mockUsersService = {
      create: jest.fn().mockResolvedValue({
        id: 'uuid-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }),
      findAll: jest.fn().mockResolvedValue({
        data: [
          { id: 'uuid-1', email: 'user1@example.com', name: 'User 1', role: 'ADMIN' },
          { id: 'uuid-2', email: 'user2@example.com', name: 'User 2', role: 'STAFF' },
        ],
        meta: { total: 2, page: 1, limit: 10 },
      }),
      findById: jest.fn().mockResolvedValue({
        id: 'uuid-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }),
      update: jest.fn().mockResolvedValue({
        id: 'uuid-123',
        email: 'updated@example.com',
        name: 'Updated User',
        role: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }),
      softDelete: jest.fn().mockResolvedValue({
        id: 'uuid-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'ADMIN',
        deletedAt: new Date(),
      }),
    };

    controller = new UsersController(mockUsersService as UsersService);
    interceptor = new TransformInterceptor();
    mockContext = {} as ExecutionContext;
  });

  describe('Test 1 — Double-Wrap Detection: findAll()', () => {
    it('should return single-envelope response (data field should NOT contain success/message)', async () => {
      // Call the controller method (which manually wraps)
      const controllerResult = await controller.findAll();

      // Simulate TransformInterceptor wrapping
      const finalResponse = await simulateInterceptor(controllerResult);

      // Assert: the final response should be single-envelope
      // On UNFIXED code, controller returns { success, message, data: { data, meta } }
      // Then interceptor wraps it again → { success, message, data: { success, message, data: { data, meta } } }
      // This assertion will FAIL on unfixed code (expected behavior)
      expect(isSingleEnvelope(finalResponse)).toBe(true);
    });

    it('should not have nested success/message fields in response.data', async () => {
      const controllerResult = await controller.findAll();
      const finalResponse = await simulateInterceptor(controllerResult) as any;

      // The data field should be the raw paginated result { data: [...], meta: {...} }
      // NOT another envelope { success: true, message: "...", data: { data: [...], meta } }
      expect(finalResponse.data).not.toHaveProperty('success');
      expect(finalResponse.data).not.toHaveProperty('message');
    });
  });

  describe('Test 2 — All 5 Methods: single-envelope assertion', () => {
    it('POST /users (create) should have single-envelope response', async () => {
      const controllerResult = await controller.create({
        email: 'new@example.com',
        password: 'password123',
        role: 'ADMIN' as any,
        name: 'New User',
      });

      const finalResponse = await simulateInterceptor(controllerResult) as any;

      // Assert no double-wrapping
      expect(finalResponse.data).not.toHaveProperty('success');
      expect(finalResponse.data).not.toHaveProperty('message');
    });

    it('GET /users/:id (findOne) should have single-envelope response', async () => {
      const controllerResult = await controller.findOne('uuid-123');
      const finalResponse = await simulateInterceptor(controllerResult) as any;

      expect(finalResponse.data).not.toHaveProperty('success');
      expect(finalResponse.data).not.toHaveProperty('message');
    });

    it('PUT /users/:id (update) should have single-envelope response', async () => {
      const controllerResult = await controller.update('uuid-123', {
        email: 'updated@example.com',
        name: 'Updated User',
      });
      const finalResponse = await simulateInterceptor(controllerResult) as any;

      expect(finalResponse.data).not.toHaveProperty('success');
      expect(finalResponse.data).not.toHaveProperty('message');
    });

    it('DELETE /users/:id (remove) should have single-envelope response', async () => {
      const controllerResult = await controller.remove('uuid-123');
      const finalResponse = await simulateInterceptor(controllerResult) as any;

      // null data is valid (no double-wrapping possible with null)
      if (finalResponse.data !== null && finalResponse.data !== undefined) {
        expect(finalResponse.data).not.toHaveProperty('success');
        expect(finalResponse.data).not.toHaveProperty('message');
      } else {
        // null/undefined data means no double-wrapping — this is correct
        expect(finalResponse.data).toBeNull();
      }
    });
  });

  describe('Property: All controller methods produce single-envelope after TransformInterceptor', () => {
    it('for any generated user data, UsersController methods should not double-wrap', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            role: fc.constantFrom('ADMIN', 'STAFF', 'SUPER_ADMIN'),
          }),
          async (userData) => {
            // Mock the service to return the user data
            (mockUsersService.create as jest.Mock).mockResolvedValue({
              id: 'uuid-gen',
              ...userData,
              createdAt: new Date(),
              updatedAt: new Date(),
              deletedAt: null,
            });

            const controllerResult = await controller.create({
              email: userData.email,
              password: 'password123',
              role: userData.role as any,
              name: userData.name,
            });

            const finalResponse = await simulateInterceptor(controllerResult) as any;

            // Property: response.data should NOT have success/message (no double-wrap)
            return (
              finalResponse.data === undefined ||
              finalResponse.data === null ||
              (typeof finalResponse.data !== 'object') ||
              (!('success' in finalResponse.data) && !('message' in finalResponse.data))
            );
          },
        ),
        { numRuns: 20 },
      );
    });
  });
});
