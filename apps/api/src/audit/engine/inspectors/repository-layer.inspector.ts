import * as fs from 'fs';
import * as path from 'path';
import fg from 'fast-glob';
import { InspectionTarget, LayerTrace } from '../interfaces';

/**
 * RepositoryLayerInspector — inspects the data access/repository layer.
 *
 * Scans for:
 * - Prisma client usage: `this.prisma.`, `prismaService.`
 * - Query methods: findUnique, findMany, findFirst, create, update, delete, upsert
 * - Transaction patterns: `$transaction`
 *
 * Returns a LayerTrace with layer='REPOSITORY' and status based on artifact coverage.
 */
export class RepositoryLayerInspector {
  /**
   * Inspects repository layer files matching the given inspection target patterns.
   *
   * @param target - InspectionTarget with glob patterns and required artifacts
   * @param projectRoot - Absolute path to the project workspace root
   * @returns LayerTrace for the REPOSITORY layer
   */
  async inspect(target: InspectionTarget, projectRoot: string): Promise<LayerTrace> {
    const matchedFiles: string[] = [];
    const issues: string[] = [];

    // Step 1: Resolve glob patterns to repository/service files
    for (const pattern of target.patterns) {
      try {
        const files = await fg(pattern.glob, {
          cwd: projectRoot,
          absolute: true,
          onlyFiles: true,
          suppressErrors: true,
        });
        matchedFiles.push(...files);
      } catch (err) {
        issues.push(`Glob error for "${pattern.glob}": ${(err as Error).message}`);
      }
    }

    if (matchedFiles.length === 0) {
      return {
        layer: 'REPOSITORY',
        status: 'ABSENT',
        evidence: 'No repository files matched inspection patterns',
        issues: issues.length > 0 ? issues : undefined,
      };
    }

    // Step 2: Check for repository-layer indicators in matched files
    let prismaUsageFound = false;
    let queryMethodsFound = false;
    let transactionFound = false;
    let firstMatchedFile: string | undefined;
    const lineReferences: number[] = [];
    const detectedQueryMethods = new Set<string>();

    // Repository-layer detection patterns
    const prismaUsagePattern = /this\.prisma\.|this\.prismaService\.|prismaService\./;
    const queryMethodPatterns: Record<string, RegExp> = {
      findUnique: /\.findUnique\s*\(/,
      findMany: /\.findMany\s*\(/,
      findFirst: /\.findFirst\s*\(/,
      create: /\.create\s*\(/,
      update: /\.update\s*\(/,
      delete: /\.delete\s*\(/,
      upsert: /\.upsert\s*\(/,
      createMany: /\.createMany\s*\(/,
      updateMany: /\.updateMany\s*\(/,
      deleteMany: /\.deleteMany\s*\(/,
      count: /\.count\s*\(/,
      aggregate: /\.aggregate\s*\(/,
    };
    const transactionPattern = /\.\$transaction\s*\(/;

    for (const filePath of matchedFiles) {
      const normalizedPath = path.resolve(filePath);

      try {
        if (!fs.existsSync(normalizedPath)) {
          continue;
        }

        const content = fs.readFileSync(normalizedPath, 'utf-8');

        // Check Prisma client usage
        const prismaMatch = prismaUsagePattern.exec(content);
        if (prismaMatch) {
          prismaUsageFound = true;
          if (!firstMatchedFile) {
            firstMatchedFile = normalizedPath;
          }
          const lineNumber = content.substring(0, prismaMatch.index).split('\n').length;
          lineReferences.push(lineNumber);
        }

        // Check query method patterns
        for (const [methodName, methodPattern] of Object.entries(queryMethodPatterns)) {
          if (methodPattern.test(content)) {
            queryMethodsFound = true;
            detectedQueryMethods.add(methodName);
          }
        }

        // Check transaction patterns
        if (transactionPattern.test(content)) {
          transactionFound = true;
        }
      } catch (err) {
        issues.push(`Error reading "${normalizedPath}": ${(err as Error).message}`);
      }
    }

    // Step 3: Also check required artifacts if specified
    let artifactsFound = 0;
    const totalArtifacts = target.requiredArtifacts.length;

    for (const artifact of target.requiredArtifacts) {
      let regex: RegExp;
      try {
        regex = new RegExp(artifact.searchPattern, 'm');
      } catch (err) {
        issues.push(`Invalid regex "${artifact.searchPattern}": ${(err as Error).message}`);
        continue;
      }

      for (const filePath of matchedFiles) {
        try {
          const content = fs.readFileSync(path.resolve(filePath), 'utf-8');
          if (regex.test(content)) {
            artifactsFound++;
            break;
          }
        } catch {
          // Already logged in previous scan
        }
      }
    }

    // Step 4: Determine status based on combined indicators
    const status = this.determineStatus(
      prismaUsageFound,
      queryMethodsFound,
      transactionFound,
      artifactsFound,
      totalArtifacts,
    );

    const evidenceParts: string[] = [];
    if (prismaUsageFound) evidenceParts.push('Prisma client usage detected');
    if (queryMethodsFound) {
      evidenceParts.push(
        `query methods: ${Array.from(detectedQueryMethods).join(', ')}`,
      );
    }
    if (transactionFound) evidenceParts.push('$transaction pattern found');
    if (totalArtifacts > 0) {
      evidenceParts.push(`${artifactsFound}/${totalArtifacts} required artifacts matched`);
    }

    return {
      layer: 'REPOSITORY',
      status,
      filePath: firstMatchedFile,
      lineReferences: lineReferences.length > 0 ? lineReferences : undefined,
      evidence: evidenceParts.length > 0
        ? evidenceParts.join('; ')
        : `Scanned ${matchedFiles.length} file(s), no repository indicators found`,
      issues: issues.length > 0 ? issues : undefined,
    };
  }

  /**
   * Determines the REPOSITORY layer status based on detected indicators.
   *
   * PRESENT: Prisma usage found AND query methods found AND all required artifacts
   * PARTIAL: Some indicators found but not all
   * ABSENT: No indicators found
   */
  private determineStatus(
    prismaUsageFound: boolean,
    queryMethodsFound: boolean,
    transactionFound: boolean,
    artifactsFound: number,
    totalArtifacts: number,
  ): 'PRESENT' | 'PARTIAL' | 'ABSENT' {
    const hasRepositoryIndicators = prismaUsageFound && queryMethodsFound;

    // If no required artifacts are specified, determine by indicators alone
    if (totalArtifacts === 0) {
      if (hasRepositoryIndicators) return 'PRESENT';
      if (prismaUsageFound || queryMethodsFound || transactionFound) return 'PARTIAL';
      return 'ABSENT';
    }

    // With required artifacts, both indicators and artifact coverage matter
    const allArtifactsFound = artifactsFound >= totalArtifacts;

    if (hasRepositoryIndicators && allArtifactsFound) return 'PRESENT';
    if (prismaUsageFound || queryMethodsFound || transactionFound || artifactsFound > 0) {
      return 'PARTIAL';
    }
    return 'ABSENT';
  }
}
