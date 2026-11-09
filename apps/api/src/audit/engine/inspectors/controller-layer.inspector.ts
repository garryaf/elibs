import * as fs from 'fs';
import * as path from 'path';
import fg from 'fast-glob';
import { InspectionTarget, LayerTrace } from '../interfaces';

interface ScanAccumulator {
  foundControllerDecorators: number;
  foundGuards: number;
  foundRoles: number;
  foundClasses: number;
  foundConstructors: number;
  firstMatchedFile: string | undefined;
  lineReferences: number[];
}

/**
 * ControllerLayerInspector scans for NestJS controller class structures
 * including decorators, guard usage, and method signatures.
 *
 * It looks for:
 * - @Controller() decorator with route prefix
 * - @UseGuards() for authentication/authorization guards
 * - @Roles() for role-based access control
 * - Class structure with injectable dependencies (constructor injection)
 * - Method signatures matching expected controller patterns
 */
export class ControllerLayerInspector {
  // Controller-specific detection patterns (compiled once, reused per file)
  private static readonly PATTERNS = {
    controllerDecorator: /@Controller\(/,
    useGuards: /@UseGuards\(/,
    roles: /@Roles\(/,
    controllerClass: /export\s+class\s+\w+Controller/,
    constructor: /constructor\s*\(/,
  } as const;

  /**
   * Inspects the Controller layer for a given inspection target.
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

    // Step 1: Resolve glob patterns to find relevant controller files
    const matchedFiles = await this.resolveFiles(
      target.patterns,
      projectRoot,
      issues,
    );

    if (matchedFiles.length === 0) {
      return {
        layer: 'CONTROLLER',
        status: 'ABSENT',
        evidence: 'No files matched Controller layer inspection patterns',
        issues: issues.length > 0 ? issues : undefined,
      };
    }

    // Step 2: Scan files for controller-specific patterns
    const scan = this.scanFiles(matchedFiles, issues);

    // Step 3: Check required artifacts (regex patterns from target)
    const { foundArtifacts, totalRequired } = this.countArtifacts(
      target.requiredArtifacts,
      matchedFiles,
      issues,
    );

    // Step 4: Determine status based on what was found
    const status = this.determineStatus(
      scan.foundControllerDecorators,
      scan.foundClasses,
      scan.foundConstructors,
      foundArtifacts,
      totalRequired,
    );

    const securityInfo =
      scan.foundGuards > 0 || scan.foundRoles > 0
        ? `, guards: ${scan.foundGuards}, roles: ${scan.foundRoles}`
        : ', no security decorators found';

    return {
      layer: 'CONTROLLER',
      status,
      filePath: scan.firstMatchedFile,
      lineReferences:
        scan.lineReferences.length > 0
          ? scan.lineReferences.slice(0, 20)
          : undefined,
      evidence: `Found ${scan.foundControllerDecorators} @Controller decorators, ${scan.foundClasses} controller classes, ${foundArtifacts}/${totalRequired} required artifacts${securityInfo} in ${matchedFiles.length} file(s)`,
      issues: issues.length > 0 ? issues : undefined,
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Resolves a list of glob patterns into matched absolute file paths.
   * Glob errors are appended to `issues` and do not throw.
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
   * Counts occurrences of controller-specific patterns across all matched files.
   * File read errors are appended to `issues` and do not throw.
   */
  private scanFiles(
    matchedFiles: string[],
    issues: string[],
  ): ScanAccumulator {
    const state: ScanAccumulator = {
      foundControllerDecorators: 0,
      foundGuards: 0,
      foundRoles: 0,
      foundClasses: 0,
      foundConstructors: 0,
      firstMatchedFile: undefined,
      lineReferences: [],
    };

    for (const filePath of matchedFiles) {
      this.scanSingleFile(path.resolve(filePath), state, issues);
    }

    return state;
  }

  /**
   * Scans a single file for controller indicators and updates accumulator state.
   */
  private scanSingleFile(
    normalizedPath: string,
    state: ScanAccumulator,
    issues: string[],
  ): void {
    const { PATTERNS } = ControllerLayerInspector;

    try {
      if (!fs.existsSync(normalizedPath)) return;

      const content = fs.readFileSync(normalizedPath, 'utf-8');
      const lines = content.split('\n');
      let fileHasController = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (PATTERNS.controllerDecorator.test(line)) {
          state.foundControllerDecorators++;
          fileHasController = true;
          if (!state.firstMatchedFile) state.firstMatchedFile = normalizedPath;
          state.lineReferences.push(i + 1);
        }
        if (PATTERNS.useGuards.test(line)) state.foundGuards++;
        if (PATTERNS.roles.test(line)) state.foundRoles++;
        if (PATTERNS.controllerClass.test(line)) state.foundClasses++;
        if (PATTERNS.constructor.test(line)) state.foundConstructors++;
      }

      // If no @Controller decorator but has a controller-named class, still partial
      if (!fileHasController && PATTERNS.controllerClass.test(content)) {
        if (!state.firstMatchedFile) state.firstMatchedFile = normalizedPath;
      }
    } catch (err) {
      issues.push(
        `Error reading "${normalizedPath}": ${(err as Error).message}`,
      );
    }
  }

  /**
   * Checks whether a regex pattern matches any of the given files.
   */
  private isArtifactPresentInFiles(
    regex: RegExp,
    matchedFiles: string[],
    issues: string[],
  ): boolean {
    for (const filePath of matchedFiles) {
      const normalizedPath = path.resolve(filePath);
      try {
        if (!fs.existsSync(normalizedPath)) continue;
        const content = fs.readFileSync(normalizedPath, 'utf-8');
        if (regex.test(content)) {
          return true;
        }
      } catch (err) {
        const msg = `Error reading "${normalizedPath}" during artifact check: ${(err as Error).message}`;
        if (!issues.includes(msg)) issues.push(msg);
      }
    }
    return false;
  }

  /**
   * Counts how many required artifacts (regex patterns) are present in the
   * matched files. Invalid regex patterns and read errors are appended to
   * `issues` rather than thrown.
   */
  private countArtifacts(
    requiredArtifacts: InspectionTarget['requiredArtifacts'],
    matchedFiles: string[],
    issues: string[],
  ): { foundArtifacts: number; totalRequired: number } {
    let foundArtifacts = 0;

    for (const artifact of requiredArtifacts) {
      try {
        const regex = new RegExp(artifact.searchPattern, 'm');
        if (this.isArtifactPresentInFiles(regex, matchedFiles, issues)) {
          foundArtifacts++;
        }
      } catch (err) {
        issues.push(
          `Invalid regex "${artifact.searchPattern}": ${(err as Error).message}`,
        );
      }
    }

    return { foundArtifacts, totalRequired: requiredArtifacts.length };
  }

  /**
   * Determines the CONTROLLER layer status from collected scan metrics.
   *
   * PRESENT: proper structure (decorator + class + constructor) AND all
   *          required artifacts matched (or none required)
   * PARTIAL: controller class found OR some artifacts matched
   * ABSENT:  nothing recognisable found
   */
  private determineStatus(
    foundControllerDecorators: number,
    foundClasses: number,
    foundConstructors: number,
    foundArtifacts: number,
    totalRequired: number,
  ): 'PRESENT' | 'PARTIAL' | 'ABSENT' {
    const hasControllerClass =
      foundControllerDecorators > 0 && foundClasses > 0;
    const hasProperStructure = hasControllerClass && foundConstructors > 0;
    const allArtifactsMet =
      totalRequired === 0 || foundArtifacts >= totalRequired;

    if (hasProperStructure && allArtifactsMet) return 'PRESENT';
    if (hasControllerClass || foundArtifacts > 0 || foundClasses > 0)
      return 'PARTIAL';
    return 'ABSENT';
  }
}
