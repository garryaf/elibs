// Feature: lis-gap-remediation, Property 15: Audit log immutability
// The audit_logs table SHALL prevent UPDATE and DELETE operations via PostgreSQL rules.

import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

/**
 * **Validates: Requirements 15.1**
 *
 * Property 15: Audit log immutability — The audit_logs table SHALL prevent
 * UPDATE and DELETE operations via PostgreSQL rules.
 *
 * Since this is a database-level constraint enforced via PostgreSQL RULEs,
 * we verify the migration SQL contains the correct rule definitions that
 * prevent modification of audit_logs records.
 */
describe('Property 15: Audit log immutability', () => {
  const migrationPath = path.resolve(
    __dirname,
    '../../../../prisma/migrations/20260720150000_add_audit_log_immutability/migration.sql',
  );

  let migrationSql: string;

  beforeAll(() => {
    migrationSql = fs.readFileSync(migrationPath, 'utf-8');
  });

  it('migration file exists and is readable', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    expect(migrationSql.length).toBeGreaterThan(0);
  });

  it('defines a PostgreSQL RULE preventing UPDATE on audit_logs', () => {
    // The migration must contain a CREATE RULE for UPDATE on audit_logs
    expect(migrationSql).toMatch(
      /CREATE\s+RULE\s+\w+\s+AS\s+ON\s+UPDATE\s+TO\s+audit_logs/i,
    );
  });

  it('defines a PostgreSQL RULE preventing DELETE on audit_logs', () => {
    // The migration must contain a CREATE RULE for DELETE on audit_logs
    expect(migrationSql).toMatch(
      /CREATE\s+RULE\s+\w+\s+AS\s+ON\s+DELETE\s+TO\s+audit_logs/i,
    );
  });

  it('uses DO INSTEAD to block operations (not silently discard)', () => {
    // The rules use DO INSTEAD with a function that raises an exception
    // ensuring operations are actively rejected rather than silently ignored
    expect(migrationSql).toMatch(/DO\s+INSTEAD/i);
  });

  it('raises an exception for immutability violations', () => {
    // The helper function raises an EXCEPTION to actively reject modifications
    expect(migrationSql).toMatch(/RAISE\s+EXCEPTION/i);
    expect(migrationSql).toMatch(/immutable/i);
  });

  /**
   * Property-based test: For any arbitrary operation type (UPDATE or DELETE),
   * the migration SQL contains a corresponding RULE that prevents that operation
   * on the audit_logs table.
   */
  describe('immutability coverage for all modification operations', () => {
    it('for any modification operation (UPDATE, DELETE), a blocking rule exists', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('UPDATE', 'DELETE'),
          (operation: string) => {
            // The migration must contain a RULE for this operation on audit_logs
            const rulePattern = new RegExp(
              `CREATE\\s+RULE\\s+\\w+\\s+AS\\s+ON\\s+${operation}\\s+TO\\s+audit_logs`,
              'i',
            );
            expect(migrationSql).toMatch(rulePattern);

            // The rule must use DO INSTEAD (not DO ALSO) to completely replace the operation
            const doInsteadPattern = /DO\s+INSTEAD/i;
            expect(migrationSql).toMatch(doInsteadPattern);
          },
        ),
        { numRuns: 50 },
      );
    });

    it('INSERT is still allowed (no rule blocks INSERT)', () => {
      fc.assert(
        fc.property(fc.constant('INSERT'), (operation: string) => {
          // There must NOT be a rule preventing INSERT on audit_logs
          const insertRulePattern = new RegExp(
            `CREATE\\s+RULE\\s+\\w+\\s+AS\\s+ON\\s+${operation}\\s+TO\\s+audit_logs`,
            'i',
          );
          expect(migrationSql).not.toMatch(insertRulePattern);
        }),
        { numRuns: 10 },
      );
    });

    it('the immutability function handles both operation types', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('UPDATE', 'DELETE'),
          (operation: string) => {
            // The migration contains a function call that includes the operation type
            // fn_audit_logs_immutable_check('UPDATE') and fn_audit_logs_immutable_check('DELETE')
            const functionCallPattern = new RegExp(
              `fn_audit_logs_immutable_check\\s*\\(\\s*'${operation}'\\s*\\)`,
              'i',
            );
            expect(migrationSql).toMatch(functionCallPattern);
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
