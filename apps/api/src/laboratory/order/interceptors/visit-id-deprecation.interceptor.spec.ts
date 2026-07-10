import { VisitIdDeprecationInterceptor } from './visit-id-deprecation.interceptor';
import { ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { of } from 'rxjs';

describe('VisitIdDeprecationInterceptor', () => {
  let interceptor: VisitIdDeprecationInterceptor;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    interceptor = new VisitIdDeprecationInterceptor();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  function createMockContext(body: unknown, userId?: string): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          body,
          user: userId ? { id: userId } : undefined,
        }),
      }),
    } as unknown as ExecutionContext;
  }

  const mockNext: CallHandler = {
    handle: () => of({ success: true }),
  };

  it('should log a warning when visitId is missing from request body', (done) => {
    const context = createMockContext({ patientId: '123', testIds: ['abc'] }, 'user-42');

    interceptor.intercept(context, mockNext).subscribe(() => {
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('userId=user-42'),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('without visitId'),
      );
      done();
    });
  });

  it('should log a warning when visitId is null', (done) => {
    const context = createMockContext({ visitId: null, patientId: '123', testIds: ['abc'] }, 'user-99');

    interceptor.intercept(context, mockNext).subscribe(() => {
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('userId=user-99'),
      );
      done();
    });
  });

  it('should log a warning when visitId is empty string', (done) => {
    const context = createMockContext({ visitId: '', patientId: '123', testIds: ['abc'] }, 'user-10');

    interceptor.intercept(context, mockNext).subscribe(() => {
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('userId=user-10'),
      );
      done();
    });
  });

  it('should NOT log a warning when visitId is present', (done) => {
    const context = createMockContext(
      { visitId: '550e8400-e29b-41d4-a716-446655440000', patientId: '123', testIds: ['abc'] },
      'user-1',
    );

    interceptor.intercept(context, mockNext).subscribe(() => {
      expect(warnSpy).not.toHaveBeenCalled();
      done();
    });
  });

  it('should log userId as unknown when user is not on request', (done) => {
    const context = createMockContext({ patientId: '123', testIds: ['abc'] });

    interceptor.intercept(context, mockNext).subscribe(() => {
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('userId=unknown'),
      );
      done();
    });
  });

  it('should include timestamp in the warning message', (done) => {
    const context = createMockContext({ patientId: '123', testIds: ['abc'] }, 'user-1');

    interceptor.intercept(context, mockNext).subscribe(() => {
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('timestamp='),
      );
      done();
    });
  });

  it('should still call next.handle() even when logging a warning', (done) => {
    const context = createMockContext({ patientId: '123', testIds: ['abc'] }, 'user-1');
    const handleSpy = jest.spyOn(mockNext, 'handle');

    interceptor.intercept(context, mockNext).subscribe(() => {
      expect(handleSpy).toHaveBeenCalled();
      done();
    });
  });
});
