# eLIS Web — Route Structure

> Auto-generated route documentation. Keep in sync with `src/app/` directory.

## Overview

The web app uses Next.js App Router with a flat `/dashboard` layout (no route groups).
All authenticated pages live under `/dashboard`.

## Route Map

```
/                                    → Login / landing page
/dashboard                           → Dashboard home (stats overview)
/dashboard/patients                  → Patient list
/dashboard/registration              → Patient registration
/dashboard/visits                    → Visit management
/dashboard/visits/new                → Create new visit
/dashboard/orders                    → Lab order list
/dashboard/orders/new                → Create new order
/dashboard/orders/[id]               → Order detail
/dashboard/laboratory                → Laboratory worklist
/dashboard/laboratory/[id]           → Sample/test detail
/dashboard/laboratory/queue          → Sample queue
/dashboard/laboratory/results        → Result entry
/dashboard/laboratory/approval       → Result approval
/dashboard/laboratory/dashboard-stats → Lab statistics
/dashboard/laboratory/lab-dashboard  → Lab dashboard view
/dashboard/doctor                    → Doctor portal
/dashboard/reports                   → Report generation
/dashboard/audit-trail               → Audit trail log
/dashboard/master-data               → Master data management
/dashboard/master-data/regions       → Region master data
/dashboard/master-data/reference-values → Lab reference values
/dashboard/settings                  → Settings (redirects to /general)
/dashboard/settings/general          → General / master data settings
/dashboard/settings/laboratory       → Laboratory configuration
/dashboard/settings/smtp             → SMTP / email settings
/dashboard/settings/whatsapp         → WhatsApp integration
/dashboard/settings/notifications    → Notification preferences
/dashboard/settings/appearance       → UI appearance
/dashboard/administration/users      → User management
/dashboard/administration/system     → System administration
/dashboard/administration/notifications → Admin notifications
```

## Layout Hierarchy

```
layout.tsx (root)
└── dashboard/layout.tsx (sidebar + authenticated shell)
    ├── laboratory/layout.tsx (lab sub-nav)
    └── settings/layout.tsx (settings sub-nav)
```

## Conventions

- No route groups `(groupName)` are used — all routes are explicit.
- Dynamic segments use `[param]` notation (e.g., `[id]`).
- Settings uses decomposed sub-pages rather than a monolithic page.
- The dashboard root page is `/dashboard/page.tsx`.
