# Bugfix Requirements Document

## Introduction

The Master Data page (`/dashboard/master-data`) has three interrelated bugs that prevent users from managing any master data entities through the frontend. All 10 master data cards redirect to the wrong page (Settings), no TanStack Query service layer exists to fetch data from the backend, and any sub-page that does attempt to render data crashes with `e.map is not a function` because the API response wrapper `{ data: [...], meta: {...} }` is not being unwrapped before iteration. The backend CRUD endpoints are fully functional — this is purely a frontend wiring issue.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user clicks any of the 10 Master Data cards on `/dashboard/master-data` THEN the system navigates to `/dashboard/settings` instead of the entity-specific CRUD page

1.2 WHEN the frontend attempts to render a master data entity list THEN the system throws `e.map is not a function` because `.map()` is called on the paginated wrapper object `{ data: [...], meta: {...} }` instead of on `response.data`

1.3 WHEN the frontend needs to fetch master data entities (doctors, clinics, insurances, equipments, reagents, sample-types, measurement-units, test-categories, tests, panels) THEN the system has no TanStack Query hooks available, leaving pages without a data-fetching mechanism

1.4 WHEN the frontend needs to create, update, or delete a master data entity THEN the system has no mutation hooks, making CRUD operations impossible from the UI

### Expected Behavior (Correct)

2.1 WHEN a user clicks a Master Data card THEN the system SHALL navigate to the correct entity-specific page (e.g., `/dashboard/master-data/satuan` for Satuan, `/dashboard/master-data/jenis-sampel` for Jenis Sampel, etc.)

2.2 WHEN the frontend receives a paginated API response `{ data: [...], meta: {...} }` THEN the system SHALL extract the `.data` array before calling `.map()` for rendering, preventing runtime type errors

2.3 WHEN the frontend needs to list master data entities THEN the system SHALL provide TanStack Query `useQuery` hooks for each of the 10 entity types that call the correct `/api/v1/master/*` endpoints

2.4 WHEN the frontend needs to create, update, or delete a master data entity THEN the system SHALL provide TanStack Query `useMutation` hooks that call the appropriate backend CRUD endpoints and invalidate the relevant query cache on success

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user navigates to non-master-data pages (patients, orders, lab workflow, dashboard, settings) THEN the system SHALL CONTINUE TO function with existing navigation, data fetching, and rendering behavior

3.2 WHEN the existing `apiClient` methods (getDoctors, getClinics, getInsurances, getTestCategories, getTests) are called by other parts of the application THEN the system SHALL CONTINUE TO return data in the same `ApiResponse<PaginatedResponse<T>>` format without modification

3.3 WHEN the Master Data main page layout renders the grid of 10 cards with icons, names, and descriptions THEN the system SHALL CONTINUE TO display the same visual layout, styling, and card information (only the `href` targets change)

3.4 WHEN backend API endpoints at `/api/v1/master/*` receive requests THEN the system SHALL CONTINUE TO return the paginated response structure `{ data: [...], meta: { total, page, limit } }` without any backend changes

---

## Bug Condition (Formal)

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type MasterDataNavigation
  OUTPUT: boolean
  
  // Returns true when navigating to any master data entity page
  RETURN X.targetPage IN {
    "kategori-pemeriksaan", "pemeriksaan-lab", "panel",
    "dokter", "klinik", "asuransi", "alat", "reagen",
    "satuan", "jenis-sampel"
  }
END FUNCTION
```

```pascal
// Property: Fix Checking - Correct Navigation
FOR ALL X WHERE isBugCondition(X) DO
  result ← navigateMasterDataCard'(X)
  ASSERT result.href = "/dashboard/master-data/" + X.targetPage
END FOR
```

```pascal
// Property: Fix Checking - Data Rendering
FOR ALL X WHERE isBugCondition(X) DO
  response ← fetchMasterData'(X.targetPage)
  renderInput ← response.data  // extract array from wrapper
  ASSERT Array.isArray(renderInput) AND no_runtime_error(renderInput.map(...))
END FOR
```

```pascal
// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT F(X) = F'(X)
END FOR
```
