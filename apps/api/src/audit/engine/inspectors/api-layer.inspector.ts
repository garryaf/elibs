import * as fs from 'fs';
import * as path from 'path';
import fg from 'fast-glob';
import { InspectionTarget, LayerTrace } from '../interfaces';

interface ApiScanAccumulator {
  foundDecorators: number;
  foundRoutes: number;
  firstMatchedFile: string | undefined;
  lineReferences: number[];
}

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
  private static readonly PATTERNS = {
    httpMethod: /@(Post|Get|Put|Delete|Patch)\(/,
    routePath: /['"`]([a-zA-Z0-9/:_-]+)['"`]/,
  } as const;

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
    const issues: string[] = [];

    // Step 1: Resolve glob patterns to find relevant files
    const matchedFiles = await this.resolveFiles(
      target.patterns,
      projectRoot,
      issues,
    );

    if (matchedFiles.length === 0) {
      return {
        layer: 'API',
        status: 'ABSENT',
        evidence: 'No files matched API layer inspection patterns',
        issues: issues.length > 0 ? issues : undefined,
      };
    }

    // Step 2: Scan for NestJS HTTP method decorators
    const scan = this.scanFiles(matchedFiles, issues);

    // Step 3: Check required artifacts (regex patterns defined in target)
    const { foundArtifacts, totalRequired, firstArtifactFile } =
      this.countArtifacts(target.requiredArtifacts, matchedFiles, issues);

    const firstMatchedFile = scan.firstMatchedFile ?? firstArtifactFile;

    // Step 4: Determine status
    const status = this.determineStatus(
      scan.foundDecorators,
      foundArtifacts,
      totalRequired,
    );

    return {
      layer: 'API',
      status,
      filePath: firstMatchedFile,
      lineReferences:
        scan.lineReferences.length > 0
          ? scan.lineReferences.slice(0, 20)
          : undefined,
      evidence: `Found ${scan.foundDecorators} HTTP decorators, ${scan.foundRoutes} route paths, ${foundArtifacts}/${totalRequired} required artifacts in ${matchedFiles.length} file(s)`,
      issues: issues.length > 0 ? issues : undefined,
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Resolves glob patterns to matching file paths.
   */
  private async resolveFiles(
    patterns: InspectionTarget['patterns'],
    projectRoot: string,
    issues: string[],
  ): Promise<string[]> {
    const matchedFiles: string[] = [];
    for (const pattern of patterns) {
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
    return matchedFiles;
  }

  /**
   * Scans all matched files for HTTP method decorators and route paths.
   */
  private scanFiles(
    matchedFiles: string[],
    issues: string[],
  ): ApiScanAccumulator {
    const state: ApiScanAccumulator = {
      foundDecorators: 0,
      foundRoutes: 0,
      firstMatchedFile: undefined,
      lineReferences: [],
    };

    for (const filePath of matchedFiles) {
      this.scanSingleFile(path.resolve(filePath), state, issues);
    }

    return state;
  }

  /**
   * Scans a single file for HTTP method decorators and route paths.
   */
  private scanSingleFile(
    normalizedPath: string,
    state: ApiScanAccumulator,
    issues: string[],
  ): void {
    const { PATTERNS } = APILayerInspector;

    try {
      if (!fs.existsSync(normalizedPath)) return;

      const content = fs.readFileSync(normalizedPath, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (PATTERNS.httpMethod.test(line)) {
          state.foundDecorators++;
          if (!state.firstMatchedFile) {
            state.firstMatchedFile = normalizedPath;
          }
          state.lineReferences.push(i + 1);

          if (PATTERNS.routePath.test(line)) {
            state.foundRoutes++;
          }
        }
      }
    } catch (err) {
      issues.push(
        `Error reading "${normalizedPath}": ${(err as Error).message}`,
      );
    }
  }

  /**
   * Searches for a matching artifact across files.
   * Returns the path of the first matching file, or null if none match.
   */
  private findArtifactInFiles(
    regex: RegExp,
    matchedFiles: string[],
    issues: string[],
  ): string | null {
    for (const filePath of matchedFiles) {
      const normalizedPath = path.resolve(filePath);
      try {
        if (!fs.existsSync(normalizedPath)) continue;
        const content = fs.readFileSync(normalizedPath, 'utf-8');
        if (regex.test(content)) {
          return normalizedPath;
        }
      } catch (err) {
        const msg = `Error reading "${normalizedPath}" during artifact check: ${(err as Error).message}`;
        if (!issues.includes(msg)) issues.push(msg);
      }
    }
    return null;
  }

  /**
   * Checks required artifacts defined in the target against matched files.
   */
  private countArtifacts(
    requiredArtifacts: InspectionTarget['requiredArtifacts'],
    matchedFiles: string[],
    issues: string[],
  ): {
    foundArtifacts: number;
    totalRequired: number;
    firstArtifactFile: string | undefined;
  } {
    let foundArtifacts = 0;
    let firstArtifactFile: string | undefined;
    const totalRequired = requiredArtifacts.length;

    for (const artifact of requiredArtifacts) {
      try {
        const regex = new RegExp(artifact.searchPattern, 'm');
        const matchedPath = this.findArtifactInFiles(
          regex,
          matchedFiles,
          issues,
        );
        if (matchedPath) {
          foundArtifacts++;
          if (!firstArtifactFile) {
            firstArtifactFile = matchedPath;
          }
        }
      } catch (err) {
        issues.push(
          `Invalid regex "${artifact.searchPattern}": ${(err as Error).message}`,
        );
      }
    }

    return { foundArtifacts, totalRequired, firstArtifactFile };
  }

  /**
   * Determines API layer status from decorator and artifact counts.
   */
  private determineStatus(
    foundDecorators: number,
    foundArtifacts: number,
    totalRequired: number,
  ): 'PRESENT' | 'PARTIAL' | 'ABSENT' {
    const hasDecorators = foundDecorators > 0;
    const allArtifactsMet =
      totalRequired === 0 || foundArtifacts >= totalRequired;

    if (hasDecorators && allArtifactsMet) {
      return 'PRESENT';
    }
    if (hasDecorators || foundArtifacts > 0) {
      return 'PARTIAL';
    }
    return 'ABSENT';
  }
}
