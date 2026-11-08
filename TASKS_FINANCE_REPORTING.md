# Backlog — Finance and Reporting

Audit source date: 2026-11-03

## Objective

Make financial operations traceable and reporting numerically reliable for
laboratory billing, payments, refunds, insurance/corporate receivables, and
management reporting.

## Delivery order

1. Complete the refund lifecycle and correct net-revenue calculation.
2. Correct corporate invoicing and establish receivable semantics.
3. Normalize financial transactions into an immutable ledger.
4. Add reconciliation work queues and reliable finance reports.
5. Improve exports, permissions, auditability, and test coverage.

---

## P0 — Complete the refund lifecycle and repair the refund worklist

**Problem**

The refund page requests `GET /api/v1/refunds`, but the API only exposes
order-scoped refund endpoints. The backend can create a `PENDING` refund but
does not provide approve, reject, or process operations. As a result, the
worklist is incomplete and a refund cannot be closed with proof of disbursement.

**Scope**

- Add a paginated, filterable `GET /api/v1/refunds` endpoint with status,
  date-range, order-number, patient, and payment-method filters.
- Add guarded transitions for `PENDING → APPROVED | REJECTED` and
  `APPROVED → PROCESSED`.
- Require reason, actor, timestamp, refund method, and settlement reference;
  permit an optional evidence attachment reference if file storage is available.
- Expose reviewer/processor actions in the refund UI and restrict them with
  dedicated permissions.
- Audit every create, approval, rejection, and processing action.

**Acceptance criteria**

- The refund page loads without calling a nonexistent endpoint.
- A refund cannot be processed without prior approval, and cannot be processed
  more than once.
- Rejected refunds are excluded from the refundable-balance reservation.
- Processed refunds display their processor, processed timestamp, payment method,
  and settlement reference.
- API, service, and UI tests cover valid transitions, invalid transitions,
  permissions, pagination, and refund-limit concurrency.

**Depends on:** none.

---

## P0 — Report net revenue instead of gross payment totals

**Problem**

The current revenue summary aggregates `Order.amountPaid` and does not subtract
processed refunds. It also cannot distinguish cash received, deposit liability,
insurance receivables, discounts, and final settlement.

**Scope**

- Define a finance reporting vocabulary: gross charges, approved discount,
  gross collection, processed refund, net collection, outstanding receivable,
  and deposit balance.
- Update revenue reports to calculate each metric independently and never label
  a gross value as net revenue.
- Include processed refunds by their processing date, and disclose pending or
  approved-but-unprocessed refunds separately.
- Add filters for clinic, referring doctor, insurer/corporate payer, payment
  method, cashier, and date basis (order date, payment date, refund date).
- Update dashboard labels and PDF/CSV exports to use the same definitions.

**Acceptance criteria**

- Net collection equals gross collection minus processed refunds for every
  selected period.
- Discounts, deposits, receivables, and refunds are visible as separate figures.
- Split payments appear once in total collection and correctly in method
  breakdowns.
- Reversing or processing a refund changes the appropriate report period only.
- Deterministic tests cover cash, transfer, split payment, deposit, discount,
  cancellation, refund, and insurance scenarios.

**Depends on:** refund lifecycle task.

---

## P0 — Fix corporate and insurance billing eligibility

**Problem**

Batch invoicing currently selects orders that already have `paidAt` and invoices
their full `totalAmount`. That does not model an insurer/corporate receivable,
coverage amount, copay, partial approval, or prior settlement.

**Scope**

- Specify the billable event for each payer type: patient, BPJS, private
  insurance, and corporate deferred billing.
- Generate invoice items from billable coverage/approved-claim amounts, not
  blindly from `Order.totalAmount`.
- Block orders that are already settled, cancelled, rejected, or already invoiced
  for the same coverage.
- Track invoice amount, payment received, credit/adjustment, write-off, due date,
  and outstanding balance at item and batch level.
- Add invoice issue, send, partial-payment, paid, overdue, cancel, and credit-note
  transitions with audit records.

**Acceptance criteria**

- A corporate/insurer invoice cannot contain a patient-paid order unless a
  documented payer-transfer rule explicitly permits it.
- Invoice total equals the sum of eligible coverage/claim line items.
- Copay remains collectible from the patient and is excluded from payer invoice
  value.
- One coverage line cannot be invoiced twice.
- Aging balance is accurate after partial payments, credits, cancellations, and
  write-offs.

**Depends on:** finance definitions; may be delivered in parallel with the
refund work.

---

## P1 — Introduce an immutable financial transaction ledger

**Problem**

Payment data is split between mutable fields on `Order`, `PaymentComponent`,
and `Refund`. Single payments and deposits do not consistently create payment
components, so there is no complete transaction-level source for cashbook or
financial reporting.

**Scope**

- Add an append-only `FinancialTransaction` model, or an equivalent ledger,
  for charge, payment, deposit, refund, adjustment, invoice issuance, settlement,
  and write-off events.
- Record amount, direction, currency, payment method, source entity, payer,
  effective timestamp, actor, reference, and reversal relationship.
- Generate ledger entries transactionally when payment, deposit, refund, or
  invoice workflows change state.
- Do not mutate settled amounts; use compensating/reversal entries.
- Migrate and reconcile historical `Order`, `PaymentComponent`, and `Refund`
  records with an explicit migration report.

**Acceptance criteria**

- Every monetary movement is represented by at least one immutable ledger entry.
- A single payment, split payment, deposit, refund, and adjustment all have a
  consistent transaction representation.
- Report totals are computed from ledger entries or a documented, reconciled
  projection of them.
- Historical migration reports unmatched/ambiguous records instead of silently
  inventing values.
- Authorization and audit logs prevent unauthorised edits or deletions.

**Depends on:** agreed finance definitions. Coordinate the schema migration with
the invoice and refund work.

---

## P1 — Build reconciliation work queues and settlement controls

**Problem**

Reconciliation supports only a write operation. There is no queue for unmatched
transactions, no bank/EDC statement import, no reviewer workflow, and no UI
surface for finance staff.

**Scope**

- Add read endpoints for pending, matched, unmatched, and exception payment
  components/ledger entries.
- Provide a reconciliation UI with filtering, bulk action, reason, reference,
  reviewer, and audit trail.
- Support CSV/XLSX statement import with a validate/preview/commit workflow.
- Match by amount, reference, method, transaction date, and configurable
  tolerance; make uncertain matches exceptions rather than automatic matches.
- Produce a daily reconciliation summary by cash, transfer, EDC, insurer, and
  corporate payer.

**Acceptance criteria**

- Finance users can view and resolve every unmatched item without database access.
- Imported rows are idempotent and retain their source file and row reference.
- A reconciliation action records who matched it, when, why, and against which
  source transaction.
- Dashboard exposes matched, unmatched, and exception totals by date and method.

**Depends on:** immutable ledger is preferred; can initially operate on
`PaymentComponent` records.

---

## P1 — Correct report semantics and add finance report coverage

**Problem**

The UI labels a status report as “daily” and a payment-method report as
“monthly”. Referring-doctor and clinic reports sum order value but call it
revenue, including unpaid orders. Insurance analytics exists in the API but is
not a complete finance workbench.

**Scope**

- Rename existing reports to match their actual query semantics until true daily,
  weekly, and monthly grouping is implemented.
- Add time grouping and zero-filled date series with a documented timezone.
- Separate billed value, collected value, net collection, outstanding balance,
  and refund totals in doctor, clinic, insurer, and test reports.
- Add AR aging for invoice/claim receivables, collection-rate, discount-rate,
  refund-rate, and payer-performance metrics.
- Provide drill-down from every aggregate to its source orders, invoices, claims,
  and financial transactions.

**Acceptance criteria**

- Every report has a documented metric definition and date basis.
- “Revenue” reports exclude unpaid amounts unless explicitly labelled “billed”.
- Users can group by day, week, and month over the selected range.
- Report drill-down totals equal their parent aggregate.
- Tests cover timezone boundaries, cancelled orders, discounts, refunds, partial
  payer approval, and partial invoice settlement.

**Depends on:** net-revenue definitions; invoice/ledger work improves accuracy.

---

## P2 — Make report exports reproducible and auditable

**Problem**

CSV is generated in the browser from the currently displayed subset; PDF is
available for only two reports. There is no server-side export job, XLSX format,
export history, or scheduled distribution.

**Scope**

- Implement server-side CSV/XLSX/PDF exports using the same report query and
  metric definitions as the UI.
- Include report metadata: filters, timezone, generated-at timestamp, generator,
  application version, and metric definitions.
- Store an export audit event and use background jobs for large exports.
- Add role-based access, secure download expiry, and optional scheduled delivery.

**Acceptance criteria**

- Exported totals match the report view for identical filters.
- CSV/XLSX preserves decimal and date formats without locale ambiguity.
- Large exports do not block an HTTP request and expose job status.
- Every export is traceable to the requesting user, filters, and generation time.

**Depends on:** corrected report semantics.

---

## P2 — Define accounting integration boundaries

**Problem**

The application does not currently include chart of accounts, journals, expense
management, tax, period closing, balance sheet, or profit-and-loss reporting.
These are valid requirements for an accounting system but should not be added
implicitly to a laboratory billing product.

**Scope**

- Decide whether eLIS is the accounting system of record or exports verified
  financial events to an external accounting/ERP product.
- If exporting, define the integration contract, account mapping ownership,
  idempotency key, error queue, retry/reversal behavior, and reconciliation.
- If implementing internally, create a separately approved accounting roadmap
  covering chart of accounts, journal entries, period close, AR/AP, tax, and
  financial statements.

**Acceptance criteria**

- The product owner approves a written boundary decision.
- Financial transactions have a documented downstream accounting treatment.
- Failed exports/integrations are visible, retryable, and reconciled.

**Depends on:** immutable financial transaction ledger.

---

## Definition of done for the program

- Finance can explain every balance from a report down to source transactions.
- Net collection, receivables, deposits, discounts, and refunds are mutually
  consistent across UI, API, PDFs, exports, and audit logs.
- No financial state transition bypasses authorization, validation, and audit.
- Automated tests cover the critical monetary invariants and lifecycle
  transitions.
