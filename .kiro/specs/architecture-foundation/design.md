# Design Document: Architecture Foundation (Phase 01)

## Overview

This design addresses the critical audit findings from AUDIT-eLIS-2026-001 by establishing the foundational backend architecture documented in BE-eLIS-2026-001. The scope is strictly infrastructure and security — no new business features are introduced.

The work decomposes into seven concern areas:

1. **Dead code removal** — eliminate `AppController`, `AppService`, and their spec file to resolve the `api/v1/auth` route conflict
2. **Hardcoded secret elimination** — remove fallback secrets and the `createDefaultUser` pattern from auth flows
3. **Environment validation** — introduce `@nestjs/config` with Joi schema validation at startup
4. **HTTP security middleware** — apply Helmet and CORS via environment-driven configuration
5. **Global pipes/filters/interceptors** — wire `ValidationPipe`, `AllExceptionsFilter`, `TransformInterceptor`, and `LoggingInterceptor` globally
6. **Common directory structure** — relocate guards, decorators, and PrismaService into `src/common/` per the architecture spec
7. **Frontend route deduplication** — consolidate the `(dashboard)` and `dashboard` route groups into a single canonical path

### Design Rationale

The ordering follows a dependency chain: environment validation must exist before middleware can read config values; middleware must be registered before global pipes/filters; and the `common/` directory must be in place before interceptors reference shared modules. Dead code removal is first because it unblocks a clean AppModule definition.

---

## Architecture

### High-Level Bootstrap Sequence

```mermaid
sequenceDiagram
    participant M as main.ts
    participant CF as ConfigModule (Joi)
    participant App as NestJS App
    participant H as Helmet
    participant C as CORS
    participant GP as GlobalValidationPipe
    participant EF as AllExceptionsFilter
    participant TI as TransformInterceptor
    participant LI as LoggingInterceptor

    M->>CF: ConfigModule.forRoot() validates env
    CF-->>M: Startup continues (or throws)
    M->>App: NestFactory.create(AppModule)
    M->>H: app.use(helmet())
    M->>C: app.enableCors({ origin: parsedOrigins })
    M->>App: app.setGlobalPrefix('api/v1')
    M->>GP: app.useGlobalPipes(new ValidationPipe(...))
    M->>EF: app.useGlobalFilters(new AllExceptionsFilter())
    M->>TI: app.useGlobalInterceptors(new TransformInterceptor())
    M->>LI: app.useGlobalInterceptors(new LoggingInterceptor())
    M->>App: app.listen(PORT)
```

### Module Dependency Graph

```mermaid
graph TD
    AppModule --> ConfigModule
    AppModule --> PrismaModule
    AppModule --> UsersModule
    AppModule --> AuthModule

    AuthModule --> UsersModule
    AuthModule --> JwtModule
    AuthModule --> PassportModule
    AuthModule --> ConfigModule

    UsersModule --> PrismaModule

    subgraph "src/common/"
        PrismaModule
        Guards["JwtAuthGuard, RolesGuard"]
        Decorators["@Roles, @CurrentUser"]
        Filters["AllExceptionsFilter"]
        Interceptors["TransformInterceptor, LoggingInterceptor"]
        Pipes["ValidationPipe config"]
    end
```

### Target Directory Structure (Backend)

```
apps/api/src/
├── main.ts                          # Bootstrap with full middleware chain
├── app.module.ts                    # Root module (no controllers/providers of its own)
├── common/
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   └── roles.decorator.ts
│   ├── filters/
│   │   └── all-exceptions.filter.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   ├── interceptors/
│   │   ├── transform.interceptor.ts
│   │   └── logging.interceptor.ts
│   ├── pipes/
│   │   └── validation.pipe.ts       # ValidationPipe factory/config export
│   └── prisma/
│       ├── prisma.module.ts
│       └── prisma.service.ts
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/
│   │   └── jwt.strategy.ts
│   └── dto/
│       └── login.dto.ts
└── users/
    ├── users.module.ts
    └── users.service.ts
```

### Target Directory Structure (Frontend — after deduplication)

```
apps/web/src/app/
├── layout.tsx                       # Root layout
├── page.tsx                         # Login page
└── dashboard/
    ├── layout.tsx                   # Single canonical dashboard layout
    ├── page.tsx                     # Dashboard overview
    ├── patients/...
    ├── orders/...
    ├── laboratory/...
    └── doctor/...
```

The `(dashboard)` route group is removed entirely. The `app/dashboard/layout.tsx` becomes the sole dashboard layout.

---

## Components and Interfaces

### 1. Environment Validation (ConfigModule + Joi)

```typescript
// config/env.validation.ts
import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRATION: Joi.string()
    .pattern(/^\d+[smhd]$/)
    .required(),
  CORS_ORIGINS: Joi.string().required(),
  PORT: Joi.number().integer().min(1).max(65535).default(3000),
});
```

Registered globally in `AppModule`:

```typescript
ConfigModule.forRoot({
  isGlobal: true,
  validationSchema: envValidationSchema,
  validationOptions: { abortEarly: false },
});
```

### 2. AllExceptionsFilter

```typescript
// common/filters/all-exceptions.filter.ts
export interface ErrorEnvelope {
  success: false;
  errorCode: string;
  message: string;
  errors: Array<{ field?: string; constraint: string }>;
  traceId: string;
}
```

Behavior:
- Extracts `X-Request-ID` from request headers (or generates a UUID v4 fallback)
- For `HttpException`: preserves status code, extracts `message` and `response.message` (validation array)
- For unknown exceptions: returns 500, generic message, logs full stack via NestJS Logger
- Never includes stack traces in the response body

### 3. TransformInterceptor

```typescript
// common/interceptors/transform.interceptor.ts
export interface SuccessEnvelope<T> {
  success: true;
  message: string;
  data: T;
}
```

Uses RxJS `map` operator to wrap controller return values. Default message: `"Success"`.

### 4. LoggingInterceptor

```typescript
// common/interceptors/logging.interceptor.ts
```

Behavior:
- `before`: records start timestamp, generates/propagates `X-Request-ID`
- `after` (tap): logs `{ method, path, statusCode, durationMs, requestId }`
- Sets `X-Request-ID` response header for client correlation

### 5. GlobalValidationPipe Configuration

```typescript
// common/pipes/validation.pipe.ts
import { ValidationPipe } from '@nestjs/common';

export const globalValidationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  exceptionFactory: (errors) => {
    // Maps class-validator errors to the ErrorEnvelope.errors format
  },
});
```

### 6. AuthModule Refactor (Secret Elimination)

The `JwtModule` registration switches from inline secret to `ConfigService`:

```typescript
JwtModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    secret: config.get<string>('JWT_SECRET'),
    signOptions: { expiresIn: config.get<string>('JWT_EXPIRATION') },
  }),
});
```

`JwtStrategy` similarly injects `ConfigService` to read the secret at runtime.

### 7. @CurrentUser Decorator

```typescript
// common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

### 8. Helmet & CORS (main.ts)

```typescript
import helmet from 'helmet';

app.use(helmet());

const origins = configService.get<string>('CORS_ORIGINS');
app.enableCors({
  origin: origins === '*' ? true : origins.split(',').map(o => o.trim()),
  credentials: true,
});
```

---

## Data Models

This phase introduces no new database tables. The data models affected are the **response envelope types** used system-wide:

### Standard Success Envelope

```typescript
interface ApiResponse<T> {
  success: true;
  message: string;
  data: T;
}
```

### Standard Error Envelope

```typescript
interface ApiErrorResponse {
  success: false;
  errorCode: string;
  message: string;
  errors: ValidationError[];
  traceId: string;
}

interface ValidationError {
  field?: string;
  constraint: string;
}
```

### Environment Configuration Schema

| Variable | Type | Validation | Required |
|----------|------|-----------|:--------:|
| `DATABASE_URL` | string | Valid URI | ✓ |
| `JWT_SECRET` | string | min 32 chars | ✓ |
| `JWT_EXPIRATION` | string | Pattern `\d+[smhd]` | ✓ |
| `CORS_ORIGINS` | string | Non-empty (comma-separated URLs or `*`) | ✓ |
| `PORT` | integer | 1–65535 | ✓ (default: 3000) |

### .env.example

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/elis?schema=public

# Authentication
JWT_SECRET=your-secret-key-minimum-32-characters-long
JWT_EXPIRATION=15m

# Server
PORT=3000
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```


---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Bcrypt cost factor invariant

*For any* valid password string, hashing it with the application's password hashing function SHALL produce a bcrypt hash whose prefix encodes cost factor 12 (i.e., the hash starts with `$2b$12$` or `$2a$12$`).

**Validates: Requirements 2.7**

### Property 2: Environment validation schema rejects invalid configurations

*For any* environment configuration object that is missing at least one required variable (`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRATION`, `CORS_ORIGINS`, `PORT`) OR contains a `JWT_SECRET` shorter than 32 characters OR has a `PORT` outside 1–65535 OR has a `JWT_EXPIRATION` not matching the duration pattern, the Joi validation schema SHALL return a validation error.

**Validates: Requirements 2.3, 3.2, 3.3**

### Property 3: Environment validation error messages identify offending variables

*For any* invalid environment configuration, the validation error message SHALL contain the name of every variable that failed validation or is missing.

**Validates: Requirements 3.4**

### Property 4: CORS origins parsing

*For any* non-empty comma-separated string of URL origins (with optional whitespace around commas), parsing it SHALL produce an array whose length equals the number of comma-separated segments and whose entries are the trimmed origin strings.

**Validates: Requirements 4.2**

### Property 5: ValidationPipe rejects payloads with unknown properties

*For any* request body that contains at least one property not defined in the target DTO class, the GlobalValidationPipe SHALL reject the request with an HTTP 400 response.

**Validates: Requirements 5.1, 5.2**

### Property 6: Validation failure response conforms to error envelope

*For any* request body that fails DTO validation with N distinct constraint violations, the HTTP 400 response SHALL conform to the shape `{ success: false, errorCode: string, message: string, errors: Array, traceId: string }` where the `errors` array contains exactly N entries, each identifying the property name and constraint description.

**Validates: Requirements 5.4, 5.5**

### Property 7: AllExceptionsFilter propagates traceId from X-Request-ID

*For any* exception during request handling and any `X-Request-ID` header value provided by the client, the error response SHALL include a `traceId` field whose value equals the provided `X-Request-ID` header value.

**Validates: Requirements 6.2**

### Property 8: AllExceptionsFilter never leaks stack traces

*For any* exception (including those with multi-line stack traces), the JSON response body returned to the client SHALL NOT contain substrings matching stack trace patterns (e.g., lines starting with "    at ").

**Validates: Requirements 6.3**

### Property 9: AllExceptionsFilter preserves HttpException status codes

*For any* `HttpException` thrown with an HTTP status code in the range 400–599, the response status code SHALL equal the status code provided to the `HttpException` constructor.

**Validates: Requirements 6.5**

### Property 10: AllExceptionsFilter preserves validation errors

*For any* `HttpException` whose response body contains an `errors` array (from validation), the filter's output SHALL include those same entries in the `errors` field of the error envelope.

**Validates: Requirements 6.7**

### Property 11: TransformInterceptor wraps data in success envelope

*For any* value returned by a controller handler (object, array, string, number, null), the TransformInterceptor SHALL produce a response matching `{ success: true, message: "Success", data: <original_value> }`.

**Validates: Requirements 7.1, 7.2**

### Property 12: LoggingInterceptor records request metadata

*For any* completed HTTP request with a given method and path, the log entry produced by the LoggingInterceptor SHALL contain the HTTP method, the request path, the response status code, and a non-negative duration in milliseconds.

**Validates: Requirements 8.1**

### Property 13: X-Request-ID generation and propagation

*For any* incoming request, if the `X-Request-ID` header is provided, the response SHALL echo that same value in the `X-Request-ID` response header and the log entry. If the header is absent, the interceptor SHALL generate a valid UUID v4 and use it in both the response header and the log entry.

**Validates: Requirements 8.2, 8.4**

---

## Error Handling

### Error Response Format

All errors return the standard envelope:

```json
{
  "success": false,
  "errorCode": "VALIDATION_ERROR",
  "message": "Validation failed",
  "errors": [
    { "field": "email", "constraint": "email must be a valid email address" }
  ],
  "traceId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Error Categories

| Scenario | Status Code | errorCode | Handling |
|----------|:-----------:|-----------|----------|
| DTO validation failure | 400 | `VALIDATION_ERROR` | GlobalValidationPipe → AllExceptionsFilter |
| Unknown properties in body | 400 | `VALIDATION_ERROR` | forbidNonWhitelisted triggers BadRequestException |
| Unauthorized (no/invalid JWT) | 401 | `UNAUTHORIZED` | JwtAuthGuard throws UnauthorizedException |
| Forbidden (insufficient role) | 403 | `FORBIDDEN` | RolesGuard throws ForbiddenException |
| Route not found | 404 | `NOT_FOUND` | NestJS default NotFoundException |
| Unhandled exception | 500 | `INTERNAL_SERVER_ERROR` | AllExceptionsFilter catches, logs, returns generic |

### Startup Failure Behavior

When environment validation fails (Joi schema error):
1. ConfigModule throws an error before the app begins listening
2. The process exits with code 1
3. The error message is printed to stderr with each failing variable named
4. No HTTP port is opened — the server never starts

### traceId Strategy

- If the incoming request has an `X-Request-ID` header, that value is used as `traceId`
- If no header is present, the LoggingInterceptor generates a UUID v4 and sets it on the request object
- The AllExceptionsFilter reads the same value from the request for error responses
- The response always includes an `X-Request-ID` header for client correlation

---

## Testing Strategy

### Unit Tests (Jest)

Unit tests verify isolated logic without starting the NestJS app:

| Component | Test Focus |
|-----------|-----------|
| `envValidationSchema` | Valid/invalid env objects against Joi schema |
| `AllExceptionsFilter` | Response formatting, status code preservation, stack trace suppression |
| `TransformInterceptor` | Envelope wrapping for various data types |
| `LoggingInterceptor` | Log entry format, X-Request-ID handling |
| `CORS origin parser` | Comma-separated string → array conversion |
| `ValidationPipe exceptionFactory` | Error array formatting |

### Property-Based Tests (fast-check)

Property-based tests use [fast-check](https://github.com/dubzzz/fast-check) to verify universal properties across generated inputs. Each test runs a minimum of 100 iterations.

| Property | Generator Strategy |
|----------|-------------------|
| Property 1 (bcrypt cost) | `fc.string(1, 72)` for passwords (bcrypt max 72 bytes) |
| Property 2 (env validation) | Custom arbitrary generating env objects with missing/invalid fields |
| Property 3 (error variable names) | Same generator as P2, assert on error message content |
| Property 4 (CORS parsing) | `fc.array(fc.webUrl())` joined with `, ` |
| Property 5 (unknown props rejected) | DTO arbitrary + `fc.dictionary()` for extra props |
| Property 6 (validation envelope) | Arbitrary with N invalid fields, assert errors.length === N |
| Property 7 (traceId propagation) | `fc.uuid()` for X-Request-ID values |
| Property 8 (no stack traces) | Arbitrary Error/TypeError/custom errors with stack traces |
| Property 9 (status code preserved) | `fc.integer(400, 599)` for HTTP status codes |
| Property 10 (validation errors preserved) | `fc.array(fc.record({field: fc.string(), constraint: fc.string()}))` |
| Property 11 (success envelope) | `fc.anything()` for arbitrary controller return values |
| Property 12 (log metadata) | `fc.record({method: fc.constantFrom('GET','POST',...), path: fc.string()})` |
| Property 13 (X-Request-ID) | `fc.option(fc.uuid())` — present or absent header |

Each property test is tagged:
```typescript
// Feature: architecture-foundation, Property 1: Bcrypt cost factor invariant
```

### Integration Tests (Jest + Supertest)

Integration tests start the NestJS app and verify end-to-end behavior:

| Test | Validates |
|------|-----------|
| App starts with valid env | Requirements 3.1, 11.2, 11.3 |
| App fails to start with missing JWT_SECRET | Requirements 2.2 |
| Helmet headers present on all responses | Requirements 4.1, 4.5 |
| CORS blocks disallowed origins | Requirements 4.3 |
| CORS allows wildcard when configured | Requirements 4.6 |
| Global prefix `api/v1` works | Requirements 4.4 |
| Unknown endpoint returns 404 in envelope | Requirements 6.1 |

### Smoke Tests

Structural assertions verified by build/lint:

| Check | Validates |
|-------|-----------|
| `tsc --noEmit` passes (no broken imports) | Requirements 9.7 |
| `app.controller.ts` does not exist | Requirements 1.2, 1.3, 1.4 |
| `common/` directories exist with expected files | Requirements 9.1–9.6 |
| No forbidden strings in source | Requirements 2.4, 2.5 |
| `(dashboard)` directory removed | Requirements 10.2, 10.5 |
| `.env.example` exists with all vars | Requirements 3.5 |

### Test Configuration

```json
{
  "devDependencies": {
    "fast-check": "^3.x",
    "@nestjs/config": "^3.x",
    "joi": "^17.x",
    "helmet": "^7.x"
  }
}
```

Minimum 100 iterations per property test. Tests reference their design property via tag comments.
