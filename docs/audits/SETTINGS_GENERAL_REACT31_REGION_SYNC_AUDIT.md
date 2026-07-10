# Settings General — React Error #31 & Region Sync 403 Audit

## Executive Summary

Two defects were identified and fixed:
1. **Region Sync 403**: The `POST /api/v1/regions/sync` route only allowed `ADMIN` role but the user is `SUPER_ADMIN`. Fixed by adding `SUPER_ADMIN` to the `@Roles` decorator.
2. **React Error #31**: The `MasterDataTable` component rendered cell values directly as React children without safe conversion. When a cell value was a relation object (e.g., `TestCategory` with keys `{id, name, description, isActive, createdAt, updatedAt, deletedAt}`), React threw Error #31. Fixed with a `renderCellValue` helper that extracts human-readable fields from objects.

## Scope

- `/dashboard/settings/general` page (Wilayah tab, Sync dari EMSIFA)
- `/dashboard/master-data/[entity]` page (table rendering)
- `POST /api/v1/regions/sync` backend endpoint
- `MasterDataTable` shared component

## Architecture Discovered

```
Settings General Page
  → Wilayah Tab
    → GET /api/v1/regions/provinsi?limit=50
      → TransformInterceptor wraps → { success, message, data: { success, message, data: [...], meta } }
      → Frontend unwrapResponse → { success, message, data: [...], meta }
      → fetchData extracts → data array
    → Sync Button → POST /api/v1/regions/sync
      → JwtAuthGuard (checks token) → RolesGuard (checks @Roles) → Controller → RegionSyncService → EMSIFA API → DB

MasterDataTable
  → Renders cell values
  → BUG: (row[col.key] as React.ReactNode) ?? "—" — fails when value is an object
```

## Root Cause Evidence

| ID | Severity | Symptom | Source file | Evidence | Confirmed root cause | Fix |
|---|---|---|---|---|---|---|
| 1 | P1 | POST /api/v1/regions/sync returns 403 for SUPER_ADMIN | region.controller.ts:70 | `@Roles(Role.ADMIN)` — only ADMIN listed. RolesGuard checks `requiredRoles.some(r => user.role === r)`. SUPER_ADMIN ≠ ADMIN → false → 403 | Role mismatch: SUPER_ADMIN not in allowed roles | Add `Role.SUPER_ADMIN` to decorator |
| 2 | P1 | React Error #31: object rendered as child | MasterDataTable.tsx:128 | `(row[col.key] as React.ReactNode) ?? "—"` — when col.key = "category" and value is TestCategory object `{id,name,description,isActive,createdAt,updatedAt,deletedAt}` | Unsafe cast of object to ReactNode | `renderCellValue()` helper |

## Changes Implemented

### Fix 1: Region Sync RBAC (region.controller.ts)
- Changed `@Roles(Role.ADMIN)` to `@Roles(Role.SUPER_ADMIN, Role.ADMIN)` on the `syncRegions()` method

### Fix 2: Safe cell rendering (MasterDataTable.tsx)
- Added `renderCellValue()` function that safely handles object values by extracting `.name`, `.label`, or `.code`
- Replaced unsafe `(row[col.key] as React.ReactNode) ?? "—"` with `renderCellValue(row[col.key])`

## Files Modified

- `apps/api/src/laboratory/region/region.controller.ts` — Added SUPER_ADMIN to sync route roles
- `apps/web/src/components/master-data/MasterDataTable.tsx` — Safe cell value rendering

## API Response Contract Analysis

| API | Backend response | After TransformInterceptor | Frontend receives | Match? |
|---|---|---|---|---|
| GET /api/v1/regions/provinsi | `{ success, message, data: [{id,name}], meta }` | Double-wrapped | After unwrap: `[{id,name}]` | ✓ |
| GET /api/v1/master/doctors | `{ data: [...], meta }` | Single-wrapped | After unwrap: `[...full entities...]` | ✓ |
| POST /api/v1/regions/sync | Was 403 | N/A | Error caught | Fixed |

## EMSIFA Sync Analysis

- Source: `https://emsifa.github.io/api-wilayah-indonesia/api`
- Uses upsert operations (idempotent, safe for repeated sync)
- Has retry with exponential backoff
- Syncs 4 levels: provinsi → kabupaten/kota → kecamatan → kelurahan/desa
- Errors are collected per level, partial failures don't crash the whole sync

## Duplicate Request Analysis

- Single click handler (`handleSyncRegion`) with `syncing` guard prevents duplicate clicks
- No React Query mutations involved (uses direct apiClient.post)
- No automatic retries configured
- One click → one POST request ✓

## Remaining Risks

- The Settings General page itself is safe from React #31 (uses `String()`), but the user may have observed the error on `/dashboard/master-data/pemeriksaan-lab` which uses the now-fixed `MasterDataTable`
- Docker deployment still blocked by migration issues (separate from this audit)

## Final Status

FIXED
