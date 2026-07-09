# Requirements Document

## Introduction

This feature ensures Patient identity integrity in the Enterprise Laboratory Information System (eLIS). It enforces that each patient is created only once by leveraging auto-generated Medical Record Numbers (MRN) and unique Indonesian National Identity Numbers (NIK). The feature adds database-level constraints and search indexes for fast lookup while preserving backward compatibility with existing patient data.

## Glossary

- **Patient_Service**: The NestJS service responsible for patient registration, retrieval, and update operations.
- **MRN_Generator**: The service that produces unique Medical Record Numbers in the format `RM-YYYYMM-XXXX` using an atomic sequence table.
- **MRN**: Medical Record Number — a system-generated unique identifier for each patient, format `RM-YYYYMM-XXXX`.
- **NIK**: Nomor Induk Kependudukan — Indonesian national identity number, exactly 16 digits.
- **MRN_Sequence**: The database table that tracks monthly auto-increment counters for MRN generation.
- **Patient_Repository**: The Prisma-based data access layer for the Patient model.
- **Search_Index**: A PostgreSQL index (B-tree or GIN/trigram) that accelerates lookup queries.
- **Deduplication_Check**: The process of verifying whether a patient with a given NIK already exists before creating a new record.

## Requirements

### Requirement 1: Auto-Generate MRN on Patient Registration

**User Story:** As a front-desk operator, I want the system to automatically generate a unique MRN when I register a new patient, so that I do not need to manually assign record numbers.

#### Acceptance Criteria

1. WHEN a patient registration request is received, THE MRN_Generator SHALL produce a new MRN in the format `RM-YYYYMM-XXXX` where YYYY is the four-digit year, MM is the two-digit month, and XXXX is a zero-padded sequential number.
2. WHEN a patient registration request is received, THE Patient_Service SHALL assign the generated MRN to the patient record without requiring MRN input from the caller.
3. WHEN multiple patient registrations occur within the same month, THE MRN_Generator SHALL increment the sequence number atomically to prevent duplicate MRN values.
4. IF the MRN_Sequence table does not have an entry for the current month, THEN THE MRN_Generator SHALL create a new entry starting at sequence value 1.

### Requirement 2: Enforce MRN Uniqueness

**User Story:** As a system administrator, I want the database to enforce MRN uniqueness at the schema level, so that no two patients can share the same Medical Record Number.

#### Acceptance Criteria

1. THE Patient_Repository SHALL enforce a unique constraint on the `mrn` column at the database level.
2. IF a duplicate MRN insertion is attempted, THEN THE Patient_Repository SHALL reject the operation and return a constraint violation error.
3. THE Patient_Service SHALL use serializable transaction isolation when generating and assigning MRN values to prevent race conditions.

### Requirement 3: Enforce NIK Uniqueness and Patient Deduplication

**User Story:** As a front-desk operator, I want the system to prevent registering a patient with an NIK that already exists, so that each patient is created only once.

#### Acceptance Criteria

1. THE Patient_Repository SHALL enforce a unique constraint on the `nik` column at the database level.
2. WHEN a patient registration request is received, THE Patient_Service SHALL perform a Deduplication_Check by querying for an existing non-deleted patient with the same NIK.
3. IF a patient with the submitted NIK already exists and is not soft-deleted, THEN THE Patient_Service SHALL reject the registration with error code `ERR_VALIDATION` and message "NIK already registered".
4. WHEN a patient registration request contains a NIK value, THE Patient_Service SHALL validate that the NIK is exactly 16 numeric digits before persisting.

### Requirement 4: Search Indexes for Patient Lookup

**User Story:** As a laboratory staff member, I want to quickly find patients by MRN, NIK, or name, so that I can process orders without delay.

#### Acceptance Criteria

1. THE Patient_Repository SHALL maintain a unique B-tree index on the `mrn` column for exact-match lookups.
2. THE Patient_Repository SHALL maintain a unique B-tree index on the `nik` column for exact-match lookups.
3. THE Patient_Repository SHALL maintain an index on the `name` column to support case-insensitive partial-match searches.
4. WHEN a search query is submitted, THE Patient_Service SHALL use the indexed columns to filter results by MRN, NIK, or name within a single query.

### Requirement 5: Backward Compatibility with Existing Data

**User Story:** As a system administrator, I want existing patient records to remain intact and accessible after schema changes, so that no data is lost during migration.

#### Acceptance Criteria

1. WHEN a database migration is applied, THE Patient_Repository SHALL preserve all existing patient records with their current MRN and NIK values.
2. WHEN a database migration adds a unique constraint on a column that already has unique values, THE Patient_Repository SHALL apply the constraint without modifying existing data.
3. IF existing patient records contain NULL or empty NIK values, THEN THE Patient_Repository SHALL handle the migration gracefully without failing the constraint application.
4. THE Patient_Service SHALL continue to serve existing patient data through current API endpoints without requiring client changes.

### Requirement 6: API Contract Stability

**User Story:** As a front-end developer, I want the patient registration API to remain backward compatible, so that existing client integrations continue to work.

#### Acceptance Criteria

1. THE Patient_Service SHALL accept the existing `CreatePatientDto` fields without requiring new mandatory fields from the client.
2. THE Patient_Service SHALL exclude the `mrn` field from client input and generate it server-side.
3. WHEN a patient is successfully registered, THE Patient_Service SHALL return the complete patient object including the auto-generated MRN in the response body.
4. THE Patient_Service SHALL maintain the existing HTTP status codes: 201 for successful creation, 400 for validation errors, and 409 or 400 for duplicate NIK.
