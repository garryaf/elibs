# Requirements Document

## Introduction

Phase 01: Architecture Foundation addresses critical security vulnerabilities, dead code conflicts, and missing infrastructure identified in the eLIS Enterprise Audit (AUDIT-eLIS-2026-001). This phase establishes the foundational backend architecture by removing conflicting dead code, eliminating hardcoded secrets, configuring environment validation, applying HTTP security middleware, creating the `common/` shared infrastructure directory, and resolving duplicate frontend routes. No new business features are introduced — this phase makes the existing codebase secure, structurally compliant with the Backend Architecture specification (BE-eLIS-2026-001), and ready for incremental feature development in subsequent phases.

## Glossary

- **API_Application**: The NestJS backend application located at `apps/api/`
- **Bootstrap_Process**: The `main.ts` entrypoint that creates and configures the NestJS application instance with global pipes, guards, filters, and middleware
- **ConfigModule**: The `@nestjs/config` module that loads and validates environment variables at application startup
- **GlobalValidationPipe**: A NestJS ValidationPipe applied globally that validates all incoming request DTOs using class-validator decorators
- **AllExceptionsFilter**: A global exception filter that catches unhandled errors, formats them into the standard error envelope, and prevents stack traces from leaking to clients
- **TransformInterceptor**: A global interceptor that wraps all successful responses into the standard envelope format `{ success, message, data }`
- **LoggingInterceptor**: A global interceptor that logs each request method, path, status code, duration, and X-Request-ID
- **Helmet_Middleware**: The `helmet` npm package that sets secure HTTP response headers (X-Content-Type-Options, Strict-Transport-Security, X-Frame-Options, etc.)
- **CORS_Configuration**: Cross-Origin Resource Sharing settings that restrict which origins can access the API
- **Dead_Code**: Source files or code paths that are unreachable, unused, or conflict with the intended implementation
- **Hardcoded_Secret**: A sensitive credential (password, JWT secret, API key) written directly in source code rather than loaded from environment variables
- **Common_Directory**: The `src/common/` folder containing shared decorators, filters, guards, interceptors, pipes, and the PrismaService
- **Frontend_Application**: The Next.js web application located at `apps/web/`
- **Route_Group**: A Next.js App Router directory enclosed in parentheses (e.g., `(dashboard)`) that provides layout without affecting the URL path
- **Env_Example_File**: A `.env.example` file documenting all required environment variables with placeholder values

## Requirements

### Requirement 1: Remove Dead Code from Backend

**User Story:** As a developer, I want conflicting and unused code removed from the API application, so that route conflicts are eliminated and the codebase contains only intentional, functional code.

#### Acceptance Criteria

1. WHEN the API_Application starts, THE Bootstrap_Process SHALL register zero controllers on the `api/v1/auth` path from the root AppModule (only AuthModule controllers serve that path)
2. THE API_Application SHALL NOT contain the file `apps/api/src/app.controller.ts`
3. THE API_Application SHALL NOT contain the file `apps/api/src/app.service.ts`
4. THE API_Application SHALL NOT contain the file `apps/api/src/app.controller.spec.ts`
5. WHEN the AppModule is loaded, THE API_Application SHALL import PrismaModule, UsersModule, and AuthModule without referencing AppController or AppService

### Requirement 2: Eliminate Hardcoded Secrets

**User Story:** As a security engineer, I want all hardcoded secrets removed from source code, so that credentials are never committed to version control and the application fails fast when secrets are missing.

#### Acceptance Criteria

1. THE API_Application SHALL load the JWT signing secret exclusively from the `JWT_SECRET` environment variable with no fallback value in source code
2. IF the `JWT_SECRET` environment variable is not defined or is set to an empty string, THEN THE API_Application SHALL fail to start and log an error message to stderr indicating the missing variable name
3. IF the `JWT_SECRET` environment variable is defined but contains fewer than 32 characters, THEN THE API_Application SHALL fail to start and log an error message indicating the secret does not meet the minimum length of 32 characters
4. THE API_Application SHALL NOT contain the string `'fallback-secret-key-for-dev'` in any source file
5. THE API_Application SHALL NOT contain the string `'password123'` in any source file
6. THE API_Application SHALL NOT auto-create any user accounts during the authentication flow (the `createDefaultUser` method and its invocation in `auth.service.ts` SHALL be removed)
7. THE API_Application SHALL use a bcrypt cost factor of 12 for all password hashing operations

### Requirement 3: Configure Environment Validation

**User Story:** As a developer, I want environment variables validated at startup using `@nestjs/config`, so that missing or invalid configuration causes an immediate failure with a clear error message rather than runtime surprises.

#### Acceptance Criteria

1. THE API_Application SHALL use `@nestjs/config` ConfigModule registered globally in AppModule
2. WHEN the API_Application starts, THE ConfigModule SHALL validate that all required environment variables are present and conform to the following type rules: `DATABASE_URL` is a non-empty string, `JWT_SECRET` is a string of at least 32 characters, `JWT_EXPIRATION` is a valid duration string (e.g., "15m", "1h", "7d"), `CORS_ORIGINS` is a comma-separated list of valid URL origins, and `PORT` is an integer between 1 and 65535
3. THE API_Application SHALL require the following environment variables at minimum: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRATION`, `CORS_ORIGINS`, `PORT`
4. IF any required environment variable is missing or fails its type/format validation, THEN THE API_Application SHALL throw an error during startup that names each invalid or missing variable and its expected format, and SHALL refuse to listen for connections
5. THE API_Application SHALL provide a `.env.example` file at `apps/api/.env.example` listing all required variables with placeholder values and descriptions
6. THE API_Application SHALL use a schema validation library (such as Joi or class-validator) within the ConfigModule to enforce the type rules defined in criterion 2

### Requirement 4: Apply HTTP Security Middleware

**User Story:** As a security engineer, I want Helmet.js and CORS properly configured on the API application, so that HTTP responses include standard security headers and cross-origin requests are restricted to allowed origins.

#### Acceptance Criteria

1. THE Bootstrap_Process SHALL apply Helmet middleware to the application before listening for connections
2. THE Bootstrap_Process SHALL configure CORS by parsing the `CORS_ORIGINS` environment variable as a comma-separated list of allowed origin URLs
3. WHEN a preflight or actual request arrives from an origin not present in the `CORS_ORIGINS` list, THE API_Application SHALL respond without the `Access-Control-Allow-Origin` header, causing the browser to block the cross-origin request
4. THE Bootstrap_Process SHALL set the global API prefix to `api/v1`
5. WHILE the API_Application is running, THE API_Application SHALL include the headers `X-Content-Type-Options`, `X-Frame-Options`, and `Strict-Transport-Security` in all HTTP responses
6. IF the `CORS_ORIGINS` environment variable is set to `*`, THEN THE API_Application SHALL allow requests from any origin (wildcard CORS)

### Requirement 5: Apply Global Validation Pipe

**User Story:** As a developer, I want a GlobalValidationPipe that automatically validates and transforms all incoming request bodies, so that invalid payloads are rejected before reaching business logic.

#### Acceptance Criteria

1. THE Bootstrap_Process SHALL register a GlobalValidationPipe with whitelist enabled (stripping unknown properties)
2. THE Bootstrap_Process SHALL register the GlobalValidationPipe with forbidNonWhitelisted set to true (rejecting requests containing unknown properties)
3. THE Bootstrap_Process SHALL register the GlobalValidationPipe with transform set to true (auto-transforming payloads to DTO class instances)
4. WHEN an incoming request body fails validation, THE GlobalValidationPipe SHALL return an HTTP 400 response conforming to the standard error envelope format `{ success: false, errorCode: string, message: string, errors: array, traceId: string }`
5. WHEN an incoming request body fails validation, THE GlobalValidationPipe SHALL include one entry per validation failure in the `errors` array, where each entry identifies the property name that failed and the constraint violation description

### Requirement 6: Create Global Exception Filter

**User Story:** As a developer, I want a global exception filter that catches all unhandled exceptions and formats them into the standard error envelope, so that clients never receive raw stack traces and errors are consistently structured.

#### Acceptance Criteria

1. THE AllExceptionsFilter SHALL catch all uncaught exceptions thrown during request handling
2. WHEN an unhandled exception occurs, THE AllExceptionsFilter SHALL return a response in the format `{ success: false, errorCode: string, message: string, errors: array, traceId: string }` where `traceId` is sourced from the X-Request-ID header and `errors` defaults to an empty array for non-validation exceptions
3. THE AllExceptionsFilter SHALL NOT include stack traces or internal error details in the response body
4. THE AllExceptionsFilter SHALL log the full exception (including stack trace) to the server-side logger
5. WHEN an HttpException is thrown, THE AllExceptionsFilter SHALL preserve the original HTTP status code in the response
6. WHEN a non-HttpException error occurs, THE AllExceptionsFilter SHALL return HTTP 500 with errorCode `INTERNAL_SERVER_ERROR` and a generic message that does not reveal exception details
7. WHEN an HttpException contains a validation errors array (from GlobalValidationPipe), THE AllExceptionsFilter SHALL preserve those entries in the `errors` field

### Requirement 7: Create Global Response Transform Interceptor

**User Story:** As a developer, I want all successful API responses automatically wrapped in the standard envelope format, so that the response structure is consistent across all endpoints without manual wrapping in each controller.

#### Acceptance Criteria

1. THE TransformInterceptor SHALL wrap all successful responses into the format `{ success: true, message: string, data: any }`
2. WHEN a controller returns raw data, THE TransformInterceptor SHALL wrap the data into the envelope with a default message of "Success"
3. THE TransformInterceptor SHALL be registered globally in the Bootstrap_Process

### Requirement 8: Create Global Logging Interceptor

**User Story:** As an operations engineer, I want every HTTP request logged with method, path, status code, duration, and a trace ID, so that request flows can be traced and performance monitored.

#### Acceptance Criteria

1. THE LoggingInterceptor SHALL log the HTTP method, request path, response status code, and request duration in milliseconds for every completed request
2. THE LoggingInterceptor SHALL generate or propagate an `X-Request-ID` header on each request for distributed tracing
3. THE LoggingInterceptor SHALL be registered globally in the Bootstrap_Process
4. WHEN a request completes, THE LoggingInterceptor SHALL include the X-Request-ID value in the log entry

### Requirement 9: Establish Common Directory Structure

**User Story:** As a developer, I want the shared infrastructure organized in a `common/` directory per the Backend Architecture specification, so that guards, decorators, filters, interceptors, pipes, and the PrismaService are in their documented locations.

#### Acceptance Criteria

1. THE API_Application SHALL contain a `src/common/decorators/` directory with the `@CurrentUser` and `@Roles` decorators
2. THE API_Application SHALL contain a `src/common/filters/` directory with the AllExceptionsFilter
3. THE API_Application SHALL contain a `src/common/guards/` directory with JwtAuthGuard and RolesGuard
4. THE API_Application SHALL contain a `src/common/interceptors/` directory with TransformInterceptor and LoggingInterceptor
5. THE API_Application SHALL contain a `src/common/pipes/` directory with the GlobalValidationPipe configuration
6. THE API_Application SHALL contain a `src/common/prisma/` directory with PrismaService and PrismaModule
7. WHEN guards or decorators are relocated to `common/`, THE API_Application SHALL update all import paths in existing modules to reference the new locations
8. THE API_Application SHALL NOT contain duplicate implementations of guards or decorators in the `auth/` directory after relocation

### Requirement 10: Resolve Frontend Duplicate Route Structure

**User Story:** As a frontend developer, I want a single, canonical dashboard route structure, so that there are no conflicting layouts or pages serving the same URL path.

#### Acceptance Criteria

1. THE Frontend_Application SHALL serve the dashboard at a single route path `/dashboard`
2. THE Frontend_Application SHALL NOT contain both `app/(dashboard)/` and `app/dashboard/` route groups simultaneously
3. WHEN the duplicate route group is removed, THE Frontend_Application SHALL retain all existing sub-routes (patients, orders, laboratory, doctor) under the canonical `app/dashboard/` path
4. THE Frontend_Application SHALL use the `app/dashboard/layout.tsx` as the single dashboard layout component
5. THE Frontend_Application SHALL NOT contain the file `app/(dashboard)/layout.tsx` or `app/(dashboard)/dashboard/page.tsx` after consolidation

### Requirement 11: Configure Proper Bootstrap Sequence

**User Story:** As a developer, I want `main.ts` to follow the documented bootstrap pattern with all global configurations applied in the correct order, so that the application starts with a secure, production-ready configuration.

#### Acceptance Criteria

1. THE Bootstrap_Process SHALL apply middleware and configuration in the following order: ConfigModule validation, Helmet, CORS, global prefix, GlobalValidationPipe, AllExceptionsFilter, TransformInterceptor, LoggingInterceptor
2. THE Bootstrap_Process SHALL listen on the port defined by the `PORT` environment variable
3. WHEN the API_Application starts successfully, THE Bootstrap_Process SHALL log a message indicating the listening port and environment name
