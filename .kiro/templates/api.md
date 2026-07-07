# API-XXXX: [Endpoint Name]

## Status: [DRAFT | IMPLEMENTED | DEPRECATED]

## Endpoint
`METHOD /api/v1/resource`

## Description
Deskripsi singkat tujuan endpoint ini.

## Authentication
- Required: Yes / No
- Type: Bearer JWT
- Roles: [SUPER_ADMIN, ADMIN, DOCTOR, LAB_TECH, NURSE]

## Request

### Headers
| Header | Required | Description |
|--------|:--------:|-------------|
| Authorization | Yes | `Bearer <token>` |
| Content-Type | Yes | `application/json` |
| X-Request-ID | No | Client trace ID (auto-generated if absent) |

### Path Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Resource identifier |

### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Items per page |

### Body
```json
{
  "field1": "string",
  "field2": 123,
  "field3": true
}
```

### Validation Rules
| Field | Type | Constraints |
|-------|------|-------------|
| field1 | string | required, min 1, max 255 |
| field2 | number | required, min 0 |
| field3 | boolean | optional, default false |

## Response

### Success (200/201)
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": "uuid",
    "field1": "value"
  }
}
```

### Error (400 — Validation)
```json
{
  "success": false,
  "errorCode": "VALIDATION_ERROR",
  "message": "Validation failed",
  "errors": [
    { "field": "field1", "constraint": "field1 must not be empty" }
  ],
  "traceId": "uuid"
}
```

### Error (401 — Unauthorized)
```json
{
  "success": false,
  "errorCode": "UNAUTHORIZED",
  "message": "Unauthorized",
  "errors": [],
  "traceId": "uuid"
}
```

### Error (404 — Not Found)
```json
{
  "success": false,
  "errorCode": "NOT_FOUND",
  "message": "Resource not found",
  "errors": [],
  "traceId": "uuid"
}
```

## Related
- Requirement: FR-XXXX
- Design: DES-XXXX
- Task: TASK-XXXX
