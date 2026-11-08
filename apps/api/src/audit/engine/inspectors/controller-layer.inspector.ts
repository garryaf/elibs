import * as fs from 'fs';
import * as path from 'path';
import fg from 'fast-glob';
import { InspectionTarget, LayerTrace } from '../interfaces';

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
    const matchedFiles: string[] = [];
    const issues: string[] = [];

    // Step 1: Resolve glob patterns to find relevant controller files
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
        layer: 'CONTROLLER',
        status: 'ABSENT',
        evidence: 'No files matched Controller layer inspection patterns',
        issues: issues.length > 0 ? issues : undefined,
      };
    }

    // Step 2: Scan for controller-specific patterns
    const controllerDecoratorPattern = /@Controller\(/;
    const useGuardsPattern = /@UseGuards\(/;
    const rolesPattern = /@Roles\(/;
    const classPattern = /export\s+class\s+\w+Controller/;
    const constructorPattern = /constructor\s*\(/;

    let foundControllerDecorators = 0;
    let foundGuards = 0;
    let foundRoles = 0;
    let foundClasses = 0;
    let foundConstructors = 0;
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

        let fileHasController = false;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          if (controllerDecoratorPattern.test(line)) {
            foundControllerDecorators++;
            fileHasController = true;
            if (!firstMatchedFile) {
              firstMatchedFile = normalizedPath;
            }
            lineReferences.push(i + 1);
          }

          if (useGuardsPattern.test(line)) {
            foundGuards++;
          }

          if (rolesPattern.test(line)) {
            foundRoles++;
          }

          if (classPattern.test(line)) {
            foundClasses++;
          }

          if (constructorPattern.test(line)) {
            foundConstructors++;
          }
        }

        // If no @Controller decorator but has a controller-named class, still partial
        if (!fileHasController && classPattern.test(content)) {
          if (!firstMatchedFile) {
            firstMatchedFile = normalizedPath;
          }
        }
      } catch (err) {
        issues.push(
          `Error reading "${normalizedPath}": ${(err as Error).message}`,
        );
      }
    }

    // Step 3: Check required artifacts (regex patterns from target)
    let foundArtifacts = 0;
    const totalRequired = target.requiredArtifacts.length;

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
            break;
          }
        } catch {
          // Already tracked in issues above
        }
      }
    }

    // Step 4: Determine status based on what was found
    const hasControllerClass =
      foundControllerDecorators > 0 && foundClasses > 0;
    const hasProperStructure = hasControllerClass && foundConstructors > 0;
    const hasSecurityDecorators = foundGuards > 0 || foundRoles > 0;

    let status: 'PRESENT' | 'PARTIAL' | 'ABSENT';

    if (
      hasProperStructure &&
      (totalRequired === 0 || foundArtifacts >= totalRequired)
    ) {
      // Full controller structure found with all required artifacts
      status = 'PRESENT';
    } else if (hasControllerClass || foundArtifacts > 0) {
      // Controller exists but may be missing guards, roles, or some artifacts
      status = 'PARTIAL';
    } else if (foundClasses > 0) {
      // Class exists but missing @Controller decorator
      status = 'PARTIAL';
    } else {
      status = 'ABSENT';
    }

    const securityInfo = hasSecurityDecorators
      ? `, guards: ${foundGuards}, roles: ${foundRoles}`
      : ', no security decorators found';

    return {
      layer: 'CONTROLLER',
      status,
      filePath: firstMatchedFile,
      lineReferences:
        lineReferences.length > 0 ? lineReferences.slice(0, 20) : undefined,
      evidence: `Found ${foundControllerDecorators} @Controller decorators, ${foundClasses} controller classes, ${foundArtifacts}/${totalRequired} required artifacts${securityInfo} in ${matchedFiles.length} file(s)`,
      issues: issues.length > 0 ? issues : undefined,
    };
  }
}
