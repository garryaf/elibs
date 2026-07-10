/**
 * Interface contract for cross-module queries into Master Data.
 *
 * Consuming modules (laboratory/order, laboratory/payment, etc.) should
 * depend on this interface rather than accessing PrismaService directly
 * for master data lookups.
 */

export interface IMasterDataQueryService {
  findTestById(testId: string): Promise<TestMasterView | null>;
  findTestsByIds(testIds: string[]): Promise<TestMasterView[]>;
  findActiveTests(filters?: {
    categoryId?: string;
    isActive?: boolean;
  }): Promise<TestMasterView[]>;
  resolveTariff(
    testId: string,
    clinicId?: string,
    insuranceId?: string,
  ): Promise<TariffView | null>;
  findReferenceValues(testId: string): Promise<ReferenceValueView[]>;
  findInsuranceById(insuranceId: string): Promise<InsuranceView | null>;
  findActiveInsurances(): Promise<InsuranceView[]>;
}

export interface TestMasterView {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  unit: string | null;
  sampleType: string | null;
  price: number;
  requiresDoctorApproval: boolean;
  isActive: boolean;
}

export interface TariffView {
  id: string;
  testId: string;
  clinicId: string | null;
  insuranceId: string | null;
  price: number;
  discount: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}

export interface ReferenceValueView {
  id: string;
  testId: string;
  gender: string;
  minAge: number;
  maxAge: number;
  minRef: number;
  maxRef: number;
  criticalMin: number | null;
  criticalMax: number | null;
}

export interface InsuranceView {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

/**
 * Injection token for IMasterDataQueryService.
 * Use with @Inject(MASTER_DATA_QUERY_SERVICE) in consuming modules.
 */
export const MASTER_DATA_QUERY_SERVICE = 'MASTER_DATA_QUERY_SERVICE';
