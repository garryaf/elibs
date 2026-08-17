import {
  evaluateWestgardRules,
  QCResultData,
  WestgardResult,
} from './westgard.engine';

describe('evaluateWestgardRules', () => {
  const mean = 100;
  const sd = 5;

  function toResults(values: number[]): QCResultData[] {
    return values.map((value) => ({ value }));
  }

  describe('edge cases', () => {
    it('should return passed with no violations for empty results', () => {
      const result = evaluateWestgardRules([], mean, sd);
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should return passed with no violations when sd is 0', () => {
      const result = evaluateWestgardRules(toResults([100]), mean, 0);
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should return passed with no violations when all values are within ±1SD', () => {
      const values = [99, 100, 101, 102, 98, 100.5, 99.5, 101.5, 100, 99];
      const result = evaluateWestgardRules(toResults(values), mean, sd);
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('1-2s rule (warning)', () => {
    it('should detect a value exceeding mean + 2SD', () => {
      const values = [100, 111]; // 111 > 100 + 10 = 110
      const result = evaluateWestgardRules(toResults(values), mean, sd);

      const violation = result.violations.find((v) => v.rule === '1-2s');
      expect(violation).toBeDefined();
      expect(violation!.dataPoints).toContain(111);
    });

    it('should detect a value below mean - 2SD', () => {
      const values = [100, 89]; // 89 < 100 - 10 = 90
      const result = evaluateWestgardRules(toResults(values), mean, sd);

      const violation = result.violations.find((v) => v.rule === '1-2s');
      expect(violation).toBeDefined();
      expect(violation!.dataPoints).toContain(89);
    });

    it('should NOT cause failure (warning only)', () => {
      // Single point just beyond 2SD but within 3SD
      const values = [100, 111]; // > 2SD but < 3SD (115)
      const result = evaluateWestgardRules(toResults(values), mean, sd);
      expect(result.passed).toBe(true);
      expect(result.violations.some((v) => v.rule === '1-2s')).toBe(true);
    });
  });

  describe('1-3s rule (reject)', () => {
    it('should detect a value exceeding mean + 3SD', () => {
      const values = [100, 116]; // 116 > 100 + 15 = 115
      const result = evaluateWestgardRules(toResults(values), mean, sd);

      expect(result.passed).toBe(false);
      const violation = result.violations.find((v) => v.rule === '1-3s');
      expect(violation).toBeDefined();
      expect(violation!.dataPoints).toContain(116);
    });

    it('should detect a value below mean - 3SD', () => {
      const values = [100, 84]; // 84 < 100 - 15 = 85
      const result = evaluateWestgardRules(toResults(values), mean, sd);

      expect(result.passed).toBe(false);
      const violation = result.violations.find((v) => v.rule === '1-3s');
      expect(violation).toBeDefined();
      expect(violation!.dataPoints).toContain(84);
    });

    it('should not trigger for values within 3SD', () => {
      const values = [100, 114]; // 114 < 115 (within 3SD)
      const result = evaluateWestgardRules(toResults(values), mean, sd);

      const violation = result.violations.find((v) => v.rule === '1-3s');
      expect(violation).toBeUndefined();
    });
  });

  describe('2-2s rule (reject)', () => {
    it('should detect two consecutive values above mean + 2SD', () => {
      const values = [100, 111, 112]; // both > 110
      const result = evaluateWestgardRules(toResults(values), mean, sd);

      expect(result.passed).toBe(false);
      const violation = result.violations.find((v) => v.rule === '2-2s');
      expect(violation).toBeDefined();
      expect(violation!.dataPoints).toEqual([111, 112]);
    });

    it('should detect two consecutive values below mean - 2SD', () => {
      const values = [100, 89, 88]; // both < 90
      const result = evaluateWestgardRules(toResults(values), mean, sd);

      expect(result.passed).toBe(false);
      const violation = result.violations.find((v) => v.rule === '2-2s');
      expect(violation).toBeDefined();
      expect(violation!.dataPoints).toEqual([89, 88]);
    });

    it('should NOT trigger when consecutive values are on opposite sides', () => {
      const values = [111, 89]; // one above, one below — not same side
      const result = evaluateWestgardRules(toResults(values), mean, sd);

      const violation = result.violations.find((v) => v.rule === '2-2s');
      expect(violation).toBeUndefined();
    });

    it('should require exactly consecutive measurements', () => {
      // Non-consecutive beyond 2SD: [111, 100, 112]
      const values = [111, 100, 112];
      const result = evaluateWestgardRules(toResults(values), mean, sd);

      const violation = result.violations.find((v) => v.rule === '2-2s');
      expect(violation).toBeUndefined();
    });
  });

  describe('R-4s rule (reject)', () => {
    it('should detect consecutive measurements spanning > 4SD', () => {
      const values = [100, 111, 89]; // 111 > +2SD, 89 < -2SD
      const result = evaluateWestgardRules(toResults(values), mean, sd);

      expect(result.passed).toBe(false);
      const violation = result.violations.find((v) => v.rule === 'R-4s');
      expect(violation).toBeDefined();
      expect(violation!.dataPoints).toEqual([111, 89]);
    });

    it('should detect when first is below and second above', () => {
      const values = [89, 111]; // 89 < -2SD, 111 > +2SD
      const result = evaluateWestgardRules(toResults(values), mean, sd);

      expect(result.passed).toBe(false);
      const violation = result.violations.find((v) => v.rule === 'R-4s');
      expect(violation).toBeDefined();
      expect(violation!.dataPoints).toEqual([89, 111]);
    });

    it('should NOT trigger when both are on the same side', () => {
      const values = [111, 112]; // both above +2SD → triggers 2-2s, not R-4s
      const result = evaluateWestgardRules(toResults(values), mean, sd);

      const violation = result.violations.find((v) => v.rule === 'R-4s');
      expect(violation).toBeUndefined();
    });
  });

  describe('4-1s rule (reject)', () => {
    it('should detect four consecutive values above mean + 1SD', () => {
      const values = [106, 107, 108, 106]; // all > 105
      const result = evaluateWestgardRules(toResults(values), mean, sd);

      expect(result.passed).toBe(false);
      const violation = result.violations.find((v) => v.rule === '4-1s');
      expect(violation).toBeDefined();
      expect(violation!.dataPoints).toEqual([106, 107, 108, 106]);
    });

    it('should detect four consecutive values below mean - 1SD', () => {
      const values = [94, 93, 92, 94]; // all < 95
      const result = evaluateWestgardRules(toResults(values), mean, sd);

      expect(result.passed).toBe(false);
      const violation = result.violations.find((v) => v.rule === '4-1s');
      expect(violation).toBeDefined();
      expect(violation!.dataPoints).toEqual([94, 93, 92, 94]);
    });

    it('should NOT trigger with only three consecutive values beyond 1SD', () => {
      const values = [106, 107, 108]; // only 3
      const result = evaluateWestgardRules(toResults(values), mean, sd);

      const violation = result.violations.find((v) => v.rule === '4-1s');
      expect(violation).toBeUndefined();
    });

    it('should NOT trigger when values are within ±1SD', () => {
      const values = [101, 102, 103, 104]; // 104 < 105
      const result = evaluateWestgardRules(toResults(values), mean, sd);

      const violation = result.violations.find((v) => v.rule === '4-1s');
      expect(violation).toBeUndefined();
    });
  });

  describe('10x rule (reject)', () => {
    it('should detect ten consecutive values above the mean', () => {
      const values = [101, 102, 103, 101, 102, 101, 103, 102, 101, 102];
      const result = evaluateWestgardRules(toResults(values), mean, sd);

      expect(result.passed).toBe(false);
      const violation = result.violations.find((v) => v.rule === '10x');
      expect(violation).toBeDefined();
      expect(violation!.dataPoints).toHaveLength(10);
    });

    it('should detect ten consecutive values below the mean', () => {
      const values = [99, 98, 97, 99, 98, 99, 97, 98, 99, 98];
      const result = evaluateWestgardRules(toResults(values), mean, sd);

      expect(result.passed).toBe(false);
      const violation = result.violations.find((v) => v.rule === '10x');
      expect(violation).toBeDefined();
      expect(violation!.dataPoints).toHaveLength(10);
    });

    it('should NOT trigger with fewer than 10 results', () => {
      const values = [101, 102, 103, 101, 102, 101, 103, 102, 101]; // 9 values
      const result = evaluateWestgardRules(toResults(values), mean, sd);

      const violation = result.violations.find((v) => v.rule === '10x');
      expect(violation).toBeUndefined();
    });

    it('should NOT trigger when values alternate sides of mean', () => {
      const values = [101, 99, 101, 99, 101, 99, 101, 99, 101, 99];
      const result = evaluateWestgardRules(toResults(values), mean, sd);

      const violation = result.violations.find((v) => v.rule === '10x');
      expect(violation).toBeUndefined();
    });

    it('should treat values equal to the mean as NOT violating', () => {
      // Values equal to mean are not > mean and not < mean
      const values = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100];
      const result = evaluateWestgardRules(toResults(values), mean, sd);

      const violation = result.violations.find((v) => v.rule === '10x');
      expect(violation).toBeUndefined();
    });
  });

  describe('combined violations', () => {
    it('should report multiple violations simultaneously', () => {
      // A value of 116 triggers both 1-2s, 1-3s
      const values = [116];
      const result = evaluateWestgardRules(toResults(values), mean, sd);

      expect(result.passed).toBe(false);
      expect(result.violations.some((v) => v.rule === '1-2s')).toBe(true);
      expect(result.violations.some((v) => v.rule === '1-3s')).toBe(true);
    });

    it('should correctly identify a clean QC run', () => {
      // All values within ±1SD of mean
      const values = [100, 101, 99, 100.5, 99.5, 101, 100, 99, 101, 100];
      const result = evaluateWestgardRules(toResults(values), mean, sd);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });
});
