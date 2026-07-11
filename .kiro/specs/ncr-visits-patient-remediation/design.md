# Design Document

## Overview

This design addresses three NCR remediation items for the eLIS Visits and Patient modules:

1. **NCR-05-08** — RBAC UI Gate for the Visits page (prevent unauthorized direct-URL access)
2. **NCR-05-12** — Contextual row actions on the Visits table (status + role driven)
3. **NCR-03-10** — Patient lab history display in the patient detail modal

All implementations reuse established project patterns: sidebar role filtering, `useAuth()` page-level checks, and the `ActionMenu` dropdown component from `PatientTable.tsx`.

---

## Architecture

### Component 1: RBAC UI Gate for Visits Page (NCR-05-08)

**Description:** Add client-side role enforcement so only `Authorized_Visit_Roles` can access `/dashboard/visits`. Also add the "Kunjungan" menu item to the sidebar with the same role filter.

**Authorized Visit Roles:** `KASIR`, `CS`, `ADMIN`, `KLINIK_PARTNER`, `SUPER_ADMIN`, `OWNER`, `MANAGER`

**File Locations:**
- `apps/web/src/app/dashboard/visits/page.tsx` — page-level RBAC gate
- `apps/web/src/components/layout/sidebar.tsx` — new "Kunjungan" menu item

**Implementation Approach:**

No new HOC or wrapper component. The visits page itself imports `useAuth()` and performs inline role checking — identical to the pattern used in `settings/general/page.tsx` and `master-data/page.tsx`.

```typescript
// apps/web/src/app/dashboard/visits/page.tsx
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

const AUTHORIZED_VISIT_ROLES = [
  "KASIR", "CS", "ADMIN", "KLINIK_PARTNER", "SUPER_ADMIN", "OWNER", "MANAGER"
];

export default function VisitsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Loading state while auth is resolving
  if (isLoading) return <LoadingIndicator />;

  // Redirect unauthorized roles to dashboard
  if (!user || !AUTHORIZED_VISIT_ROLES.includes(user.role)) {
    router.replace("/dashboard");
    return null;
  }

  // ... existing page content
}
```

**Sidebar Addition:**

Add a "Kunjungan" item to the `UTAMA` menu group with the `roles` array:

```typescript
// In menuGroups[0].items (UTAMA group), after "Pasien":
{
  name: "Kunjungan",
  href: "/dashboard/visits",
  icon: Calendar, // or ClipboardList
  roles: ["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN", "KASIR", "CS", "KLINIK_PARTNER"],
},
```

**Key Decisions:**
- Reuses the existing `isItemVisible()` filter in sidebar — no changes to the filtering logic needed
- Page-level guard uses `useEffect` with `router.replace()` for smooth redirect (no flash)
- Session expiry is already handled by the auth context (redirects to login when token is gone)

---

### Component 2: Contextual Row Actions on Visits Table (NCR-05-12)

**Description:** Create a `VisitRowActions` component following the `ActionMenu` pattern from `PatientTable.tsx`. Actions displayed are determined by both visit status and user role.

**File Locations:**
- `apps/web/src/components/visits/VisitRowActions.tsx` — new component
- `apps/web/src/app/dashboard/visits/page.tsx` — integrate into table rows
- `apps/web/src/components/visits/CancelVisitDialog.tsx` — confirmation dialog

**Key Interfaces/Types:**

```typescript
interface VisitRowActionsProps {
  visit: Visit;
  userRole: string;
  onViewDetail: (visit: Visit) => void;
  onEdit: (visit: Visit) => void;
  onCancelSuccess: () => void; // triggers data refresh
}

// Role sets (matching backend guards)
const EDIT_VISIT_ROLES = ["KASIR", "CS", "ADMIN", "SUPER_ADMIN"];
const CANCEL_VISIT_ROLES = ["KASIR", "ADMIN", "SUPER_ADMIN"];
```

**Action Visibility Matrix:**

| Status | Action | Condition |
|--------|--------|-----------|
| `REGISTERED` | Lihat Detail | Always |
| `REGISTERED` | Edit Kunjungan | Role ∈ `EDIT_VISIT_ROLES` |
| `REGISTERED` | Batalkan Kunjungan | Role ∈ `CANCEL_VISIT_ROLES` |
| `IN_PROGRESS` | Lihat Detail | Always |
| `IN_PROGRESS` | Edit Kunjungan | Role ∈ `EDIT_VISIT_ROLES` |
| `COMPLETED` | Lihat Detail | Always (only action) |
| `CANCELLED` | Lihat Detail | Always (only action) |

**Implementation Approach:**

```typescript
// apps/web/src/components/visits/VisitRowActions.tsx
export function VisitRowActions({ visit, userRole, onViewDetail, onEdit, onCancelSuccess }: VisitRowActionsProps) {
  const [open, setOpen] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const canEdit = EDIT_VISIT_ROLES.includes(userRole) &&
    ["REGISTERED", "IN_PROGRESS"].includes(visit.status);
  const canCancel = CANCEL_VISIT_ROLES.includes(userRole) &&
    visit.status === "REGISTERED";

  return (
    <>
      <div className="relative">
        <button onClick={() => setOpen(v => !v)} onBlur={...}>
          <MoreVertical className="h-4 w-4" />
        </button>
        {open && (
          <div className="absolute right-0 top-8 z-20 min-w-36 rounded-xl border ...">
            {/* Always show view */}
            <ActionItem icon={Eye} label="Lihat Detail" onClick={() => onViewDetail(visit)} />

            {canEdit && <ActionItem icon={Pencil} label="Edit Kunjungan" onClick={() => onEdit(visit)} />}

            {canCancel && (
              <>
                <Divider />
                <ActionItem icon={XCircle} label="Batalkan Kunjungan" destructive onClick={() => setShowCancelDialog(true)} />
              </>
            )}
          </div>
        )}
      </div>

      {showCancelDialog && (
        <CancelVisitDialog
          visit={visit}
          onConfirm={handleCancel}
          onClose={() => setShowCancelDialog(false)}
        />
      )}
    </>
  );
}
```

**Cancellation Dialog (`CancelVisitDialog.tsx`):**

```typescript
interface CancelVisitDialogProps {
  visit: Visit;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}
```

- Requires a cancellation reason (text input, min 10 chars)
- Shows visit number and patient name for confirmation context
- Calls `POST /api/v1/visits/:id/cancel` with `{ reason }` body
- On success: closes dialog, triggers `onCancelSuccess` (refreshes table)
- On failure: shows error toast/notification within dialog

**Error Handling:**
- Toast notification via existing notification pattern on mutation failure
- Error message sourced from API response `message` field

---

### Component 3: Patient Lab History Display (NCR-03-10)

**Description:** Add a backend endpoint for patient lab history and a frontend tab/section within the patient detail modal.

**File Locations:**
- `apps/api/src/laboratory/patient/patient.controller.ts` — new endpoint
- `apps/api/src/laboratory/patient/patient.service.ts` — new service method
- `apps/api/src/laboratory/patient/dto/lab-history-query.dto.ts` — query params DTO
- `apps/web/src/components/patients/PatientLabHistory.tsx` — new component
- `apps/web/src/components/patients/PatientDetailModal.tsx` — integrate tab

**Key Interfaces/Types (Backend):**

```typescript
// DTO for query parameters
class LabHistoryQueryDto {
  @IsOptional() @Type(() => Number) @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @Min(1) @Max(50)
  limit?: number = 10;
}

// Response shape
interface LabHistoryResponse {
  success: true;
  data: {
    items: LabHistoryItem[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  };
}

interface LabHistoryItem {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod | null;
  createdAt: string; // ISO date
  visit: { visitNumber: string } | null;
  orderDetails: {
    id: string;
    testName: string;
    resultValue: string | null;
    flag: Flag | null;
    status: OrderDetailStatus;
  }[];
}
```

**Key Interfaces/Types (Frontend):**

```typescript
interface PatientLabHistoryProps {
  patientId: string;
}

// State: loading | error | empty | data
```

---

## Data Flow

### NCR-05-08: RBAC Gate Flow

```
User navigates to /dashboard/visits
  → useAuth() provides { user, isLoading }
  → isLoading=true → render <LoadingIndicator />
  → isLoading=false, user.role NOT in AUTHORIZED_VISIT_ROLES
      → router.replace("/dashboard")
  → isLoading=false, user.role IN AUTHORIZED_VISIT_ROLES
      → render <VisitsPage /> content
```

Sidebar visibility:
```
Sidebar renders menu items
  → isItemVisible("Kunjungan") checks user.role against roles array
  → If role not included → item is hidden (never rendered)
```

### NCR-05-12: Row Actions Flow

```
Table row renders <VisitRowActions visit={visit} userRole={user.role} ... />
  → Component computes canEdit, canCancel from status + role
  → User clicks "Batalkan Kunjungan"
      → <CancelVisitDialog> opens
      → User enters reason, confirms
      → POST /api/v1/visits/:id/cancel { reason }
      → On 200: close dialog, call onCancelSuccess() → parent re-fetches visits
      → On error: show error in dialog
```

### NCR-03-10: Lab History Data Flow

```
User opens Patient Detail Modal
  → "Riwayat Laboratorium" tab/section visible (if role in LAB_HISTORY_ROLES)
  → On tab active: GET /api/v1/patients/:id/lab-history?page=1&limit=10
  → Backend:
      prisma.order.findMany({
        where: { patientId: id },
        include: { orderDetails: { include: { test: { select: { name: true } } } }, visit: { select: { visitNumber: true } } },
        orderBy: { createdAt: 'desc' },
        skip/take for pagination
      })
  → Returns paginated LabHistoryItem[]
  → Frontend renders list with order cards showing tests + results
```

---

## API Changes

### New Endpoint: GET `/api/v1/patients/:id/lab-history`

**Guards:** `JwtAuthGuard`, `RolesGuard`
**Allowed Roles:** `KASIR`, `CS`, `ADMIN`, `SUPER_ADMIN`, `OWNER`, `MANAGER`, `SAMPLING`, `ANALIS`, `DOKTER`, `KLINIK_PARTNER`

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 10 | Items per page (max 50) |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Lab history retrieved",
  "data": {
    "items": [
      {
        "id": "uuid",
        "orderNumber": "ORD-2026-0001",
        "status": "COMPLETED",
        "paymentMethod": "CASH",
        "createdAt": "2026-07-10T08:00:00.000Z",
        "visit": { "visitNumber": "VST-2026-0001" },
        "orderDetails": [
          {
            "id": "uuid",
            "testName": "Complete Blood Count",
            "resultValue": "14.2",
            "flag": "NORMAL",
            "status": "COMPLETED"
          }
        ]
      }
    ],
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

**Error Responses:**
- `401` — Unauthenticated
- `403` — Role not in `Lab_History_Roles`
- `404` — Patient not found

**Implementation:**

```typescript
// patient.controller.ts
@Get(':id/lab-history')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  Role.KASIR, Role.CS, Role.ADMIN, Role.SUPER_ADMIN,
  Role.OWNER, Role.MANAGER, Role.SAMPLING, Role.ANALIS,
  Role.DOKTER, Role.KLINIK_PARTNER,
)
@ApiOperation({ summary: 'Get patient lab history' })
async getLabHistory(
  @Param('id', ParseUUIDPipe) id: string,
  @Query() query: LabHistoryQueryDto,
) {
  return this.patientService.getLabHistory(id, query);
}
```

**Service Method:**

```typescript
// patient.service.ts
async getLabHistory(patientId: string, query: LabHistoryQueryDto) {
  // 1. Verify patient exists (throw NotFoundException if not)
  // 2. Query orders with pagination
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;

  const [items, total] = await Promise.all([
    this.prisma.order.findMany({
      where: { patientId },
      include: {
        visit: { select: { visitNumber: true } },
        orderDetails: {
          include: { test: { select: { name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    this.prisma.order.count({ where: { patientId } }),
  ]);

  // 3. Map to response shape (flatten test name into orderDetail)
  const mapped = items.map(order => ({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt,
    visit: order.visit ? { visitNumber: order.visit.visitNumber } : null,
    orderDetails: order.orderDetails.map(d => ({
      id: d.id,
      testName: d.test.name,
      resultValue: d.resultValue,
      flag: d.flag,
      status: d.status,
    })),
  }));

  return {
    success: true,
    message: 'Lab history retrieved',
    data: {
      items: mapped,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  };
}
```

### Existing Endpoint Used: POST `/api/v1/visits/:id/cancel`

Already implemented in `visit.controller.ts`. The frontend `CancelVisitDialog` will call this endpoint. No backend changes needed for cancellation.

---

## Frontend Components

### New Components

| Component | Path | Purpose |
|-----------|------|---------|
| `VisitRowActions` | `apps/web/src/components/visits/VisitRowActions.tsx` | Contextual dropdown menu per visit row |
| `CancelVisitDialog` | `apps/web/src/components/visits/CancelVisitDialog.tsx` | Confirmation dialog for visit cancellation |
| `PatientLabHistory` | `apps/web/src/components/patients/PatientLabHistory.tsx` | Lab history list with pagination |

### Modified Components

| Component | Path | Change |
|-----------|------|--------|
| `VisitsPage` | `apps/web/src/app/dashboard/visits/page.tsx` | Add RBAC gate + integrate `VisitRowActions` |
| `Sidebar` | `apps/web/src/components/layout/sidebar.tsx` | Add "Kunjungan" menu item |
| `PatientDetailModal` | `apps/web/src/components/patients/PatientDetailModal.tsx` | Add "Riwayat Laboratorium" tab |

### PatientLabHistory Component Design

```typescript
// apps/web/src/components/patients/PatientLabHistory.tsx
export function PatientLabHistory({ patientId }: { patientId: string }) {
  const [data, setData] = useState<LabHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Fetch on mount and page change
  useEffect(() => { fetchLabHistory(); }, [patientId, page]);

  // Render states: loading skeleton, error + retry, empty state, or data list
  if (loading) return <LabHistorySkeleton />;
  if (error) return <ErrorWithRetry message={error} onRetry={fetchLabHistory} />;
  if (data?.items.length === 0) return <EmptyState message="Belum ada riwayat laboratorium" />;

  return (
    <div>
      {data.items.map(order => (
        <OrderCard key={order.id} order={order} />
      ))}
      <Pagination meta={data.meta} onPageChange={setPage} />
    </div>
  );
}
```

**OrderCard** displays:
- Order number + date (header)
- Status badge + payment method
- Expandable list of test results (test name, value, flag with color coding)

---

## Testing Strategy

### Unit Tests

| Test Target | File | Coverage |
|-------------|------|----------|
| `VisitRowActions` | `__tests__/VisitRowActions.test.tsx` | Action visibility per status×role matrix |
| `PatientLabHistory` | `__tests__/PatientLabHistory.test.tsx` | Loading, error, empty, data states |
| `PatientService.getLabHistory` | `patient.service.spec.ts` | Pagination, patient not found, response shape |
| RBAC gate logic | `visits/page.test.tsx` | Redirect for unauthorized, render for authorized |

### Integration Tests

| Test Target | Coverage |
|-------------|----------|
| `GET /api/v1/patients/:id/lab-history` | 200 with data, 200 empty, 404 patient not found, 403 unauthorized role |
| `POST /api/v1/visits/:id/cancel` (existing) | Verify frontend calls correctly with reason |

### Property-Based Tests (fast-check)

| Property | Description |
|----------|-------------|
| Action visibility determinism | For any (status, role) pair, the visible actions set is stable and matches the matrix |
| Lab history pagination | For any valid (page, limit), returned items ≤ limit and meta.totalPages = ceil(total/limit) |

### Manual / E2E Verification

- Navigate to `/dashboard/visits` with unauthorized role → confirm redirect
- Confirm sidebar "Kunjungan" visibility matches role matrix
- Verify action menu changes per status (create visits in different statuses)
- Cancel a REGISTERED visit, confirm refresh and status change
- Open patient detail → confirm lab history tab loads with real data
