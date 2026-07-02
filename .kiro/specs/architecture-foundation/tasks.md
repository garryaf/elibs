# Implementation Plan: Architecture Foundation (Phase 01)

## Overview

This plan implements the audit remediation and architectural foundation in dependency order: dead code removal → environment validation → security middleware → global pipes/filters/interceptors → common directory structure → auth refactor → frontend route dedup → integration tests. Each step builds incrementally on the previous, ensuring no orphaned code or broken imports at any point.

## Tasks

- [x] 1. Remove dead code and install dependencies
  - [x] 1.1 Delete dead code files and clean AppModule
    - Delete `apps/api/src/app.controller.ts`, `apps/api/src/app.service.ts`, and `apps/api/src/app.controller.spec.ts`
    - Update `apps/api/src/app.module.ts` to remove `AppController` and `AppService` imports/references
    - AppModule should only declare imports: `[ConfigModule.forRoot(...), PrismaModule, UsersModule, AuthModule]` with no controllers or providers of its own
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 1.2 Install new dependencies
    - Run `npm install @nestjs/config joi helmet` in `apps/api/`
    - Run `npm install -D fast-check @types/helmet` in `apps/api/`
    - _Requirements: 3.1, 3.6, 4.1_

- [x] 2. Configure environment validation
  - [x] 2.1 Create env validation schema and .env.example
    - Create `apps/api/src/config/env.validation.ts` with Joi schema validating `DATABASE_URL`, `JWT_SECRET` (min 32 chars), `JWT_EXPIRATION` (pattern `\d+[smhd]`), `CORS_ORIGINS`, `PORT` (1–65535, default 3000)
    - Create `apps/api/.env.example` with all required variables and placeholder values
    - _Requirements: 3.2, 3.3, 3.5, 3.6_

  - [x] 2.2 Register ConfigModule globally in AppModule
    - Import `ConfigModule.forRoot()` with `isGlobal: true`, the Joi `validationSchema`, and `validationOptions: { abortEarly: false }`
    - Ensure the app will throw and exit on invalid env before listening
    - _Requirements: 3.1, 3.4, 11.1_

  - [x] 2.3 Write property tests for environment validation (Properties 2, 3)
    - **Property 2: Environment validation schema rejects invalid configurations**
    - **Property 3: Environment validation error messages identify offending variables**
    - Use fast-check to generate env objects with missing/invalid fields; assert Joi schema rejects them and error messages contain the variable names
    - **Validates: Requirements 3.2, 3.3, 3.4**

- [x] 3. Checkpoint - Verify environment validation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Apply HTTP security middleware and bootstrap refactor
  - [x] 4.1 Refactor main.ts with Helmet, CORS, and global prefix
    - Import and apply `helmet()` middleware
    - Inject `ConfigService` to read `CORS_ORIGINS` and `PORT`
    - Parse `CORS_ORIGINS`: if `*` allow all, otherwise split by comma and trim
    - Set global prefix `api/v1`
    - Log listening port on successful startup
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 11.1, 11.2, 11.3_

  - [x] 4.2 Write property test for CORS origins parsing (Property 4)
    - **Property 4: CORS origins parsing**
    - Use fast-check to generate comma-separated URL strings with optional whitespace; assert parsed array length and trimming
    - **Validates: Requirements 4.2**

- [x] 5. Create global pipes, filters, and interceptors
  - [x] 5.1 Create AllExceptionsFilter
    - Create `apps/api/src/common/filters/all-exceptions.filter.ts`
    - Implement: catch all exceptions, return `{ success: false, errorCode, message, errors, traceId }`
    - Read `X-Request-ID` from request (or generate UUID v4 fallback)
    - Preserve HttpException status codes; return 500 for unknown errors
    - Log full stack trace server-side; never include in response body
    - Preserve validation error arrays from HttpExceptions
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 5.2 Create TransformInterceptor
    - Create `apps/api/src/common/interceptors/transform.interceptor.ts`
    - Wrap controller return values in `{ success: true, message: "Success", data: <value> }`
    - _Requirements: 7.1, 7.2_

  - [x] 5.3 Create LoggingInterceptor
    - Create `apps/api/src/common/interceptors/logging.interceptor.ts`
    - Record start timestamp, generate/propagate `X-Request-ID`
    - On completion: log `{ method, path, statusCode, durationMs, requestId }`
    - Set `X-Request-ID` response header
    - _Requirements: 8.1, 8.2, 8.4_

  - [x] 5.4 Create GlobalValidationPipe configuration
    - Create `apps/api/src/common/pipes/validation.pipe.ts`
    - Export a configured `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
    - Implement custom `exceptionFactory` mapping class-validator errors to the `ErrorEnvelope.errors` format
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 5.5 Register all global pipes/filters/interceptors in main.ts
    - Wire `globalValidationPipe`, `AllExceptionsFilter`, `TransformInterceptor`, `LoggingInterceptor` in the bootstrap function in correct order
    - _Requirements: 5.1, 6.1, 7.3, 8.3, 11.1_

  - [x] 5.6 Write property tests for AllExceptionsFilter (Properties 7, 8, 9, 10)
    - **Property 7: AllExceptionsFilter propagates traceId from X-Request-ID**
    - **Property 8: AllExceptionsFilter never leaks stack traces**
    - **Property 9: AllExceptionsFilter preserves HttpException status codes**
    - **Property 10: AllExceptionsFilter preserves validation errors**
    - **Validates: Requirements 6.2, 6.3, 6.5, 6.7**

  - [x] 5.7 Write property tests for TransformInterceptor (Property 11)
    - **Property 11: TransformInterceptor wraps data in success envelope**
    - Use fast-check `fc.anything()` to verify envelope wrapping for arbitrary data
    - **Validates: Requirements 7.1, 7.2**

  - [x] 5.8 Write property tests for LoggingInterceptor (Properties 12, 13)
    - **Property 12: LoggingInterceptor records request metadata**
    - **Property 13: X-Request-ID generation and propagation**
    - **Validates: Requirements 8.1, 8.2, 8.4**

  - [x] 5.9 Write property tests for ValidationPipe (Properties 5, 6)
    - **Property 5: ValidationPipe rejects payloads with unknown properties**
    - **Property 6: Validation failure response conforms to error envelope**
    - **Validates: Requirements 5.1, 5.2, 5.4, 5.5**

- [x] 6. Checkpoint - Verify middleware and interceptors
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Establish common directory structure and relocate shared code
  - [x] 7.1 Create common directory scaffolding and move PrismaService
    - Create `apps/api/src/common/prisma/` directory
    - Move `apps/api/src/prisma/prisma.service.ts` → `apps/api/src/common/prisma/prisma.service.ts`
    - Move `apps/api/src/prisma/prisma.module.ts` → `apps/api/src/common/prisma/prisma.module.ts`
    - Delete old `apps/api/src/prisma/` directory
    - Update all import paths referencing the old prisma location
    - _Requirements: 9.6, 9.7_

  - [x] 7.2 Move guards to common directory
    - Move `apps/api/src/auth/jwt-auth.guard.ts` → `apps/api/src/common/guards/jwt-auth.guard.ts`
    - Move `apps/api/src/auth/roles.guard.ts` → `apps/api/src/common/guards/roles.guard.ts`
    - Update all import paths in modules that reference these guards
    - _Requirements: 9.3, 9.7, 9.8_

  - [x] 7.3 Move decorators to common directory and create @CurrentUser
    - Move `apps/api/src/auth/roles.decorator.ts` → `apps/api/src/common/decorators/roles.decorator.ts`
    - Create `apps/api/src/common/decorators/current-user.decorator.ts` using `createParamDecorator`
    - Update all import paths referencing the old decorator location
    - _Requirements: 9.1, 9.7, 9.8_

  - [x] 7.4 Move JwtStrategy to auth/strategies/
    - Move `apps/api/src/auth/jwt.strategy.ts` → `apps/api/src/auth/strategies/jwt.strategy.ts`
    - Update import in `auth.module.ts`
    - _Requirements: 9.7_

- [x] 8. Refactor auth module to use ConfigService and eliminate secrets
  - [x] 8.1 Refactor AuthModule to use JwtModule.registerAsync with ConfigService
    - Replace inline `JwtModule.register()` with `JwtModule.registerAsync()` using `ConfigService`
    - Read `JWT_SECRET` and `JWT_EXPIRATION` from ConfigService
    - Import `ConfigModule` in AuthModule imports
    - _Requirements: 2.1, 2.4_

  - [x] 8.2 Refactor JwtStrategy to inject ConfigService
    - Add `ConfigService` injection to `JwtStrategy` constructor
    - Read `secretOrKey` from `config.get<string>('JWT_SECRET')`
    - Remove all fallback secret strings
    - _Requirements: 2.1, 2.4_

  - [x] 8.3 Remove createDefaultUser and fix bcrypt cost
    - Remove `createDefaultUser()` method from `apps/api/src/users/users.service.ts`
    - Remove the auto-creation logic in `apps/api/src/auth/auth.service.ts` `validateUser` method
    - Update bcrypt cost factor from 10 to 12 in all hashing calls
    - _Requirements: 2.5, 2.6, 2.7_

  - [x] 8.4 Write property test for bcrypt cost factor (Property 1)
    - **Property 1: Bcrypt cost factor invariant**
    - Use fast-check to generate password strings; verify hash prefix is `$2b$12$` or `$2a$12$`
    - **Validates: Requirements 2.7**

- [x] 9. Checkpoint - Verify auth refactor and common structure
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Remove frontend duplicate route structure
  - [x] 10.1 Delete the (dashboard) route group
    - Delete the entire `apps/web/src/app/(dashboard)/` directory (contains `layout.tsx` and `dashboard/page.tsx`)
    - Verify the canonical `apps/web/src/app/dashboard/` retains all sub-routes (patients, orders, laboratory, doctor)
    - Verify `apps/web/src/app/dashboard/layout.tsx` serves as the single dashboard layout
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 11. Integration tests
  - [x] 11.1 Write integration tests for bootstrap and middleware
    - Test: app starts successfully with valid env vars
    - Test: app fails to start with missing `JWT_SECRET`
    - Test: Helmet security headers present on responses
    - Test: CORS blocks disallowed origins
    - Test: CORS allows wildcard when `CORS_ORIGINS=*`
    - Test: global prefix `api/v1` routes correctly
    - Test: unknown endpoint returns 404 in error envelope
    - _Requirements: 3.1, 2.2, 4.1, 4.3, 4.5, 4.6, 6.1, 11.2, 11.3_

- [x] 12. Final checkpoint - Full verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Dependencies: `@nestjs/config`, `joi`, `helmet` (runtime); `fast-check` (dev)
- The ordering follows the design's dependency chain — environment validation before middleware, middleware before global pipes, common directory before interceptors reference shared modules

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2"] },
    { "id": 3, "tasks": ["2.3", "4.1"] },
    { "id": 4, "tasks": ["4.2", "5.1", "5.2", "5.3", "5.4"] },
    { "id": 5, "tasks": ["5.5"] },
    { "id": 6, "tasks": ["5.6", "5.7", "5.8", "5.9", "7.1"] },
    { "id": 7, "tasks": ["7.2", "7.3"] },
    { "id": 8, "tasks": ["7.4", "8.1"] },
    { "id": 9, "tasks": ["8.2", "8.3"] },
    { "id": 10, "tasks": ["8.4", "10.1"] },
    { "id": 11, "tasks": ["11.1"] }
  ]
}
```
