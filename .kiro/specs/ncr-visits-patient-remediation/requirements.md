# Requirements Document

## Introduction

This specification addresses three deferred NCR findings from the eLIS per-menu architecture audit. The remediations cover: (1) missing RBAC UI gating on the Visits page allowing unauthorized direct-URL access, (2) absent contextual row actions in the visits table that should reflect visit status and user role, and (3) the patient detail modal lacking any lab history display. These findings are tracked as NCR-05-08, NCR-05-12, and NCR-03-10 respectively.

## Glossary

- **Visits_Page**: The frontend page at `/dashboard/visits` displaying a paginated table of patient visits
- **Visits_Table**: The data table rendered within the Visits_Page showing visit records with columns and actions
- **ActionMenu**: A dropdown component triggered by a vertical ellipsis icon providing contextual operations on a table row
- **RBAC_Gate**: A client-side authorization check that restricts page access based on the authenticated user's role
- **Lab_History**: A chronological list of laboratory orders and test results associated with a specific patient
- **Patient_Detail_Modal**: The modal dialog displayed when viewing a patient's information from the Patients page
- **Visit_Status**: An enum with values REGISTERED, IN_PROGRESS, COMPLETED, CANCELLED representing workflow states
- **Authorized_Visit_Roles**: The set of roles permitted to access the Visits page: KASIR, CS, ADMIN, KLINIK_PARTNER, SUPER_ADMIN, OWNER, MANAGER
- **Edit_Visit_Roles**: The set of roles permitted to edit a visit: KASIR, CS, ADMIN, SUPER_ADMIN
- **Cancel_Visit_Roles**: The set of roles permitted to cancel a visit: KASIR, ADMIN, SUPER_ADMIN
- **Lab_History_Roles**: The set of roles permitted to view patient lab history: KASIR, CS, ADMIN, SUPER_ADMIN, OWNER, MANAGER, SAMPLING, ANALIS, DOKTER, KLINIK_PARTNER
- **Order_Status**: An enum representing the lab order workflow: PENDING_PAYMENT, PAYMENT_OVERDUE, PAID, SAMPLE_COLLECTED, IN_ANALYSIS, VERIFIED, APPROVED, NOTIFIED, CANCELLED

## Requirements

### Requirement 1: RBAC UI Gate for Visits Page

**User Story:** As a system administrator, I want the Visits page to enforce role-based access so that only authorized personnel can view and manage visit records.

#### Acceptance Criteria

1. WHEN an authenticated user with a role in Authorized_Visit_Roles navigates to the Visits_Page, THE RBAC_Gate SHALL render the page content normally
2. WHEN an authenticated user with a role NOT in Authorized_Visit_Roles navigates to the Visits_Page via direct URL, THE RBAC_Gate SHALL redirect the user to the dashboard page
3. THE Sidebar SHALL display a "Kunjungan" menu item linking to the Visits_Page only for users whose role is in Authorized_Visit_Roles
4. WHILE the RBAC_Gate is evaluating user authorization, THE Visits_Page SHALL display a loading indicator
5. IF the user's authentication session expires while on the Visits_Page, THEN THE RBAC_Gate SHALL redirect the user to the login page

### Requirement 2: Contextual Row Actions on Visits Table

**User Story:** As a front-desk operator, I want visit table rows to show relevant actions based on the visit's current status and my role so that I can efficiently manage visit workflows.

#### Acceptance Criteria

1. WHEN a visit has status REGISTERED and the user's role is in Edit_Visit_Roles, THE ActionMenu SHALL display "Edit Kunjungan" and "Lihat Detail" actions
2. WHEN a visit has status REGISTERED and the user's role is in Cancel_Visit_Roles, THE ActionMenu SHALL display a "Batalkan Kunjungan" action
3. WHEN a visit has status IN_PROGRESS and the user's role is in Edit_Visit_Roles, THE ActionMenu SHALL display "Edit Kunjungan" and "Lihat Detail" actions
4. WHEN a visit has status COMPLETED, THE ActionMenu SHALL display only the "Lihat Detail" action regardless of user role
5. WHEN a visit has status CANCELLED, THE ActionMenu SHALL display only the "Lihat Detail" action regardless of user role
6. WHEN the user selects "Batalkan Kunjungan", THE Visits_Table SHALL display a confirmation dialog before executing the cancellation
7. WHEN a cancellation is confirmed, THE Visits_Table SHALL call the cancel endpoint and refresh the visit list upon success
8. WHEN a mutation (edit or cancel) succeeds, THE Visits_Table SHALL refresh the data to reflect the updated state
9. IF a mutation request fails, THEN THE Visits_Table SHALL display an error notification with the failure reason

### Requirement 3: Patient Lab History Display

**User Story:** As a laboratory staff member, I want to view a patient's lab history from their detail view so that I can reference previous test results when processing new orders.

#### Acceptance Criteria

1. WHEN a user with a role in Lab_History_Roles opens the Patient_Detail_Modal, THE Patient_Detail_Modal SHALL display a "Riwayat Laboratorium" tab or section
2. WHEN the "Riwayat Laboratorium" section is displayed, THE Patient_Detail_Modal SHALL list all orders belonging to that patient sorted by creation date descending
3. THE Lab_History SHALL display for each order: order number, order date, status, payment method, and the list of tests with their results and flags
4. WHILE the lab history data is loading, THE Patient_Detail_Modal SHALL display a loading skeleton in the history section
5. IF the patient has no lab history records, THEN THE Patient_Detail_Modal SHALL display an empty state message indicating no lab history exists
6. IF the lab history request fails, THEN THE Patient_Detail_Modal SHALL display an error message with a retry option
7. WHEN the backend receives a GET request to `/api/v1/patients/:id/lab-history`, THE Patient_Controller SHALL return paginated lab history scoped exclusively to the specified patient
8. THE Patient_Controller SHALL enforce role-based access on the lab history endpoint, restricting access to Lab_History_Roles
9. WHEN pagination parameters are provided, THE Patient_Controller SHALL return the requested page of results with total count metadata
