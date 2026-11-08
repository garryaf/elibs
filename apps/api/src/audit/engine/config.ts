import * as path from 'path';
import * as fs from 'fs';
import { AuditConfig } from './interfaces';

/**
 * Loads and resolves the audit configuration for the given project root.
 *
 * Only validates that projectRoot exists. Other paths are checked lazily during audit.
 *
 * @param projectRoot - Absolute path to the project workspace root
 * @returns Resolved AuditConfig with all paths absolute
 * @throws Error if projectRoot does not exist or is not a directory
 */
export function loadAuditConfig(projectRoot: string): AuditConfig {
  // Validate projectRoot exists and is a directory
  if (!fs.existsSync(projectRoot)) {
    throw new Error(`Project root does not exist: ${projectRoot}`);
  }

  const stats = fs.statSync(projectRoot);
  if (!stats.isDirectory()) {
    throw new Error(`Project root is not a directory: ${projectRoot}`);
  }

  return {
    projectRoot: path.resolve(projectRoot),
    apiSourcePath: path.resolve(projectRoot, 'apps/api/src'),
    webSourcePath: path.resolve(projectRoot, 'apps/web/src'),
    prismaSchemaPath: path.resolve(
      projectRoot,
      'apps/api/prisma/schema.prisma',
    ),
    auditStatusPath: path.resolve(projectRoot, 'docs/AUDIT_STATUS.md'),
    functionalSpecPath: path.resolve(
      projectRoot,
      'Functiona spec/FS-TS-ELIS-LAB-NCR0001_Laboratory-Management.md',
    ),
    outputPath: path.resolve(projectRoot, 'docs/audit-report.md'),
    maxDashboardPages: 50,
  };
}
