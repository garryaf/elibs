import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { GeneralSettingsDto, FacilityType } from '../settings.controller';

/**
 * Unit tests for GeneralSettingsDto validation (T-20).
 * Ensures class-validator decorators correctly validate input.
 */
describe('GeneralSettingsDto validation', () => {
  function createDto(overrides: Partial<GeneralSettingsDto> = {}): GeneralSettingsDto {
    const base: Partial<GeneralSettingsDto> = {
      facilityName: 'RS Mitra Keluarga Depok',
      ...overrides,
    };
    return plainToInstance(GeneralSettingsDto, base);
  }

  // ─── Required Fields ──────────────────────────────────────────────────────

  describe('facilityName (required)', () => {
    it('should pass with a valid facility name', async () => {
      const dto = createDto({ facilityName: 'Lab Prodia Utama' });
      const errors = await validate(dto);
      const nameErrors = errors.filter((e) => e.property === 'facilityName');
      expect(nameErrors).toHaveLength(0);
    });

    it('should fail when facilityName is empty', async () => {
      const dto = createDto({ facilityName: '' });
      const errors = await validate(dto);
      const nameErrors = errors.filter((e) => e.property === 'facilityName');
      expect(nameErrors.length).toBeGreaterThan(0);
    });

    it('should fail when facilityName exceeds 255 chars', async () => {
      const dto = createDto({ facilityName: 'A'.repeat(256) });
      const errors = await validate(dto);
      const nameErrors = errors.filter((e) => e.property === 'facilityName');
      expect(nameErrors.length).toBeGreaterThan(0);
    });
  });

  // ─── Enum Fields ──────────────────────────────────────────────────────────

  describe('facilityType (enum)', () => {
    it('should pass with HOSPITAL', async () => {
      const dto = createDto({ facilityType: FacilityType.HOSPITAL });
      const errors = await validate(dto);
      const typeErrors = errors.filter((e) => e.property === 'facilityType');
      expect(typeErrors).toHaveLength(0);
    });

    it('should pass with CLINIC', async () => {
      const dto = createDto({ facilityType: FacilityType.CLINIC });
      const errors = await validate(dto);
      const typeErrors = errors.filter((e) => e.property === 'facilityType');
      expect(typeErrors).toHaveLength(0);
    });

    it('should pass with STANDALONE_LAB', async () => {
      const dto = createDto({ facilityType: FacilityType.STANDALONE_LAB });
      const errors = await validate(dto);
      const typeErrors = errors.filter((e) => e.property === 'facilityType');
      expect(typeErrors).toHaveLength(0);
    });

    it('should fail with an invalid enum value', async () => {
      const dto = createDto({ facilityType: 'PHARMACY' as any });
      const errors = await validate(dto);
      const typeErrors = errors.filter((e) => e.property === 'facilityType');
      expect(typeErrors.length).toBeGreaterThan(0);
    });
  });

  // ─── IsIn (dropdown) Fields ───────────────────────────────────────────────

  describe('dateFormat (IsIn)', () => {
    const validFormats = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY'];

    it.each(validFormats)('should pass with format "%s"', async (format) => {
      const dto = createDto({ dateFormat: format as any });
      const errors = await validate(dto);
      const formatErrors = errors.filter((e) => e.property === 'dateFormat');
      expect(formatErrors).toHaveLength(0);
    });

    it('should fail with an invalid date format', async () => {
      const dto = createDto({ dateFormat: 'YYYY/DD/MM' as any });
      const errors = await validate(dto);
      const formatErrors = errors.filter((e) => e.property === 'dateFormat');
      expect(formatErrors.length).toBeGreaterThan(0);
    });
  });

  describe('locale (IsIn)', () => {
    it('should pass with id-ID', async () => {
      const dto = createDto({ locale: 'id-ID' as any });
      const errors = await validate(dto);
      const localeErrors = errors.filter((e) => e.property === 'locale');
      expect(localeErrors).toHaveLength(0);
    });

    it('should pass with en-US', async () => {
      const dto = createDto({ locale: 'en-US' as any });
      const errors = await validate(dto);
      const localeErrors = errors.filter((e) => e.property === 'locale');
      expect(localeErrors).toHaveLength(0);
    });

    it('should fail with an unsupported locale', async () => {
      const dto = createDto({ locale: 'fr-FR' as any });
      const errors = await validate(dto);
      const localeErrors = errors.filter((e) => e.property === 'locale');
      expect(localeErrors.length).toBeGreaterThan(0);
    });
  });

  describe('orderNumberReset (IsIn)', () => {
    const validResets = ['DAILY', 'MONTHLY', 'YEARLY', 'NEVER'];

    it.each(validResets)('should pass with "%s"', async (value) => {
      const dto = createDto({ orderNumberReset: value as any });
      const errors = await validate(dto);
      const resetErrors = errors.filter((e) => e.property === 'orderNumberReset');
      expect(resetErrors).toHaveLength(0);
    });

    it('should fail with an invalid reset value', async () => {
      const dto = createDto({ orderNumberReset: 'WEEKLY' as any });
      const errors = await validate(dto);
      const resetErrors = errors.filter((e) => e.property === 'orderNumberReset');
      expect(resetErrors.length).toBeGreaterThan(0);
    });
  });

  describe('defaultSortOrder (IsIn)', () => {
    it('should pass with ASC', async () => {
      const dto = createDto({ defaultSortOrder: 'ASC' });
      const errors = await validate(dto);
      const sortErrors = errors.filter((e) => e.property === 'defaultSortOrder');
      expect(sortErrors).toHaveLength(0);
    });

    it('should pass with DESC', async () => {
      const dto = createDto({ defaultSortOrder: 'DESC' });
      const errors = await validate(dto);
      const sortErrors = errors.filter((e) => e.property === 'defaultSortOrder');
      expect(sortErrors).toHaveLength(0);
    });

    it('should fail with an invalid sort order', async () => {
      const dto = createDto({ defaultSortOrder: 'RANDOM' as any });
      const errors = await validate(dto);
      const sortErrors = errors.filter((e) => e.property === 'defaultSortOrder');
      expect(sortErrors.length).toBeGreaterThan(0);
    });
  });

  // ─── Number Fields (Min/Max) ──────────────────────────────────────────────

  describe('sessionTimeoutMinutes (number, min 5, max 1440)', () => {
    it('should pass with 60', async () => {
      const dto = createDto({ sessionTimeoutMinutes: 60 });
      const errors = await validate(dto);
      const timeoutErrors = errors.filter((e) => e.property === 'sessionTimeoutMinutes');
      expect(timeoutErrors).toHaveLength(0);
    });

    it('should fail when below minimum (4)', async () => {
      const dto = createDto({ sessionTimeoutMinutes: 4 });
      const errors = await validate(dto);
      const timeoutErrors = errors.filter((e) => e.property === 'sessionTimeoutMinutes');
      expect(timeoutErrors.length).toBeGreaterThan(0);
    });

    it('should fail when above maximum (1441)', async () => {
      const dto = createDto({ sessionTimeoutMinutes: 1441 });
      const errors = await validate(dto);
      const timeoutErrors = errors.filter((e) => e.property === 'sessionTimeoutMinutes');
      expect(timeoutErrors.length).toBeGreaterThan(0);
    });
  });

  describe('maxLoginAttempts (number, min 1, max 20)', () => {
    it('should pass with 5', async () => {
      const dto = createDto({ maxLoginAttempts: 5 });
      const errors = await validate(dto);
      const attemptErrors = errors.filter((e) => e.property === 'maxLoginAttempts');
      expect(attemptErrors).toHaveLength(0);
    });

    it('should fail with 0 (below min)', async () => {
      const dto = createDto({ maxLoginAttempts: 0 });
      const errors = await validate(dto);
      const attemptErrors = errors.filter((e) => e.property === 'maxLoginAttempts');
      expect(attemptErrors.length).toBeGreaterThan(0);
    });

    it('should fail with 21 (above max)', async () => {
      const dto = createDto({ maxLoginAttempts: 21 });
      const errors = await validate(dto);
      const attemptErrors = errors.filter((e) => e.property === 'maxLoginAttempts');
      expect(attemptErrors.length).toBeGreaterThan(0);
    });
  });

  describe('passwordMinLength (number, min 6, max 128)', () => {
    it('should pass with 8', async () => {
      const dto = createDto({ passwordMinLength: 8 });
      const errors = await validate(dto);
      const pwErrors = errors.filter((e) => e.property === 'passwordMinLength');
      expect(pwErrors).toHaveLength(0);
    });

    it('should fail with 5 (below min)', async () => {
      const dto = createDto({ passwordMinLength: 5 });
      const errors = await validate(dto);
      const pwErrors = errors.filter((e) => e.property === 'passwordMinLength');
      expect(pwErrors.length).toBeGreaterThan(0);
    });

    it('should fail with 129 (above max)', async () => {
      const dto = createDto({ passwordMinLength: 129 });
      const errors = await validate(dto);
      const pwErrors = errors.filter((e) => e.property === 'passwordMinLength');
      expect(pwErrors.length).toBeGreaterThan(0);
    });
  });

  describe('defaultPageSize (number, min 5, max 100)', () => {
    it('should pass with 20', async () => {
      const dto = createDto({ defaultPageSize: 20 });
      const errors = await validate(dto);
      const pageErrors = errors.filter((e) => e.property === 'defaultPageSize');
      expect(pageErrors).toHaveLength(0);
    });

    it('should fail with 4 (below min)', async () => {
      const dto = createDto({ defaultPageSize: 4 });
      const errors = await validate(dto);
      const pageErrors = errors.filter((e) => e.property === 'defaultPageSize');
      expect(pageErrors.length).toBeGreaterThan(0);
    });

    it('should fail with 101 (above max)', async () => {
      const dto = createDto({ defaultPageSize: 101 });
      const errors = await validate(dto);
      const pageErrors = errors.filter((e) => e.property === 'defaultPageSize');
      expect(pageErrors.length).toBeGreaterThan(0);
    });
  });

  // ─── Email Validation ─────────────────────────────────────────────────────

  describe('email (IsEmail, optional)', () => {
    it('should pass with a valid email', async () => {
      const dto = createDto({ email: 'lab@hospital.co.id' });
      const errors = await validate(dto);
      const emailErrors = errors.filter((e) => e.property === 'email');
      expect(emailErrors).toHaveLength(0);
    });

    it('should pass with empty string (optional)', async () => {
      const dto = createDto({ email: undefined });
      const errors = await validate(dto);
      const emailErrors = errors.filter((e) => e.property === 'email');
      expect(emailErrors).toHaveLength(0);
    });

    it('should fail with an invalid email format', async () => {
      const dto = createDto({ email: 'not-an-email' });
      const errors = await validate(dto);
      const emailErrors = errors.filter((e) => e.property === 'email');
      expect(emailErrors.length).toBeGreaterThan(0);
    });
  });

  // ─── Boolean Fields ───────────────────────────────────────────────────────

  describe('maintenanceMode (boolean)', () => {
    it('should pass with true', async () => {
      const dto = createDto({ maintenanceMode: true });
      const errors = await validate(dto);
      const modeErrors = errors.filter((e) => e.property === 'maintenanceMode');
      expect(modeErrors).toHaveLength(0);
    });

    it('should pass with false', async () => {
      const dto = createDto({ maintenanceMode: false });
      const errors = await validate(dto);
      const modeErrors = errors.filter((e) => e.property === 'maintenanceMode');
      expect(modeErrors).toHaveLength(0);
    });

    it('should fail with a non-boolean value', async () => {
      const dto = createDto({ maintenanceMode: 'yes' as any });
      const errors = await validate(dto);
      const modeErrors = errors.filter((e) => e.property === 'maintenanceMode');
      expect(modeErrors.length).toBeGreaterThan(0);
    });
  });

  // ─── String MaxLength ─────────────────────────────────────────────────────

  describe('string field maxLength enforcement', () => {
    it('should fail when address exceeds 500 chars', async () => {
      const dto = createDto({ address: 'A'.repeat(501) });
      const errors = await validate(dto);
      const addrErrors = errors.filter((e) => e.property === 'address');
      expect(addrErrors.length).toBeGreaterThan(0);
    });

    it('should fail when maintenanceMessage exceeds 500 chars', async () => {
      const dto = createDto({ maintenanceMessage: 'M'.repeat(501) });
      const errors = await validate(dto);
      const msgErrors = errors.filter((e) => e.property === 'maintenanceMessage');
      expect(msgErrors.length).toBeGreaterThan(0);
    });

    it('should fail when postalCode exceeds 10 chars', async () => {
      const dto = createDto({ postalCode: '12345678901' });
      const errors = await validate(dto);
      const postalErrors = errors.filter((e) => e.property === 'postalCode');
      expect(postalErrors.length).toBeGreaterThan(0);
    });
  });

  // ─── Full Valid DTO ───────────────────────────────────────────────────────

  describe('full valid DTO', () => {
    it('should pass validation with all fields populated correctly', async () => {
      const dto = createDto({
        facilityName: 'RS Mitra Keluarga Depok',
        facilityCode: '3674001',
        facilityType: FacilityType.HOSPITAL,
        address: 'Jl. Margonda Raya No. 1',
        city: 'Depok',
        province: 'Jawa Barat',
        postalCode: '16431',
        phone: '(021) 7721234',
        fax: '(021) 7721235',
        email: 'lab@mitrakeluarga.com',
        website: 'https://mitrakeluarga.com',
        npwp: '01.234.567.8-012.345',
        licenseNumber: '503/0123/DINKES/2024',
        accreditation: 'ISO 15189:2022',
        timezone: 'Asia/Jakarta',
        dateFormat: 'DD/MM/YYYY',
        currency: 'IDR',
        locale: 'id-ID',
        numberFormat: '1.000,50',
        orderNumberFormat: 'LAB-{YYYY}{MM}-{SEQ:5}',
        orderNumberReset: 'MONTHLY',
        visitNumberFormat: 'VIS-{YYYY}{MM}{DD}-{SEQ:4}',
        invoiceNumberFormat: 'INV/{YYYY}/{SEQ:4}',
        mrnFormat: 'MRN-{YYYY}-{SEQ:6}',
        operatingHoursStart: '07:00',
        operatingHoursEnd: '21:00',
        operatingDays: 'MON,TUE,WED,THU,FRI,SAT',
        is24h: false,
        sessionTimeoutMinutes: 60,
        autoLogoutIdleMinutes: 30,
        maxLoginAttempts: 5,
        lockoutDurationMinutes: 30,
        passwordMinLength: 8,
        requirePasswordChangeDays: 90,
        maintenanceMode: false,
        maintenanceMessage: '',
        backupScheduleCron: '0 2 * * *',
        defaultPageSize: 20,
        defaultSortOrder: 'DESC',
        dashboardDataRetentionDays: 30,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with only required field (facilityName)', async () => {
      const dto = createDto({ facilityName: 'Laboratorium Klinik' });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
