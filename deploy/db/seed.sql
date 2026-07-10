--
-- PostgreSQL database dump
--

\restrict DsMSQJ6k6vaYaSbkcjdmu6X61x94lsEeA4oD8L5GOCkPD7hEwzKRlGfejPoWvir

-- Dumped from database version 15.18
-- Dumped by pg_dump version 15.18

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.visits DROP CONSTRAINT IF EXISTS "visits_patientId_fkey";
ALTER TABLE IF EXISTS ONLY public.visits DROP CONSTRAINT IF EXISTS "visits_insuranceId_fkey";
ALTER TABLE IF EXISTS ONLY public.visits DROP CONSTRAINT IF EXISTS "visits_doctorId_fkey";
ALTER TABLE IF EXISTS ONLY public.visits DROP CONSTRAINT IF EXISTS "visits_clinicId_fkey";
ALTER TABLE IF EXISTS ONLY public.test_masters DROP CONSTRAINT IF EXISTS "test_masters_categoryId_fkey";
ALTER TABLE IF EXISTS ONLY public.tariffs DROP CONSTRAINT IF EXISTS "tariffs_testId_fkey";
ALTER TABLE IF EXISTS ONLY public.tariffs DROP CONSTRAINT IF EXISTS "tariffs_insuranceId_fkey";
ALTER TABLE IF EXISTS ONLY public.tariffs DROP CONSTRAINT IF EXISTS "tariffs_clinicId_fkey";
ALTER TABLE IF EXISTS ONLY public.reference_values DROP CONSTRAINT IF EXISTS "reference_values_testId_fkey";
ALTER TABLE IF EXISTS ONLY public.payment_components DROP CONSTRAINT IF EXISTS "payment_components_orderId_fkey";
ALTER TABLE IF EXISTS ONLY public.payment_components DROP CONSTRAINT IF EXISTS "payment_components_insuranceId_fkey";
ALTER TABLE IF EXISTS ONLY public.patients DROP CONSTRAINT IF EXISTS "patients_provinsiId_fkey";
ALTER TABLE IF EXISTS ONLY public.patients DROP CONSTRAINT IF EXISTS "patients_kelurahanDesaId_fkey";
ALTER TABLE IF EXISTS ONLY public.patients DROP CONSTRAINT IF EXISTS "patients_kecamatanId_fkey";
ALTER TABLE IF EXISTS ONLY public.patients DROP CONSTRAINT IF EXISTS "patients_kabupatenKotaId_fkey";
ALTER TABLE IF EXISTS ONLY public.patients DROP CONSTRAINT IF EXISTS "patients_insuranceId_fkey";
ALTER TABLE IF EXISTS ONLY public.patient_insurances DROP CONSTRAINT IF EXISTS "patient_insurances_patientId_fkey";
ALTER TABLE IF EXISTS ONLY public.patient_insurances DROP CONSTRAINT IF EXISTS "patient_insurances_insuranceId_fkey";
ALTER TABLE IF EXISTS ONLY public.panel_tests DROP CONSTRAINT IF EXISTS "panel_tests_testId_fkey";
ALTER TABLE IF EXISTS ONLY public.panel_tests DROP CONSTRAINT IF EXISTS "panel_tests_panelId_fkey";
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS "orders_visitId_fkey";
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS "orders_patientId_fkey";
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS "orders_insuranceId_fkey";
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS "orders_doctorId_fkey";
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS "orders_clinicId_fkey";
ALTER TABLE IF EXISTS ONLY public.order_insurances DROP CONSTRAINT IF EXISTS "order_insurances_orderId_fkey";
ALTER TABLE IF EXISTS ONLY public.order_insurances DROP CONSTRAINT IF EXISTS "order_insurances_insuranceId_fkey";
ALTER TABLE IF EXISTS ONLY public.order_details DROP CONSTRAINT IF EXISTS "order_details_testId_fkey";
ALTER TABLE IF EXISTS ONLY public.order_details DROP CONSTRAINT IF EXISTS "order_details_orderId_fkey";
ALTER TABLE IF EXISTS ONLY public.notification_logs DROP CONSTRAINT IF EXISTS "notification_logs_orderId_fkey";
ALTER TABLE IF EXISTS ONLY public.kelurahan_desa DROP CONSTRAINT IF EXISTS "kelurahan_desa_kecamatanId_fkey";
ALTER TABLE IF EXISTS ONLY public.kecamatan DROP CONSTRAINT IF EXISTS "kecamatan_kabupatenKotaId_fkey";
ALTER TABLE IF EXISTS ONLY public.kabupaten_kota DROP CONSTRAINT IF EXISTS "kabupaten_kota_provinsiId_fkey";
ALTER TABLE IF EXISTS ONLY public.calibrations DROP CONSTRAINT IF EXISTS "calibrations_equipmentId_fkey";
ALTER TABLE IF EXISTS ONLY public.bpjs_order_details DROP CONSTRAINT IF EXISTS "bpjs_order_details_orderId_fkey";
DROP INDEX IF EXISTS public."visits_visitNumber_key";
DROP INDEX IF EXISTS public.visits_status_idx;
DROP INDEX IF EXISTS public."visits_patientId_registrationDate_idx";
DROP INDEX IF EXISTS public.users_email_key;
DROP INDEX IF EXISTS public.test_masters_code_key;
DROP INDEX IF EXISTS public.test_categories_name_key;
DROP INDEX IF EXISTS public."tariffs_testId_clinicId_insuranceId_key";
DROP INDEX IF EXISTS public.sample_types_code_key;
DROP INDEX IF EXISTS public."reference_values_testId_gender_minAge_maxAge_key";
DROP INDEX IF EXISTS public.reagents_code_key;
DROP INDEX IF EXISTS public."payment_components_orderId_idx";
DROP INDEX IF EXISTS public.patients_nik_key;
DROP INDEX IF EXISTS public.patients_mrn_key;
DROP INDEX IF EXISTS public."patient_insurances_patientId_priority_idx";
DROP INDEX IF EXISTS public."patient_insurances_patientId_insuranceId_key";
DROP INDEX IF EXISTS public.panels_name_key;
DROP INDEX IF EXISTS public."panel_tests_panelId_testId_key";
DROP INDEX IF EXISTS public.orders_status_idx;
DROP INDEX IF EXISTS public."orders_patientId_idx";
DROP INDEX IF EXISTS public."orders_orderNumber_key";
DROP INDEX IF EXISTS public."orders_createdAt_idx";
DROP INDEX IF EXISTS public."order_insurances_orderId_idx";
DROP INDEX IF EXISTS public."order_insurances_orderId_coverageType_key";
DROP INDEX IF EXISTS public."order_insurances_insuranceId_claimStatus_idx";
DROP INDEX IF EXISTS public."order_insurances_claimStatus_idx";
DROP INDEX IF EXISTS public."order_details_orderId_idx";
DROP INDEX IF EXISTS public."notification_logs_orderId_idx";
DROP INDEX IF EXISTS public.measurement_units_code_key;
DROP INDEX IF EXISTS public."kelurahan_desa_kecamatanId_idx";
DROP INDEX IF EXISTS public."kecamatan_kabupatenKotaId_idx";
DROP INDEX IF EXISTS public."kabupaten_kota_provinsiId_idx";
DROP INDEX IF EXISTS public.insurances_code_key;
DROP INDEX IF EXISTS public.equipments_code_key;
DROP INDEX IF EXISTS public.doctors_code_key;
DROP INDEX IF EXISTS public.clinics_code_key;
DROP INDEX IF EXISTS public."calibrations_equipmentId_idx";
DROP INDEX IF EXISTS public."bpjs_order_details_verificationStatus_idx";
DROP INDEX IF EXISTS public."bpjs_order_details_sepNumber_idx";
DROP INDEX IF EXISTS public."bpjs_order_details_orderId_key";
ALTER TABLE IF EXISTS ONLY public.visits DROP CONSTRAINT IF EXISTS visits_pkey;
ALTER TABLE IF EXISTS ONLY public.visit_sequences DROP CONSTRAINT IF EXISTS visit_sequences_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.test_masters DROP CONSTRAINT IF EXISTS test_masters_pkey;
ALTER TABLE IF EXISTS ONLY public.test_categories DROP CONSTRAINT IF EXISTS test_categories_pkey;
ALTER TABLE IF EXISTS ONLY public.tariffs DROP CONSTRAINT IF EXISTS tariffs_pkey;
ALTER TABLE IF EXISTS ONLY public.system_settings DROP CONSTRAINT IF EXISTS system_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.sample_types DROP CONSTRAINT IF EXISTS sample_types_pkey;
ALTER TABLE IF EXISTS ONLY public.reference_values DROP CONSTRAINT IF EXISTS reference_values_pkey;
ALTER TABLE IF EXISTS ONLY public.reagents DROP CONSTRAINT IF EXISTS reagents_pkey;
ALTER TABLE IF EXISTS ONLY public.provinsi DROP CONSTRAINT IF EXISTS provinsi_pkey;
ALTER TABLE IF EXISTS ONLY public.payment_components DROP CONSTRAINT IF EXISTS payment_components_pkey;
ALTER TABLE IF EXISTS ONLY public.patients DROP CONSTRAINT IF EXISTS patients_pkey;
ALTER TABLE IF EXISTS ONLY public.patient_insurances DROP CONSTRAINT IF EXISTS patient_insurances_pkey;
ALTER TABLE IF EXISTS ONLY public.panels DROP CONSTRAINT IF EXISTS panels_pkey;
ALTER TABLE IF EXISTS ONLY public.panel_tests DROP CONSTRAINT IF EXISTS panel_tests_pkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_pkey;
ALTER TABLE IF EXISTS ONLY public.order_insurances DROP CONSTRAINT IF EXISTS order_insurances_pkey;
ALTER TABLE IF EXISTS ONLY public.order_details DROP CONSTRAINT IF EXISTS order_details_pkey;
ALTER TABLE IF EXISTS ONLY public.notification_logs DROP CONSTRAINT IF EXISTS notification_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.mrn_sequences DROP CONSTRAINT IF EXISTS mrn_sequences_pkey;
ALTER TABLE IF EXISTS ONLY public.measurement_units DROP CONSTRAINT IF EXISTS measurement_units_pkey;
ALTER TABLE IF EXISTS ONLY public.kelurahan_desa DROP CONSTRAINT IF EXISTS kelurahan_desa_pkey;
ALTER TABLE IF EXISTS ONLY public.kecamatan DROP CONSTRAINT IF EXISTS kecamatan_pkey;
ALTER TABLE IF EXISTS ONLY public.kabupaten_kota DROP CONSTRAINT IF EXISTS kabupaten_kota_pkey;
ALTER TABLE IF EXISTS ONLY public.insurances DROP CONSTRAINT IF EXISTS insurances_pkey;
ALTER TABLE IF EXISTS ONLY public.equipments DROP CONSTRAINT IF EXISTS equipments_pkey;
ALTER TABLE IF EXISTS ONLY public.doctors DROP CONSTRAINT IF EXISTS doctors_pkey;
ALTER TABLE IF EXISTS ONLY public.clinics DROP CONSTRAINT IF EXISTS clinics_pkey;
ALTER TABLE IF EXISTS ONLY public.calibrations DROP CONSTRAINT IF EXISTS calibrations_pkey;
ALTER TABLE IF EXISTS ONLY public.bpjs_order_details DROP CONSTRAINT IF EXISTS bpjs_order_details_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_pkey;
ALTER TABLE IF EXISTS ONLY public._prisma_migrations DROP CONSTRAINT IF EXISTS _prisma_migrations_pkey;
DROP TABLE IF EXISTS public.visits;
DROP TABLE IF EXISTS public.visit_sequences;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.test_masters;
DROP TABLE IF EXISTS public.test_categories;
DROP TABLE IF EXISTS public.tariffs;
DROP TABLE IF EXISTS public.system_settings;
DROP TABLE IF EXISTS public.sample_types;
DROP TABLE IF EXISTS public.reference_values;
DROP TABLE IF EXISTS public.reagents;
DROP TABLE IF EXISTS public.provinsi;
DROP TABLE IF EXISTS public.payment_components;
DROP TABLE IF EXISTS public.patients;
DROP TABLE IF EXISTS public.patient_insurances;
DROP TABLE IF EXISTS public.panels;
DROP TABLE IF EXISTS public.panel_tests;
DROP TABLE IF EXISTS public.orders;
DROP TABLE IF EXISTS public.order_insurances;
DROP TABLE IF EXISTS public.order_details;
DROP TABLE IF EXISTS public.notification_logs;
DROP TABLE IF EXISTS public.mrn_sequences;
DROP TABLE IF EXISTS public.measurement_units;
DROP TABLE IF EXISTS public.kelurahan_desa;
DROP TABLE IF EXISTS public.kecamatan;
DROP TABLE IF EXISTS public.kabupaten_kota;
DROP TABLE IF EXISTS public.insurances;
DROP TABLE IF EXISTS public.equipments;
DROP TABLE IF EXISTS public.doctors;
DROP TABLE IF EXISTS public.clinics;
DROP TABLE IF EXISTS public.calibrations;
DROP TABLE IF EXISTS public.bpjs_order_details;
DROP TABLE IF EXISTS public.audit_logs;
DROP TABLE IF EXISTS public._prisma_migrations;
DROP TYPE IF EXISTS public."VisitStatus";
DROP TYPE IF EXISTS public."SampleCondition";
DROP TYPE IF EXISTS public."Role";
DROP TYPE IF EXISTS public."PaymentMethod";
DROP TYPE IF EXISTS public."OrderStatus";
DROP TYPE IF EXISTS public."OrderDetailStatus";
DROP TYPE IF EXISTS public."NotificationType";
DROP TYPE IF EXISTS public."NotificationStatus";
DROP TYPE IF EXISTS public."InsuranceType";
DROP TYPE IF EXISTS public."Gender";
DROP TYPE IF EXISTS public."Flag";
DROP TYPE IF EXISTS public."CoverageType";
DROP TYPE IF EXISTS public."ClaimStatus";
DROP TYPE IF EXISTS public."BpjsVerificationStatus";
DROP EXTENSION IF EXISTS pg_trgm;
-- *not* dropping schema, since initdb creates it
--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: BpjsVerificationStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."BpjsVerificationStatus" AS ENUM (
    'PENDING',
    'VERIFIED',
    'FAILED',
    'EXPIRED'
);


ALTER TYPE public."BpjsVerificationStatus" OWNER TO postgres;

--
-- Name: ClaimStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ClaimStatus" AS ENUM (
    'PENDING',
    'SUBMITTED',
    'UNDER_REVIEW',
    'APPROVED',
    'PARTIALLY_APPROVED',
    'REJECTED',
    'PAID'
);


ALTER TYPE public."ClaimStatus" OWNER TO postgres;

--
-- Name: CoverageType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CoverageType" AS ENUM (
    'PRIMARY',
    'SECONDARY'
);


ALTER TYPE public."CoverageType" OWNER TO postgres;

--
-- Name: Flag; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Flag" AS ENUM (
    'NORMAL',
    'LOW',
    'HIGH',
    'CRITICAL'
);


ALTER TYPE public."Flag" OWNER TO postgres;

--
-- Name: Gender; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Gender" AS ENUM (
    'MALE',
    'FEMALE'
);


ALTER TYPE public."Gender" OWNER TO postgres;

--
-- Name: InsuranceType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."InsuranceType" AS ENUM (
    'BPJS',
    'SWASTA',
    'CORPORATE'
);


ALTER TYPE public."InsuranceType" OWNER TO postgres;

--
-- Name: NotificationStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."NotificationStatus" AS ENUM (
    'PENDING',
    'SENT',
    'FAILED'
);


ALTER TYPE public."NotificationStatus" OWNER TO postgres;

--
-- Name: NotificationType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."NotificationType" AS ENUM (
    'EMAIL',
    'WHATSAPP'
);


ALTER TYPE public."NotificationType" OWNER TO postgres;

--
-- Name: OrderDetailStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."OrderDetailStatus" AS ENUM (
    'PENDING',
    'RESULT_ENTERED',
    'VERIFIED',
    'APPROVED'
);


ALTER TYPE public."OrderDetailStatus" OWNER TO postgres;

--
-- Name: OrderStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."OrderStatus" AS ENUM (
    'PENDING_PAYMENT',
    'PAID',
    'SAMPLE_COLLECTED',
    'IN_ANALYSIS',
    'VERIFIED',
    'APPROVED',
    'NOTIFIED',
    'CANCELLED',
    'PAYMENT_OVERDUE'
);


ALTER TYPE public."OrderStatus" OWNER TO postgres;

--
-- Name: PaymentMethod; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PaymentMethod" AS ENUM (
    'CASH',
    'TRANSFER',
    'INSURANCE',
    'BPJS',
    'EDC',
    'INSURANCE_CASH_FALLBACK',
    'CORPORATE_DEFERRED'
);


ALTER TYPE public."PaymentMethod" OWNER TO postgres;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Role" AS ENUM (
    'SUPER_ADMIN',
    'OWNER',
    'MANAGER',
    'KASIR',
    'ADMIN',
    'SAMPLING',
    'ANALIS',
    'DOKTER',
    'CS',
    'MARKETING',
    'KLINIK_PARTNER'
);


ALTER TYPE public."Role" OWNER TO postgres;

--
-- Name: SampleCondition; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SampleCondition" AS ENUM (
    'ACCEPTABLE',
    'LIPEMIC',
    'HEMOLYTIC',
    'CLOTTED',
    'INSUFFICIENT'
);


ALTER TYPE public."SampleCondition" OWNER TO postgres;

--
-- Name: VisitStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."VisitStatus" AS ENUM (
    'REGISTERED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public."VisitStatus" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id uuid NOT NULL,
    "userId" uuid NOT NULL,
    action text NOT NULL,
    "entityName" text NOT NULL,
    "entityId" uuid NOT NULL,
    "oldValues" jsonb,
    "newValues" jsonb,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "ipAddress" text
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: bpjs_order_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bpjs_order_details (
    id uuid NOT NULL,
    "orderId" uuid NOT NULL,
    "sepNumber" character varying(19),
    "verificationStatus" public."BpjsVerificationStatus" DEFAULT 'PENDING'::public."BpjsVerificationStatus" NOT NULL,
    "referringFacilityCode" character varying(20),
    "referringFacilityName" text,
    "classLevel" integer,
    "diagnosisCode" character varying(10),
    "diagnosisName" text,
    "procedureCode" character varying(10),
    "guaranteeLetterNo" character varying(50),
    "coB" numeric(12,2),
    "verifiedAt" timestamp(3) without time zone,
    "verifiedBy" uuid,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.bpjs_order_details OWNER TO postgres;

--
-- Name: calibrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.calibrations (
    id uuid NOT NULL,
    "equipmentId" uuid NOT NULL,
    "calibratedAt" timestamp(3) without time zone NOT NULL,
    "calibratedBy" text NOT NULL,
    result text NOT NULL,
    notes text,
    "nextDueDate" timestamp(3) without time zone,
    "certificateNo" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.calibrations OWNER TO postgres;

--
-- Name: clinics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clinics (
    id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    address text,
    phone text,
    email text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public.clinics OWNER TO postgres;

--
-- Name: doctors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.doctors (
    id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    specialization text,
    phone text,
    email text,
    "licenseNumber" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public.doctors OWNER TO postgres;

--
-- Name: equipments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.equipments (
    id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    manufacturer text,
    model text,
    "serialNumber" text,
    location text,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "lastCalibration" timestamp(3) without time zone,
    "nextCalibration" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public.equipments OWNER TO postgres;

--
-- Name: insurances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.insurances (
    id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    phone text,
    email text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    type public."InsuranceType"
);


ALTER TABLE public.insurances OWNER TO postgres;

--
-- Name: kabupaten_kota; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.kabupaten_kota (
    id text NOT NULL,
    "provinsiId" text NOT NULL,
    name text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.kabupaten_kota OWNER TO postgres;

--
-- Name: kecamatan; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.kecamatan (
    id text NOT NULL,
    "kabupatenKotaId" text NOT NULL,
    name text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.kecamatan OWNER TO postgres;

--
-- Name: kelurahan_desa; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.kelurahan_desa (
    id text NOT NULL,
    "kecamatanId" text NOT NULL,
    name text NOT NULL,
    "postalCode" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.kelurahan_desa OWNER TO postgres;

--
-- Name: measurement_units; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.measurement_units (
    id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.measurement_units OWNER TO postgres;

--
-- Name: mrn_sequences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mrn_sequences (
    id text NOT NULL,
    "lastValue" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.mrn_sequences OWNER TO postgres;

--
-- Name: notification_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_logs (
    id uuid NOT NULL,
    "orderId" uuid NOT NULL,
    type public."NotificationType" NOT NULL,
    recipient text NOT NULL,
    status public."NotificationStatus" DEFAULT 'PENDING'::public."NotificationStatus" NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    "lastError" text,
    "sentAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.notification_logs OWNER TO postgres;

--
-- Name: order_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_details (
    id uuid NOT NULL,
    "orderId" uuid NOT NULL,
    "testId" uuid NOT NULL,
    status public."OrderDetailStatus" DEFAULT 'PENDING'::public."OrderDetailStatus" NOT NULL,
    "resultValue" text,
    flag public."Flag",
    comment text,
    price numeric(12,2) NOT NULL,
    discount numeric(5,2) DEFAULT 0 NOT NULL,
    "finalPrice" numeric(12,2) NOT NULL,
    "resultEnteredAt" timestamp(3) without time zone,
    "resultEnteredBy" uuid,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.order_details OWNER TO postgres;

--
-- Name: order_insurances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_insurances (
    id uuid NOT NULL,
    "orderId" uuid NOT NULL,
    "insuranceId" uuid NOT NULL,
    "coverageType" public."CoverageType" DEFAULT 'PRIMARY'::public."CoverageType" NOT NULL,
    "claimReference" character varying(50),
    "claimStatus" public."ClaimStatus" DEFAULT 'PENDING'::public."ClaimStatus" NOT NULL,
    "coveredAmount" numeric(12,2),
    "copayAmount" numeric(12,2),
    "memberNumber" character varying(50),
    "submittedAt" timestamp(3) without time zone,
    "approvedAt" timestamp(3) without time zone,
    "rejectedAt" timestamp(3) without time zone,
    "rejectionReason" text,
    "paidAt" timestamp(3) without time zone,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.order_insurances OWNER TO postgres;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id uuid NOT NULL,
    "orderNumber" text NOT NULL,
    "patientId" uuid NOT NULL,
    "clinicId" uuid,
    "doctorId" uuid,
    "insuranceId" uuid,
    status public."OrderStatus" DEFAULT 'PENDING_PAYMENT'::public."OrderStatus" NOT NULL,
    "totalAmount" numeric(12,2) NOT NULL,
    "paymentMethod" public."PaymentMethod",
    "amountPaid" numeric(12,2),
    "paidAt" timestamp(3) without time zone,
    barcode text,
    "barcodeImage" text,
    "sampleCollectedAt" timestamp(3) without time zone,
    "sampleCollectedBy" uuid,
    "sampleCondition" public."SampleCondition",
    "rejectionReason" text,
    "verifiedAt" timestamp(3) without time zone,
    "verifiedBy" uuid,
    "verificationNotes" text,
    "approvedAt" timestamp(3) without time zone,
    "approvedBy" uuid,
    interpretation text,
    "rejectedReason" text,
    "cancelledAt" timestamp(3) without time zone,
    "cancelledBy" uuid,
    "cancelReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "visitId" uuid NOT NULL
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: panel_tests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.panel_tests (
    id uuid NOT NULL,
    "panelId" uuid NOT NULL,
    "testId" uuid NOT NULL
);


ALTER TABLE public.panel_tests OWNER TO postgres;

--
-- Name: panels; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.panels (
    id uuid NOT NULL,
    name text NOT NULL,
    description text,
    price numeric(12,2) NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public.panels OWNER TO postgres;

--
-- Name: patient_insurances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.patient_insurances (
    id uuid NOT NULL,
    "patientId" uuid NOT NULL,
    "insuranceId" uuid NOT NULL,
    "memberNumber" character varying(50),
    "policyNumber" character varying(50),
    priority integer DEFAULT 1 NOT NULL,
    type public."InsuranceType",
    "bpjsClassLevel" integer,
    "validFrom" date,
    "validUntil" date,
    "isActive" boolean DEFAULT true NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.patient_insurances OWNER TO postgres;

--
-- Name: patients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.patients (
    id uuid NOT NULL,
    mrn text NOT NULL,
    nik text NOT NULL,
    name text NOT NULL,
    "dateOfBirth" date NOT NULL,
    gender public."Gender" NOT NULL,
    phone text,
    address text,
    email text,
    "consentDigitalNotification" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "bloodType" text,
    city text,
    district text,
    "emergencyContact" text,
    "emergencyPhone" text,
    "insuranceId" uuid,
    "postalCode" text,
    province text,
    village text,
    "kabupatenKotaId" text,
    "kecamatanId" text,
    "kelurahanDesaId" text,
    "provinsiId" text
);


ALTER TABLE public.patients OWNER TO postgres;

--
-- Name: payment_components; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_components (
    id uuid NOT NULL,
    "orderId" uuid NOT NULL,
    "paymentMethod" public."PaymentMethod" NOT NULL,
    amount numeric(12,2) NOT NULL,
    "insuranceId" uuid,
    reference character varying(100),
    notes text,
    "paidAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.payment_components OWNER TO postgres;

--
-- Name: provinsi; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.provinsi (
    id text NOT NULL,
    name text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.provinsi OWNER TO postgres;

--
-- Name: reagents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reagents (
    id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    manufacturer text,
    "lotNumber" text,
    "expiryDate" timestamp(3) without time zone,
    quantity integer DEFAULT 0 NOT NULL,
    unit text,
    "storageTemp" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public.reagents OWNER TO postgres;

--
-- Name: reference_values; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reference_values (
    id uuid NOT NULL,
    "testId" uuid NOT NULL,
    gender public."Gender" NOT NULL,
    "minAge" integer DEFAULT 0 NOT NULL,
    "maxAge" integer DEFAULT 150 NOT NULL,
    "minRef" numeric(10,4) NOT NULL,
    "maxRef" numeric(10,4) NOT NULL,
    "criticalMin" numeric(10,4),
    "criticalMax" numeric(10,4),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.reference_values OWNER TO postgres;

--
-- Name: sample_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sample_types (
    id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    container text,
    instructions text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public.sample_types OWNER TO postgres;

--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_settings (
    key text NOT NULL,
    value text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.system_settings OWNER TO postgres;

--
-- Name: tariffs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tariffs (
    id uuid NOT NULL,
    "testId" uuid NOT NULL,
    "clinicId" uuid,
    "insuranceId" uuid,
    price numeric(12,2) NOT NULL,
    discount numeric(5,2) DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.tariffs OWNER TO postgres;

--
-- Name: test_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.test_categories (
    id uuid NOT NULL,
    name text NOT NULL,
    description text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public.test_categories OWNER TO postgres;

--
-- Name: test_masters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.test_masters (
    id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "categoryId" uuid NOT NULL,
    unit text,
    method text,
    "sampleType" text,
    price numeric(12,2) NOT NULL,
    "requiresDoctorApproval" boolean DEFAULT true NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public.test_masters OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    role public."Role" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    name text
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: visit_sequences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.visit_sequences (
    id text NOT NULL,
    "lastValue" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.visit_sequences OWNER TO postgres;

--
-- Name: visits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.visits (
    id uuid NOT NULL,
    "visitNumber" character varying(50) NOT NULL,
    status public."VisitStatus" DEFAULT 'REGISTERED'::public."VisitStatus" NOT NULL,
    "registrationDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "patientId" uuid NOT NULL,
    "doctorId" uuid,
    "clinicId" uuid,
    "paymentMethod" public."PaymentMethod" NOT NULL,
    "insuranceId" uuid,
    "bpjsNumber" character varying(20),
    "cancelledAt" timestamp(3) without time zone,
    "cancelReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.visits OWNER TO postgres;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
6badbf53-c5dc-4381-aec4-744552436453	fe2327e19d4306aad5802e07d9c0be66a4882f89a96885b33bf3b738657f7940	2026-07-09 15:06:53.175553+00	20260706174300_add_laboratory_models	\N	\N	2026-07-09 15:06:52.984244+00	1
f3421c18-f2c2-4f9b-9508-6cd4736d97d4	b30d35ffdf5ab04efc737c5a2e6363cb81930dd6993a40c34bea53ed363cfbbd	2026-07-09 15:06:53.281649+00	20260707074526_add_master_data_models	\N	\N	2026-07-09 15:06:53.177793+00	1
14aa5c66-67f8-4abe-b9b3-14a6de677c73	ac5eaa30f7d439ecdf443be083c0146300ead6c4b8fb1b36e7e3b33ad0c5e140	2026-07-10 02:52:33.76332+00	20260710025233_add_payment_component	\N	\N	2026-07-10 02:52:33.736127+00	1
ef1290b6-e917-402b-9346-82e311b7c381	693bc7ecf85fb5e120d59e3f0872622621db6139c4c4c1c758a4a41cec790573	2026-07-09 15:06:53.35865+00	20260707134150_add_region_master_data	\N	\N	2026-07-09 15:06:53.288204+00	1
091943cb-d0cb-44ec-9b04-63dd5cece61e	ebf45d44aec32fa6a631b28c62699f5bb31858aecd3a3d4875a042319f330ca8	2026-07-09 15:06:53.373413+00	20260707201615_add_name_to_users	\N	\N	2026-07-09 15:06:53.36723+00	1
38423fda-f53c-400d-b0e0-f25cb3c46692	87b2226712431e6223d0f7a5d829f80f72220527703ab29a9fbeee12b5734583	2026-07-09 15:06:53.400121+00	20260708073020_add_system_settings	\N	\N	2026-07-09 15:06:53.376784+00	1
35c2da90-dcba-4fda-bb3a-7e9d77cf7f29	904f509abfafaa8b9899cd988c1c94b2a718a4e76c133a8e71fa45c60b200f24	2026-07-10 03:10:41.948555+00	20260710031024_add_payment_overdue_status	\N	\N	2026-07-10 03:10:41.93997+00	1
bf6076c8-af59-41b6-8b88-82f2d67c5f2e	04e9c3de84c6731210182b2e0fd022566339b34b8bb17287f7304d2eab8036d2	2026-07-09 15:06:53.43956+00	20260709061944_add_visit_management	\N	\N	2026-07-09 15:06:53.402333+00	1
73e6377d-8b87-494e-a18c-195d17a7954b	057a75a20b40f58b8541baeb7dfabf818b893abbbf8ddb2d8cc3599d826e960d	2026-07-09 15:06:53.464855+00	20260709100000_add_patient_name_search_index	\N	\N	2026-07-09 15:06:53.442284+00	1
e81c82c2-5dfe-48a0-b695-f6224824b268	8da89a69092fbb7baaa2c37f773dd85e956346e7432c2ba4a916d241d648901f	2026-07-09 15:07:10.235073+00	20260709150654_add_insurance_type_enum	\N	\N	2026-07-09 15:07:10.221631+00	1
ddb96db3-65fb-4dd5-9c58-1459ef0d3b32	842257ef5797b4201905f67dff01fd34e667d6f8e3fc9ee8f2634f4b7824e8d2	2026-07-09 22:03:27.978424+00	20260709220327_extend_payment_method_enum	\N	\N	2026-07-09 22:03:27.971048+00	1
8e342e6b-ae44-4fa0-8307-1e9d5203b70c	bd649df33b231b7d90547ba9886fa0e721312194851f6ea1d774ffe1ece9cd2a	2026-07-09 22:37:09.923945+00	20260709223709_add_patient_insurance_junction	\N	\N	2026-07-09 22:37:09.876053+00	1
4c345ea0-ca19-4a0c-be7d-b46193ba8226	63cbadfce1a3cd06223907696f8392f5608eb36292205bf32f27b673299f5bab	2026-07-09 23:13:59.988013+00	20260709231359_add_order_insurance_junction	\N	\N	2026-07-09 23:13:59.940276+00	1
f0c8f8ce-30e6-404b-a8ae-c5c508699d79	49f3f301957022f475855b2aef9ddf5b78fe6d6d3143f041fd4d65ca0b720b35	2026-07-10 02:23:10.889425+00	20260710000903_make_visit_id_required	\N	\N	2026-07-10 02:23:10.870404+00	1
02cd8ae3-ef12-4a52-816d-25628700a54c	6459f6876fe14e30858d6b9ff1b54429db66a651914eebaf1b2b584807213bbf	2026-07-10 02:23:12.017005+00	20260710022311_add_bpjs_order_detail	\N	\N	2026-07-10 02:23:11.989835+00	1
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, "userId", action, "entityName", "entityId", "oldValues", "newValues", "timestamp", "ipAddress") FROM stdin;
\.


--
-- Data for Name: bpjs_order_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bpjs_order_details (id, "orderId", "sepNumber", "verificationStatus", "referringFacilityCode", "referringFacilityName", "classLevel", "diagnosisCode", "diagnosisName", "procedureCode", "guaranteeLetterNo", "coB", "verifiedAt", "verifiedBy", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: calibrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.calibrations (id, "equipmentId", "calibratedAt", "calibratedBy", result, notes, "nextDueDate", "certificateNo", "createdAt") FROM stdin;
\.


--
-- Data for Name: clinics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clinics (id, code, name, address, phone, email, "isActive", "createdAt", "updatedAt", "deletedAt") FROM stdin;
d651e630-2439-4b6c-94db-aa8817dc46dc	CLN-001	Klinik Utama Sehat	Jl. Sudirman No. 10	02112345001	\N	t	2026-07-10 03:21:29.359	2026-07-10 03:24:09.305	\N
1cece9a8-2dfb-4975-821f-8d6b0ba1f0a5	CLN-002	Klinik Pratama Harapan	Jl. Gatot Subroto No. 5	02112345002	\N	t	2026-07-10 03:21:29.366	2026-07-10 03:24:09.311	\N
088b37a0-b012-421f-9210-a876d3092343	CLN-003	RS Mitra Medika	Jl. TB Simatupang No. 8	02112345003	\N	t	2026-07-10 03:21:29.369	2026-07-10 03:24:09.316	\N
8e49504b-e0fc-41cf-9b61-61e1fbe79a88	CLN-004	Klinik Kasih Ibu	Jl. Raya Bogor No. 15	02112345004	\N	t	2026-07-10 03:21:29.372	2026-07-10 03:24:09.32	\N
\.


--
-- Data for Name: doctors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.doctors (id, code, name, specialization, phone, email, "licenseNumber", "isActive", "createdAt", "updatedAt", "deletedAt") FROM stdin;
76b4d797-e241-44a7-9ec3-67b3c8a7c160	DR-001	Dr. Ahmad Fauzi	Sp.PK (Patologi Klinik)	08123456001	\N	\N	t	2026-07-10 03:21:29.319	2026-07-10 03:24:09.26	\N
c3c9229f-fb14-4496-abc8-95ca44451735	DR-002	Dr. Siti Rahmawati	Sp.PK (Patologi Klinik)	08123456002	\N	\N	t	2026-07-10 03:21:29.342	2026-07-10 03:24:09.284	\N
df6d62fb-91d1-49a6-b24e-a3678d032496	DR-003	Dr. Budi Santoso	Sp.PA (Patologi Anatomi)	08123456003	\N	\N	t	2026-07-10 03:21:29.349	2026-07-10 03:24:09.29	\N
753d21e9-9e2a-444e-95ef-5d6e0c42e683	DR-004	Dr. Dewi Lestari	Sp.PK (Patologi Klinik)	08123456004	\N	\N	t	2026-07-10 03:21:29.353	2026-07-10 03:24:09.294	\N
a884d204-bb8b-43e9-bbc5-a260073b0c41	DR-005	Dr. Andi Wijaya	Sp.An (Anestesi)	08123456005	\N	\N	t	2026-07-10 03:21:29.356	2026-07-10 03:24:09.3	\N
\.


--
-- Data for Name: equipments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.equipments (id, code, name, manufacturer, model, "serialNumber", location, status, "lastCalibration", "nextCalibration", "isActive", "createdAt", "updatedAt", "deletedAt") FROM stdin;
\.


--
-- Data for Name: insurances; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.insurances (id, code, name, phone, email, "isActive", "createdAt", "updatedAt", "deletedAt", type) FROM stdin;
90f3efc5-c655-4179-a17a-ff41338e7fbd	INS-001	BPJS Kesehatan	1500400	bpjs@bpjs-kesehatan.go.id	t	2026-07-10 03:21:29.375	2026-07-10 03:24:09.325	\N	BPJS
c4e0671a-9107-4ce4-b22b-5535b714dd3d	INS-002	Prudential Indonesia	02115008081	cs@prudential.co.id	t	2026-07-10 03:21:29.381	2026-07-10 03:24:09.334	\N	SWASTA
220c88da-c6b9-42df-a931-383e6ccf7e4c	INS-003	Allianz Life	02126506060	info@allianz.co.id	t	2026-07-10 03:21:29.385	2026-07-10 03:24:09.34	\N	SWASTA
83c34ebb-1b29-4bc0-a8b6-777aefe00e53	INS-004	Astra Insurance	02157999888	corporate@astra.co.id	t	2026-07-10 03:21:29.388	2026-07-10 03:24:09.344	\N	CORPORATE
5c2d27b6-c498-432d-8860-9b5d54130ae8	INS-005	Mandiri Inhealth	02152905555	info@mandiri-inhealth.co.id	t	2026-07-10 03:21:29.392	2026-07-10 03:24:09.348	\N	SWASTA
\.


--
-- Data for Name: kabupaten_kota; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.kabupaten_kota (id, "provinsiId", name, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: kecamatan; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.kecamatan (id, "kabupatenKotaId", name, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: kelurahan_desa; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.kelurahan_desa (id, "kecamatanId", name, "postalCode", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: measurement_units; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.measurement_units (id, code, name, description, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: mrn_sequences; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mrn_sequences (id, "lastValue") FROM stdin;
\.


--
-- Data for Name: notification_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notification_logs (id, "orderId", type, recipient, status, attempts, "lastError", "sentAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: order_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_details (id, "orderId", "testId", status, "resultValue", flag, comment, price, discount, "finalPrice", "resultEnteredAt", "resultEnteredBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: order_insurances; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_insurances (id, "orderId", "insuranceId", "coverageType", "claimReference", "claimStatus", "coveredAmount", "copayAmount", "memberNumber", "submittedAt", "approvedAt", "rejectedAt", "rejectionReason", "paidAt", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, "orderNumber", "patientId", "clinicId", "doctorId", "insuranceId", status, "totalAmount", "paymentMethod", "amountPaid", "paidAt", barcode, "barcodeImage", "sampleCollectedAt", "sampleCollectedBy", "sampleCondition", "rejectionReason", "verifiedAt", "verifiedBy", "verificationNotes", "approvedAt", "approvedBy", interpretation, "rejectedReason", "cancelledAt", "cancelledBy", "cancelReason", "createdAt", "updatedAt", "visitId") FROM stdin;
\.


--
-- Data for Name: panel_tests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.panel_tests (id, "panelId", "testId") FROM stdin;
\.


--
-- Data for Name: panels; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.panels (id, name, description, price, "isActive", "createdAt", "updatedAt", "deletedAt") FROM stdin;
\.


--
-- Data for Name: patient_insurances; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.patient_insurances (id, "patientId", "insuranceId", "memberNumber", "policyNumber", priority, type, "bpjsClassLevel", "validFrom", "validUntil", "isActive", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: patients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.patients (id, mrn, nik, name, "dateOfBirth", gender, phone, address, email, "consentDigitalNotification", "createdAt", "updatedAt", "deletedAt", "bloodType", city, district, "emergencyContact", "emergencyPhone", "insuranceId", "postalCode", province, village, "kabupatenKotaId", "kecamatanId", "kelurahanDesaId", "provinsiId") FROM stdin;
\.


--
-- Data for Name: payment_components; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_components (id, "orderId", "paymentMethod", amount, "insuranceId", reference, notes, "paidAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: provinsi; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.provinsi (id, name, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: reagents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reagents (id, code, name, manufacturer, "lotNumber", "expiryDate", quantity, unit, "storageTemp", "isActive", "createdAt", "updatedAt", "deletedAt") FROM stdin;
\.


--
-- Data for Name: reference_values; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reference_values (id, "testId", gender, "minAge", "maxAge", "minRef", "maxRef", "criticalMin", "criticalMax", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: sample_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sample_types (id, code, name, container, instructions, "isActive", "createdAt", "updatedAt", "deletedAt") FROM stdin;
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_settings (key, value, "updatedAt") FROM stdin;
\.


--
-- Data for Name: tariffs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tariffs (id, "testId", "clinicId", "insuranceId", price, discount, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: test_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.test_categories (id, name, description, "isActive", "createdAt", "updatedAt", "deletedAt") FROM stdin;
6af75434-f663-482a-bde3-8e07564913cd	Hematologi	Pemeriksaan darah lengkap	t	2026-07-09 15:07:28.962	2026-07-09 15:07:28.962	\N
9a6b01c7-56d9-4e47-ad9c-8dafd463d224	Kimia Klinik	Pemeriksaan kimia darah	t	2026-07-09 15:07:28.967	2026-07-09 15:07:28.967	\N
f694f3c7-83be-4ef8-93f6-bad5684685e6	Urinalisis	Pemeriksaan urin	t	2026-07-09 15:07:28.971	2026-07-09 15:07:28.971	\N
57a1f184-95f9-4f03-be20-cb39560ad62f	Serologi	Pemeriksaan serologi dan imunologi	t	2026-07-09 15:07:28.975	2026-07-09 15:07:28.975	\N
25b5fbb5-834e-461b-870d-2af22bcc370d	Mikrobiologi	Kultur dan sensitivitas	t	2026-07-09 15:07:28.98	2026-07-09 15:07:28.98	\N
\.


--
-- Data for Name: test_masters; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.test_masters (id, code, name, "categoryId", unit, method, "sampleType", price, "requiresDoctorApproval", "isActive", "createdAt", "updatedAt", "deletedAt") FROM stdin;
8c85a625-96cf-4cab-9ea6-b821db1c3cce	HEM-001	Hemoglobin (Hb)	6af75434-f663-482a-bde3-8e07564913cd	g/dL	\N	Darah EDTA	35000.00	f	t	2026-07-10 03:21:29.398	2026-07-10 03:24:09.358	\N
055a2b24-ea09-469d-8eec-062d91901cdd	HEM-002	Hematokrit (Ht)	6af75434-f663-482a-bde3-8e07564913cd	%	\N	Darah EDTA	35000.00	f	t	2026-07-10 03:21:29.407	2026-07-10 03:24:09.364	\N
b0207abc-e1ac-49de-b1e2-9cbf7509ddda	HEM-003	Leukosit (WBC)	6af75434-f663-482a-bde3-8e07564913cd	/µL	\N	Darah EDTA	40000.00	f	t	2026-07-10 03:21:29.41	2026-07-10 03:24:09.368	\N
f371abe6-4792-4f51-b46d-0d134d377c6d	HEM-004	Trombosit	6af75434-f663-482a-bde3-8e07564913cd	/µL	\N	Darah EDTA	40000.00	f	t	2026-07-10 03:21:29.412	2026-07-10 03:24:09.372	\N
e185d065-c3d4-469e-83b6-59a4bfce63f9	HEM-005	Darah Lengkap (CBC)	6af75434-f663-482a-bde3-8e07564913cd	-	\N	Darah EDTA	85000.00	f	t	2026-07-10 03:21:29.414	2026-07-10 03:24:09.376	\N
dff0db82-a526-4adb-97a3-910b2f1a4a65	KIM-001	Glukosa Puasa	9a6b01c7-56d9-4e47-ad9c-8dafd463d224	mg/dL	\N	Serum	45000.00	f	t	2026-07-10 03:21:29.416	2026-07-10 03:24:09.38	\N
e3de16f4-cbd2-4017-832e-3facdefe539d	KIM-002	Kolesterol Total	9a6b01c7-56d9-4e47-ad9c-8dafd463d224	mg/dL	\N	Serum	50000.00	f	t	2026-07-10 03:21:29.419	2026-07-10 03:24:09.385	\N
4a9bc983-023b-4d01-8893-8375689ae245	KIM-003	SGOT (AST)	9a6b01c7-56d9-4e47-ad9c-8dafd463d224	U/L	\N	Serum	55000.00	f	t	2026-07-10 03:21:29.423	2026-07-10 03:24:09.39	\N
0cbe64f9-a306-4434-abad-cd47d1ab538f	KIM-004	SGPT (ALT)	9a6b01c7-56d9-4e47-ad9c-8dafd463d224	U/L	\N	Serum	55000.00	f	t	2026-07-10 03:21:29.426	2026-07-10 03:24:09.399	\N
482a5739-5fdd-41da-97a5-dbd9df6c732f	KIM-005	Kreatinin	9a6b01c7-56d9-4e47-ad9c-8dafd463d224	mg/dL	\N	Serum	50000.00	f	t	2026-07-10 03:21:29.428	2026-07-10 03:24:09.402	\N
e118a4d6-243e-4928-9036-ea2d48c8a7a3	URI-001	Urinalisis Lengkap	f694f3c7-83be-4ef8-93f6-bad5684685e6	-	\N	Urin	50000.00	f	t	2026-07-10 03:21:29.431	2026-07-10 03:24:09.407	\N
84bbe9ba-35f4-4d0a-b3c7-184911cb24ce	URI-002	Protein Urin	f694f3c7-83be-4ef8-93f6-bad5684685e6	mg/dL	\N	Urin	30000.00	f	t	2026-07-10 03:21:29.434	2026-07-10 03:24:09.411	\N
ee4c63af-5d82-4b3f-97a1-7ca2e6c324a3	SER-001	HBsAg (Rapid)	57a1f184-95f9-4f03-be20-cb39560ad62f	-	\N	Serum	75000.00	f	t	2026-07-10 03:21:29.437	2026-07-10 03:24:09.414	\N
b6d81b55-6c6c-4605-b6cf-a31f9736da29	SER-002	Anti-HIV (Rapid)	57a1f184-95f9-4f03-be20-cb39560ad62f	-	\N	Serum	95000.00	f	t	2026-07-10 03:21:29.44	2026-07-10 03:24:09.416	\N
6995e67a-6be6-4110-a9bf-bc22df889588	SER-003	Widal	57a1f184-95f9-4f03-be20-cb39560ad62f	-	\N	Serum	65000.00	f	t	2026-07-10 03:21:29.442	2026-07-10 03:24:09.419	\N
94e583da-c9ec-4116-bb79-04f92139aaaa	MIK-001	Kultur Urin	25b5fbb5-834e-461b-870d-2af22bcc370d	-	\N	Urin	150000.00	t	t	2026-07-10 03:21:29.444	2026-07-10 03:24:09.422	\N
36d249e6-0c8f-4965-8146-26f4354bb3c5	MIK-002	BTA (Bakteri Tahan Asam)	25b5fbb5-834e-461b-870d-2af22bcc370d	-	\N	Sputum	85000.00	f	t	2026-07-10 03:21:29.447	2026-07-10 03:24:09.426	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, "passwordHash", role, "createdAt", "updatedAt", "deletedAt", name) FROM stdin;
3df6d18c-b9b8-4c0f-93af-9dec28876e14	admin@elis.local	$2b$12$qt75DvlxaQYT8sMCGN2X9e1tk9zFwF/cTSSET8n3ne8.a6Bcoxw1m	SUPER_ADMIN	2026-07-09 15:07:28.655	2026-07-09 15:07:28.655	\N	Administrator
dc141c8e-7912-4fb0-a731-b7a049aa0c9a	kasir@elis.local	$2b$12$4KOJnT2NS6Q.oSOwgGa3HecYZo1X2OYzGjOvvdsItUaQmLUmey3Ka	KASIR	2026-07-09 15:07:28.943	2026-07-09 15:07:28.943	\N	Kasir Demo
f5fa8776-8b14-455d-b95c-1413f5d1388a	analis@elis.local	$2b$12$4KOJnT2NS6Q.oSOwgGa3HecYZo1X2OYzGjOvvdsItUaQmLUmey3Ka	ANALIS	2026-07-09 15:07:28.947	2026-07-09 15:07:28.947	\N	Analis Demo
8693836e-f489-430e-aa6a-5df6e085ba0c	dokter@elis.local	$2b$12$4KOJnT2NS6Q.oSOwgGa3HecYZo1X2OYzGjOvvdsItUaQmLUmey3Ka	DOKTER	2026-07-09 15:07:28.951	2026-07-09 15:07:28.951	\N	dr. Demo
286a60de-0b45-4d3f-ab68-bc6bcb200827	sampling@elis.local	$2b$12$4KOJnT2NS6Q.oSOwgGa3HecYZo1X2OYzGjOvvdsItUaQmLUmey3Ka	SAMPLING	2026-07-09 15:07:28.955	2026-07-09 15:07:28.955	\N	Petugas Sampling
\.


--
-- Data for Name: visit_sequences; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.visit_sequences (id, "lastValue") FROM stdin;
\.


--
-- Data for Name: visits; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.visits (id, "visitNumber", status, "registrationDate", "patientId", "doctorId", "clinicId", "paymentMethod", "insuranceId", "bpjsNumber", "cancelledAt", "cancelReason", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: bpjs_order_details bpjs_order_details_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bpjs_order_details
    ADD CONSTRAINT bpjs_order_details_pkey PRIMARY KEY (id);


--
-- Name: calibrations calibrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calibrations
    ADD CONSTRAINT calibrations_pkey PRIMARY KEY (id);


--
-- Name: clinics clinics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinics
    ADD CONSTRAINT clinics_pkey PRIMARY KEY (id);


--
-- Name: doctors doctors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_pkey PRIMARY KEY (id);


--
-- Name: equipments equipments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipments
    ADD CONSTRAINT equipments_pkey PRIMARY KEY (id);


--
-- Name: insurances insurances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insurances
    ADD CONSTRAINT insurances_pkey PRIMARY KEY (id);


--
-- Name: kabupaten_kota kabupaten_kota_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kabupaten_kota
    ADD CONSTRAINT kabupaten_kota_pkey PRIMARY KEY (id);


--
-- Name: kecamatan kecamatan_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kecamatan
    ADD CONSTRAINT kecamatan_pkey PRIMARY KEY (id);


--
-- Name: kelurahan_desa kelurahan_desa_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kelurahan_desa
    ADD CONSTRAINT kelurahan_desa_pkey PRIMARY KEY (id);


--
-- Name: measurement_units measurement_units_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.measurement_units
    ADD CONSTRAINT measurement_units_pkey PRIMARY KEY (id);


--
-- Name: mrn_sequences mrn_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mrn_sequences
    ADD CONSTRAINT mrn_sequences_pkey PRIMARY KEY (id);


--
-- Name: notification_logs notification_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_pkey PRIMARY KEY (id);


--
-- Name: order_details order_details_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_details
    ADD CONSTRAINT order_details_pkey PRIMARY KEY (id);


--
-- Name: order_insurances order_insurances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_insurances
    ADD CONSTRAINT order_insurances_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: panel_tests panel_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.panel_tests
    ADD CONSTRAINT panel_tests_pkey PRIMARY KEY (id);


--
-- Name: panels panels_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.panels
    ADD CONSTRAINT panels_pkey PRIMARY KEY (id);


--
-- Name: patient_insurances patient_insurances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_insurances
    ADD CONSTRAINT patient_insurances_pkey PRIMARY KEY (id);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: payment_components payment_components_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_components
    ADD CONSTRAINT payment_components_pkey PRIMARY KEY (id);


--
-- Name: provinsi provinsi_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.provinsi
    ADD CONSTRAINT provinsi_pkey PRIMARY KEY (id);


--
-- Name: reagents reagents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reagents
    ADD CONSTRAINT reagents_pkey PRIMARY KEY (id);


--
-- Name: reference_values reference_values_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reference_values
    ADD CONSTRAINT reference_values_pkey PRIMARY KEY (id);


--
-- Name: sample_types sample_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_types
    ADD CONSTRAINT sample_types_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (key);


--
-- Name: tariffs tariffs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tariffs
    ADD CONSTRAINT tariffs_pkey PRIMARY KEY (id);


--
-- Name: test_categories test_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_categories
    ADD CONSTRAINT test_categories_pkey PRIMARY KEY (id);


--
-- Name: test_masters test_masters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_masters
    ADD CONSTRAINT test_masters_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: visit_sequences visit_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visit_sequences
    ADD CONSTRAINT visit_sequences_pkey PRIMARY KEY (id);


--
-- Name: visits visits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_pkey PRIMARY KEY (id);


--
-- Name: bpjs_order_details_orderId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "bpjs_order_details_orderId_key" ON public.bpjs_order_details USING btree ("orderId");


--
-- Name: bpjs_order_details_sepNumber_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "bpjs_order_details_sepNumber_idx" ON public.bpjs_order_details USING btree ("sepNumber");


--
-- Name: bpjs_order_details_verificationStatus_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "bpjs_order_details_verificationStatus_idx" ON public.bpjs_order_details USING btree ("verificationStatus");


--
-- Name: calibrations_equipmentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "calibrations_equipmentId_idx" ON public.calibrations USING btree ("equipmentId");


--
-- Name: clinics_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX clinics_code_key ON public.clinics USING btree (code);


--
-- Name: doctors_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX doctors_code_key ON public.doctors USING btree (code);


--
-- Name: equipments_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX equipments_code_key ON public.equipments USING btree (code);


--
-- Name: insurances_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX insurances_code_key ON public.insurances USING btree (code);


--
-- Name: kabupaten_kota_provinsiId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "kabupaten_kota_provinsiId_idx" ON public.kabupaten_kota USING btree ("provinsiId");


--
-- Name: kecamatan_kabupatenKotaId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "kecamatan_kabupatenKotaId_idx" ON public.kecamatan USING btree ("kabupatenKotaId");


--
-- Name: kelurahan_desa_kecamatanId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "kelurahan_desa_kecamatanId_idx" ON public.kelurahan_desa USING btree ("kecamatanId");


--
-- Name: measurement_units_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX measurement_units_code_key ON public.measurement_units USING btree (code);


--
-- Name: notification_logs_orderId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "notification_logs_orderId_idx" ON public.notification_logs USING btree ("orderId");


--
-- Name: order_details_orderId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "order_details_orderId_idx" ON public.order_details USING btree ("orderId");


--
-- Name: order_insurances_claimStatus_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "order_insurances_claimStatus_idx" ON public.order_insurances USING btree ("claimStatus");


--
-- Name: order_insurances_insuranceId_claimStatus_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "order_insurances_insuranceId_claimStatus_idx" ON public.order_insurances USING btree ("insuranceId", "claimStatus");


--
-- Name: order_insurances_orderId_coverageType_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "order_insurances_orderId_coverageType_key" ON public.order_insurances USING btree ("orderId", "coverageType");


--
-- Name: order_insurances_orderId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "order_insurances_orderId_idx" ON public.order_insurances USING btree ("orderId");


--
-- Name: orders_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "orders_createdAt_idx" ON public.orders USING btree ("createdAt");


--
-- Name: orders_orderNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "orders_orderNumber_key" ON public.orders USING btree ("orderNumber");


--
-- Name: orders_patientId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "orders_patientId_idx" ON public.orders USING btree ("patientId");


--
-- Name: orders_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX orders_status_idx ON public.orders USING btree (status);


--
-- Name: panel_tests_panelId_testId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "panel_tests_panelId_testId_key" ON public.panel_tests USING btree ("panelId", "testId");


--
-- Name: panels_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX panels_name_key ON public.panels USING btree (name);


--
-- Name: patient_insurances_patientId_insuranceId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "patient_insurances_patientId_insuranceId_key" ON public.patient_insurances USING btree ("patientId", "insuranceId");


--
-- Name: patient_insurances_patientId_priority_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "patient_insurances_patientId_priority_idx" ON public.patient_insurances USING btree ("patientId", priority);


--
-- Name: patients_mrn_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX patients_mrn_key ON public.patients USING btree (mrn);


--
-- Name: patients_nik_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX patients_nik_key ON public.patients USING btree (nik);


--
-- Name: payment_components_orderId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "payment_components_orderId_idx" ON public.payment_components USING btree ("orderId");


--
-- Name: reagents_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX reagents_code_key ON public.reagents USING btree (code);


--
-- Name: reference_values_testId_gender_minAge_maxAge_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "reference_values_testId_gender_minAge_maxAge_key" ON public.reference_values USING btree ("testId", gender, "minAge", "maxAge");


--
-- Name: sample_types_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX sample_types_code_key ON public.sample_types USING btree (code);


--
-- Name: tariffs_testId_clinicId_insuranceId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "tariffs_testId_clinicId_insuranceId_key" ON public.tariffs USING btree ("testId", "clinicId", "insuranceId");


--
-- Name: test_categories_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX test_categories_name_key ON public.test_categories USING btree (name);


--
-- Name: test_masters_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX test_masters_code_key ON public.test_masters USING btree (code);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: visits_patientId_registrationDate_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "visits_patientId_registrationDate_idx" ON public.visits USING btree ("patientId", "registrationDate");


--
-- Name: visits_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX visits_status_idx ON public.visits USING btree (status);


--
-- Name: visits_visitNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "visits_visitNumber_key" ON public.visits USING btree ("visitNumber");


--
-- Name: bpjs_order_details bpjs_order_details_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bpjs_order_details
    ADD CONSTRAINT "bpjs_order_details_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: calibrations calibrations_equipmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calibrations
    ADD CONSTRAINT "calibrations_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES public.equipments(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: kabupaten_kota kabupaten_kota_provinsiId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kabupaten_kota
    ADD CONSTRAINT "kabupaten_kota_provinsiId_fkey" FOREIGN KEY ("provinsiId") REFERENCES public.provinsi(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: kecamatan kecamatan_kabupatenKotaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kecamatan
    ADD CONSTRAINT "kecamatan_kabupatenKotaId_fkey" FOREIGN KEY ("kabupatenKotaId") REFERENCES public.kabupaten_kota(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: kelurahan_desa kelurahan_desa_kecamatanId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kelurahan_desa
    ADD CONSTRAINT "kelurahan_desa_kecamatanId_fkey" FOREIGN KEY ("kecamatanId") REFERENCES public.kecamatan(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: notification_logs notification_logs_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT "notification_logs_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: order_details order_details_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_details
    ADD CONSTRAINT "order_details_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: order_details order_details_testId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_details
    ADD CONSTRAINT "order_details_testId_fkey" FOREIGN KEY ("testId") REFERENCES public.test_masters(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: order_insurances order_insurances_insuranceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_insurances
    ADD CONSTRAINT "order_insurances_insuranceId_fkey" FOREIGN KEY ("insuranceId") REFERENCES public.insurances(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: order_insurances order_insurances_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_insurances
    ADD CONSTRAINT "order_insurances_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: orders orders_clinicId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "orders_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES public.clinics(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: orders orders_doctorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "orders_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES public.doctors(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: orders orders_insuranceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "orders_insuranceId_fkey" FOREIGN KEY ("insuranceId") REFERENCES public.insurances(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: orders orders_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "orders_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public.patients(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: orders orders_visitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "orders_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES public.visits(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: panel_tests panel_tests_panelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.panel_tests
    ADD CONSTRAINT "panel_tests_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES public.panels(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: panel_tests panel_tests_testId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.panel_tests
    ADD CONSTRAINT "panel_tests_testId_fkey" FOREIGN KEY ("testId") REFERENCES public.test_masters(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: patient_insurances patient_insurances_insuranceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_insurances
    ADD CONSTRAINT "patient_insurances_insuranceId_fkey" FOREIGN KEY ("insuranceId") REFERENCES public.insurances(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: patient_insurances patient_insurances_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_insurances
    ADD CONSTRAINT "patient_insurances_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public.patients(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: patients patients_insuranceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT "patients_insuranceId_fkey" FOREIGN KEY ("insuranceId") REFERENCES public.insurances(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: patients patients_kabupatenKotaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT "patients_kabupatenKotaId_fkey" FOREIGN KEY ("kabupatenKotaId") REFERENCES public.kabupaten_kota(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: patients patients_kecamatanId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT "patients_kecamatanId_fkey" FOREIGN KEY ("kecamatanId") REFERENCES public.kecamatan(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: patients patients_kelurahanDesaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT "patients_kelurahanDesaId_fkey" FOREIGN KEY ("kelurahanDesaId") REFERENCES public.kelurahan_desa(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: patients patients_provinsiId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT "patients_provinsiId_fkey" FOREIGN KEY ("provinsiId") REFERENCES public.provinsi(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payment_components payment_components_insuranceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_components
    ADD CONSTRAINT "payment_components_insuranceId_fkey" FOREIGN KEY ("insuranceId") REFERENCES public.insurances(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payment_components payment_components_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_components
    ADD CONSTRAINT "payment_components_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: reference_values reference_values_testId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reference_values
    ADD CONSTRAINT "reference_values_testId_fkey" FOREIGN KEY ("testId") REFERENCES public.test_masters(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: tariffs tariffs_clinicId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tariffs
    ADD CONSTRAINT "tariffs_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES public.clinics(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tariffs tariffs_insuranceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tariffs
    ADD CONSTRAINT "tariffs_insuranceId_fkey" FOREIGN KEY ("insuranceId") REFERENCES public.insurances(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tariffs tariffs_testId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tariffs
    ADD CONSTRAINT "tariffs_testId_fkey" FOREIGN KEY ("testId") REFERENCES public.test_masters(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: test_masters test_masters_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_masters
    ADD CONSTRAINT "test_masters_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.test_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: visits visits_clinicId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT "visits_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES public.clinics(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: visits visits_doctorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT "visits_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES public.doctors(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: visits visits_insuranceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT "visits_insuranceId_fkey" FOREIGN KEY ("insuranceId") REFERENCES public.insurances(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: visits visits_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT "visits_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public.patients(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict DsMSQJ6k6vaYaSbkcjdmu6X61x94lsEeA4oD8L5GOCkPD7hEwzKRlGfejPoWvir

