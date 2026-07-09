# Implementation Plan: Patient MRN Identifier

## Overview

This plan implements patient identity integrity by adding a GIN trigram index for name search, enhancing the PatientService with explicit NIK format validation and Prisma P2002 error handling, and writing property-based tests using fast-check to verify correctness properties defined in the design.

## Tasks

- [x] 1. Add database migration for name search index
  - [x] 1.1 Create Prisma migration to add GIN trigram index on patient name
    - Create a new migration file that enables the `pg_trgm` extension and adds a GIN trigram index (`patients_name_trgm_idx`) on the `name` column of the `patients` table
    - Use `CREATE EXTENSION IF NOT EXISTS pg_trgm` and `CREATE INDEX IF NOT EXISTS`
    - Verify migration runs without errors against existing data
    - _Requirements: 4.3, 5.1, 5.2_

- [x] 2. Enhance PatientService with NIK validation and P2002 error handling
  - [x] 2.1 Add `validateNikFormat` method to PatientService
    - Implement a private `validateNikFormat(nik: string): void` method that throws `BadRequestException` with `errorCode: 'ERR_VALIDATION'` and message `'NIK must be exactly 16 digits'` when the input does not match `/^\d{16}$/`
    - Call this method at the beginning of the `register` method before the deduplication check
    - _Requirements: 3.4_

  - [x] 2.2 Add Prisma P2002 error handling to patient creation
    - Import `Prisma` from `@prisma/client` and `ConflictException`, `InternalServerErrorException` from `@nestjs/common`
    - Wrap `this.prisma.patient.create(...)` in a try-catch block
    - If `error.code === 'P2002'` and `target` includes `'nik'`, throw `ConflictException` with `errorCode: 'ERR_VALIDATION'` and message `'Patient with this NIK already exists'`
    - If `error.code === 'P2002'` and `target` includes `'mrn'`, throw `InternalServerErrorException` with `errorCode: 'ERR_INTERNAL'` and message `'MRN generation conflict, please retry'`
    - Re-throw any other errors unchanged
    - _Requirements: 2.2, 3.1, 6.4_

- [x] 3. Checkpoint - Verify core enhancements
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Write property-based tests for MRN generation
  - [x] 4.1 Write property test for MRN format correctness
    - **Property 1: MRN Format Correctness**
    - Create file `apps/api/src/laboratory/patient/tests/mrn-generator.service.property.spec.ts`
    - Use `fc.integer` for year (2020-2099), month (1-12), and sequence (1-9999) to generate arbitrary inputs
    - Mock PrismaService to return controlled sequence values
    - Assert every generated MRN matches `/^RM-\d{6}-\d{4}$/` with valid year/month components
    - Run with `{ numRuns: 100 }`
    - **Validates: Requirements 1.1**

  - [x] 4.2 Write property test for MRN sequence monotonicity
    - **Property 2: MRN Sequence Monotonicity**
    - In the same test file `mrn-generator.service.property.spec.ts`
    - Use `fc.integer` to generate N (2-20) sequential calls within a mocked single month
    - Mock PrismaService to simulate incrementing sequence values
    - Assert extracted sequence numbers are strictly monotonically increasing and all MRN values are distinct
    - Run with `{ numRuns: 100 }`
    - **Validates: Requirements 1.3, 2.1**

- [x] 5. Write property-based tests for PatientService
  - [x] 5.1 Write property test for NIK validation
    - **Property 3: NIK Validation**
    - Create or extend file `apps/api/src/laboratory/patient/tests/patient.service.property.spec.ts`
    - Use `fc.string()` and `fc.stringOf(fc.constantFrom('0','1',...,'9'))` to generate valid and invalid NIK values
    - Assert `validateNikFormat` accepts if and only if the input is exactly 16 numeric digits
    - Run with `{ numRuns: 100 }`
    - **Validates: Requirements 3.4**

  - [x] 5.2 Write property test for NIK deduplication
    - **Property 4: NIK Deduplication**
    - In the same test file `patient.service.property.spec.ts`
    - Use `fc.stringOf(fc.constantFrom('0','1',...,'9'), { minLength: 16, maxLength: 16 })` to generate valid NIKs
    - Mock PrismaService `findFirst` to return an existing patient or null based on a boolean arbitrary
    - Assert that when an existing patient is found, registration throws `BadRequestException` with `ERR_VALIDATION`; when null, the flow proceeds to MRN generation
    - Run with `{ numRuns: 100 }`
    - **Validates: Requirements 3.2, 3.3**

  - [x] 5.3 Write property test for search correctness
    - **Property 5: Search Correctness**
    - In the same test file `patient.service.property.spec.ts`
    - Use arbitraries to generate patient records with random names, MRNs, and NIKs
    - Use `fc.string()` to generate substrings of those fields as search queries
    - Mock PrismaService `findMany` with a where clause using `contains` + `mode: 'insensitive'`
    - Assert that if the query is a case-insensitive substring of name, MRN, or NIK, the patient appears in results
    - Run with `{ numRuns: 100 }`
    - **Validates: Requirements 4.4**

  - [x] 5.4 Write property test for registration response completeness
    - **Property 6: Registration Response Completeness**
    - In the same test file `patient.service.property.spec.ts`
    - Use arbitraries to generate valid `CreatePatientDto` inputs (valid NIK, name, dateOfBirth, gender)
    - Mock `mrnGenerator.generate()` to return a valid MRN and PrismaService to return the created patient
    - Assert the response contains all input fields with their submitted values plus a server-generated `mrn` field matching `RM-YYYYMM-XXXX`
    - Assert the input DTO does not contain an `mrn` field
    - Run with `{ numRuns: 100 }`
    - **Validates: Requirements 6.2, 6.3**

- [x] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The MrnGeneratorService already works correctly — no code changes needed for it
- The unique constraints on `mrn` and `nik` already exist in the schema; only the GIN trigram index on `name` is new
- Property tests use `fast-check` v4.8.0 already installed in the project
- The `CreatePatientDto` already has the `@Matches(/^\d{16}$/)` decorator — the service-level validation is a defense-in-depth layer

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["2.2"] },
    { "id": 2, "tasks": ["4.1", "4.2", "5.1"] },
    { "id": 3, "tasks": ["5.2", "5.3", "5.4"] }
  ]
}
```
