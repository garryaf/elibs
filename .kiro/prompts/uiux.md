# Prompt: UI/UX Implementation

## Purpose
Mengimplementasikan halaman atau komponen frontend.

## Context Loading
1. Read `.kiro/AGENT.md`
2. Read UI spec (`docs/05-UIUX/`)
3. Read related requirement (FR-XXXX)
4. Read related API spec (endpoints to consume)
5. Read existing page/component (if extending)

## Execution Steps

1. **Understand Design** — Read wireframe/mockup specs
2. **Identify Components** — List shadcn/ui components needed
3. **Check API** — Endpoints to call, response shapes
4. **Implement Page/Component** — Follow Next.js App Router pattern
5. **Handle States** — Loading, error, empty, success
6. **Accessibility** — ARIA labels, keyboard nav, color contrast
7. **Responsive** — Mobile, tablet, desktop
8. **Test** — Visual verification

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **State**: React hooks / server components where possible
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React

## Page Structure (App Router)

```
app/dashboard/[feature]/
├── page.tsx          # Main page (server component preferred)
├── loading.tsx       # Loading skeleton
├── error.tsx         # Error boundary
├── layout.tsx        # Layout (if needed)
└── _components/      # Private components for this page
    ├── feature-table.tsx
    └── feature-form.tsx
```

## Component Pattern

```tsx
// Server component (default)
export default async function FeaturePage() {
  const data = await fetchData();
  return <FeatureTable data={data} />;
}

// Client component (when interactivity needed)
'use client';
export function FeatureForm() {
  // hooks, handlers, etc.
}
```

## Accessibility Checklist
- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] Interactive elements have focus states
- [ ] Color is not the only indicator
- [ ] Keyboard navigation works
- [ ] Screen reader tested

## Token Budget
- Target: 5000 tokens
- Max: 8000 tokens
