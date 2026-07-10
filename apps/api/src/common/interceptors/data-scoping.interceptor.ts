import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { RbacService } from '../rbac/rbac.service';

export const DATA_SCOPED_KEY = 'data_scoped';

/**
 * Decorator to mark endpoints that should be scoped by department.
 * When applied, the DataScopingInterceptor will add department filter
 * to the request for users that have a departmentId assigned.
 */
export function DataScoped(): MethodDecorator & ClassDecorator {
  return (
    target: any,
    propertyKey?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>,
  ) => {
    if (descriptor) {
      Reflect.defineMetadata(DATA_SCOPED_KEY, true, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(DATA_SCOPED_KEY, true, target);
    return target;
  };
}

/**
 * Interceptor that applies department-based data scoping.
 * 
 * If a user has a departmentId assigned and the endpoint is marked with @DataScoped(),
 * it adds a `departmentScope` property to the request object containing the user's departmentId.
 * Controllers can then use this to filter queries.
 * 
 * Users with the `data.cross-department` permission bypass scoping.
 */
@Injectable()
export class DataScopingInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: RbacService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const isDataScoped = this.reflector.getAllAndOverride<boolean>(
      DATA_SCOPED_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!isDataScoped) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.departmentId) {
      // No department assigned - no scoping applied
      request.departmentScope = null;
      return next.handle();
    }

    // Check if user has cross-department permission
    const hasCrossDepartment = await this.rbacService.hasPermission(
      user.role,
      'data.cross-department',
    );

    if (hasCrossDepartment) {
      // User can see all departments
      request.departmentScope = null;
      return next.handle();
    }

    // Apply department scoping
    request.departmentScope = user.departmentId;
    return next.handle();
  }
}
