import * as fs from 'fs';
import * as path from 'path';
import fg from 'fast-glob';
import { InspectionTarget, LayerTrace } from '../interfaces';

/**
 * APILayerInspector scans the codebase for NestJS HTTP method decorators
 * and route path definitions to determine if the API layer exists for a
 * given business process.
 *
 * It looks for:
 * - HTTP method decorators: @Post, @Get, @Put, @Delete, @Patch
 * - Route path strings (e.g., 'patients', 'orders', 'lab')
 * - Required artifacts defined in the InspectionTarget
 */
export class APILayerInspector {
  /**
   * Inspects the API layer for a given inspection target.
   *
   * @param target - The inspection target defining patterns and required artifacts
   * @param projectRoot - The absolute path to the project root directory
   * @returns A LayerTrace indicating PRESENT, PARTIAL, or ABSENT status
   */
  async inspect(
    target: InspectionTarget,
    projectRoot: string,
  ): Promise<LayerTrace> {
    const matchedFiles: string[] = [];
    const issues: string[] = [];

    // Step 1: Resolve glob patterns to find relevant files
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
        layer: 'API',
        status: 'ABSENT',
        evidence: 'No files matched API layer inspection patterns',
        issues: issues.length > 0 ? issues : undefined,
      };
    }

    // Step 2: Scan for NestJS HTTP method decorators
    const httpMethodPattern = /@(Post|Get|Put|Delete|Patch)\(/;
    const routePathPattern = /['"`]([a-zA-Z0-9/:_-]+)['"`]/;

    let foundDecorators = 0;
    let foundRoutes = 0;
    let foundArtifacts = 0;
    let firstMatchedFile: string | undefined;
    const lineReferences: number[] = [];

    for (const filePath of matchedFiles) {
      const normalizedPath = path.resolve(filePath);

      try {
        if (!fs.existsSync(normalizedPath)) {
          continue;
        }

        const content = fs.readFileSync(normalizedPath, 'utf-8');
        const lines = content.split('\n');

        // Check for HTTP method decorators
        for (let i = 0; i < lines.length; i++) {
          if (httpMethodPattern.test(lines[i])) {
            foundDecorators++;
            if (!firstMatchedFile) {
              firstMatchedFile = normalizedPath;
            }
            lineReferences.push(i + 1);

            // Check if the decorator has a route path
            if (routePathPattern.test(lines[i])) {
              foundRoutes++;
            }
          }
        }
      } catch (err) {
        issues.push(
          `Error reading "${normalizedPath}": ${(err as Error).message}`,
        );
      }
    }

    // Step 3: Check required artifacts (regex patterns defined in target)
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
        const normalizedPath = path.resolve(filePath);
        try {
          if (!fs.existsSync(normalizedPath)) continue;
          const content = fs.readFileSync(normalizedPath, 'utf-8');
          if (regex.test(content)) {
            foundArtifacts++;
            if (!firstMatchedFile) {
              firstMatchedFile = normalizedPath;
            }
            break;
          }
        } catch {
          // Already tracked in issues above
        }
      }
    }

    // Step 4: Determine status
    const totalRequired = target.requiredArtifacts.length;
    const hasDecorators = foundDecorators > 0;
    const hasArtifacts = totalRequired === 0 || foundArtifacts > 0;

    let status: 'PRESENT' | 'PARTIAL' | 'ABSENT';
    if (
      hasDecorators &&
      (totalRequired === 0 || foundArtifacts >= totalRequired)
    ) {
      status = 'PRESENT';
    } else if (hasDecorators || foundArtifacts > 0) {
      status = 'PARTIAL';
    } else {
      status = 'ABSENT';
    }

    return {
      layer: 'API',
      status,
      filePath: firstMatchedFile,
      lineReferences:
        lineReferences.length > 0 ? lineReferences.slice(0, 20) : undefined,
      evidence: `Found ${foundDecorators} HTTP decorators, ${foundRoutes} route paths, ${foundArtifacts}/${totalRequired} required artifacts in ${matchedFiles.length} file(s)`,
      issues: issues.length > 0 ? issues : undefined,
    };
  }
}
