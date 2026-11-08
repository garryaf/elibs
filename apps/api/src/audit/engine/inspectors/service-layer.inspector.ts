import * as fs from 'fs';
import * as path from 'path';
import fg from 'fast-glob';
import { InspectionTarget, LayerTrace } from '../interfaces';

/**
 * ServiceLayerInspector — inspects the service/business logic layer.
 *
 * Scans for:
 * - @Injectable() decorator indicating NestJS service classes
 * - Business logic indicators: validation, transformation, orchestration methods
 * - Dependency injection patterns (constructor injection with private readonly)
 *
 * Returns a LayerTrace with layer='SERVICE' and status based on artifact coverage.
 */
export class ServiceLayerInspector {
  /**
   * Inspects service layer files matching the given inspection target patterns.
   *
   * @param target - InspectionTarget with glob patterns and required artifacts
   * @param projectRoot - Absolute path to the project workspace root
   * @returns LayerTrace for the SERVICE layer
   */
  async inspect(
    target: InspectionTarget,
    projectRoot: string,
  ): Promise<LayerTrace> {
    const matchedFiles: string[] = [];
    const issues: string[] = [];

    // Step 1: Resolve glob patterns to service files
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
        issues.push(
          `Glob error for "${pattern.glob}": ${(err as Error).message}`,
        );
      }
    }

    if (matchedFiles.length === 0) {
      return {
        layer: 'SERVICE',
        status: 'ABSENT',
        evidence: 'No service files matched inspection patterns',
        issues: issues.length > 0 ? issues : undefined,
      };
    }

    // Step 2: Check for service-layer indicators in matched files
    let injectableFound = false;
    let businessLogicFound = false;
    let dependencyInjectionFound = false;
    let firstMatchedFile: string | undefined;
    const lineReferences: number[] = [];

    // Service-layer detection patterns
    const injectablePattern = /@Injectable\s*\(/;
    const businessLogicPatterns = [
      /async\s+\w+\s*\(/, // async methods (orchestration)
      /validate\w*|transform\w*|calculate\w*|resolve\w*|generate\w*|process\w*/i, // business logic method names
      /throw\s+new\s+(Bad|Not|Conflict|Unauthorized|Forbidden)/i, // validation/error throwing
    ];
    const diPattern = /constructor\s*\([^)]*private\s+(readonly\s+)?\w+/;

    for (const filePath of matchedFiles) {
      const normalizedPath = path.resolve(filePath);

      try {
        if (!fs.existsSync(normalizedPath)) {
          continue;
        }

        const content = fs.readFileSync(normalizedPath, 'utf-8');

        // Check @Injectable() decorator
        const injectableMatch = injectablePattern.exec(content);
        if (injectableMatch) {
          injectableFound = true;
          if (!firstMatchedFile) {
            firstMatchedFile = normalizedPath;
          }
          const lineNumber = content
            .substring(0, injectableMatch.index)
            .split('\n').length;
          lineReferences.push(lineNumber);
        }

        // Check business logic indicators
        for (const blPattern of businessLogicPatterns) {
          if (blPattern.test(content)) {
            businessLogicFound = true;
            break;
          }
        }

        // Check dependency injection pattern
        if (diPattern.test(content)) {
          dependencyInjectionFound = true;
        }
      } catch (err) {
        issues.push(
          `Error reading "${normalizedPath}": ${(err as Error).message}`,
        );
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
        issues.push(
          `Invalid regex "${artifact.searchPattern}": ${(err as Error).message}`,
        );
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
      injectableFound,
      businessLogicFound,
      dependencyInjectionFound,
      artifactsFound,
      totalArtifacts,
    );

    const evidenceParts: string[] = [];
    if (injectableFound) evidenceParts.push('@Injectable() decorator found');
    if (businessLogicFound)
      evidenceParts.push('business logic patterns detected');
    if (dependencyInjectionFound)
      evidenceParts.push('DI constructor injection found');
    if (totalArtifacts > 0) {
      evidenceParts.push(
        `${artifactsFound}/${totalArtifacts} required artifacts matched`,
      );
    }

    return {
      layer: 'SERVICE',
      status,
      filePath: firstMatchedFile,
      lineReferences: lineReferences.length > 0 ? lineReferences : undefined,
      evidence:
        evidenceParts.length > 0
          ? evidenceParts.join('; ')
          : `Scanned ${matchedFiles.length} file(s), no service indicators found`,
      issues: issues.length > 0 ? issues : undefined,
    };
  }

  /**
   * Determines the SERVICE layer status based on detected indicators.
   *
   * PRESENT: @Injectable found AND (business logic OR DI) AND all required artifacts
   * PARTIAL: Some indicators found but not all
   * ABSENT: No indicators found
   */
  private determineStatus(
    injectableFound: boolean,
    businessLogicFound: boolean,
    dependencyInjectionFound: boolean,
    artifactsFound: number,
    totalArtifacts: number,
  ): 'PRESENT' | 'PARTIAL' | 'ABSENT' {
    const hasServiceIndicators =
      injectableFound && (businessLogicFound || dependencyInjectionFound);

    // If no required artifacts are specified, determine by indicators alone
    if (totalArtifacts === 0) {
      if (hasServiceIndicators) return 'PRESENT';
      if (injectableFound || businessLogicFound || dependencyInjectionFound)
        return 'PARTIAL';
      return 'ABSENT';
    }

    // With required artifacts, both indicators and artifact coverage matter
    const allArtifactsFound = artifactsFound >= totalArtifacts;

    if (hasServiceIndicators && allArtifactsFound) return 'PRESENT';
    if (
      injectableFound ||
      businessLogicFound ||
      dependencyInjectionFound ||
      artifactsFound > 0
    ) {
      return 'PARTIAL';
    }
    return 'ABSENT';
  }
}
