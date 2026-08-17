import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { loadAuditConfig } from '../config';

describe('loadAuditConfig', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-config-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should return a valid AuditConfig when projectRoot exists', () => {
    const config = loadAuditConfig(tmpDir);

    expect(config.projectRoot).toBe(path.resolve(tmpDir));
    expect(config.apiSourcePath).toBe(path.resolve(tmpDir, 'apps/api/src'));
    expect(config.webSourcePath).toBe(path.resolve(tmpDir, 'apps/web/src'));
    expect(config.prismaSchemaPath).toBe(path.resolve(tmpDir, 'apps/api/prisma/schema.prisma'));
    expect(config.auditStatusPath).toBe(path.resolve(tmpDir, 'docs/AUDIT_STATUS.md'));
    expect(config.functionalSpecPath).toBe(
      path.resolve(tmpDir, 'Functiona spec/FS-TS-ELIS-LAB-NCR0001_Laboratory-Management.md'),
    );
    expect(config.outputPath).toBe(path.resolve(tmpDir, 'docs/audit-report.md'));
    expect(config.maxDashboardPages).toBe(50);
  });

  it('should throw when projectRoot does not exist', () => {
    const nonExistent = path.join(tmpDir, 'does-not-exist');

    expect(() => loadAuditConfig(nonExistent)).toThrow(
      `Project root does not exist: ${nonExistent}`,
    );
  });

  it('should throw when projectRoot is a file, not a directory', () => {
    const filePath = path.join(tmpDir, 'somefile.txt');
    fs.writeFileSync(filePath, 'content');

    expect(() => loadAuditConfig(filePath)).toThrow(
      `Project root is not a directory: ${filePath}`,
    );
  });

  it('should resolve relative projectRoot to absolute path', () => {
    // Use the actual project root with a relative path component
    const relativish = path.join(tmpDir, '.', '.');
    const config = loadAuditConfig(relativish);

    expect(path.isAbsolute(config.projectRoot)).toBe(true);
    expect(path.isAbsolute(config.apiSourcePath)).toBe(true);
    expect(path.isAbsolute(config.webSourcePath)).toBe(true);
    expect(path.isAbsolute(config.prismaSchemaPath)).toBe(true);
    expect(path.isAbsolute(config.auditStatusPath)).toBe(true);
    expect(path.isAbsolute(config.functionalSpecPath)).toBe(true);
    expect(path.isAbsolute(config.outputPath)).toBe(true);
  });

  it('should NOT validate that sub-paths exist (lazy checking)', () => {
    // tmpDir exists but has no subdirectories — config should still load fine
    const config = loadAuditConfig(tmpDir);

    expect(config.apiSourcePath).toContain('apps/api/src');
    // No error should be thrown even though apps/api/src doesn't exist inside tmpDir
  });

  it('should set default maxDashboardPages to 50', () => {
    const config = loadAuditConfig(tmpDir);
    expect(config.maxDashboardPages).toBe(50);
  });

  it('should set default outputPath to docs/audit-report.md', () => {
    const config = loadAuditConfig(tmpDir);
    expect(config.outputPath).toBe(path.resolve(tmpDir, 'docs/audit-report.md'));
  });
});
