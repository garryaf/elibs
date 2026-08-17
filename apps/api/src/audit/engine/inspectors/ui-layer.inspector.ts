import * as fs from 'fs';
import * as path from 'path';
import fg from 'fast-glob';
import { InspectionTarget, LayerTrace } from '../interfaces';

/**
 * UILayerInspector scans `apps/web/src/` for pages, components, and routes
 * matching process-specific patterns defined in the InspectionTarget.
 *
 * It searches for:
 * - Route definitions (e.g., `path: '/patients'`, `<Route path=`, Next.js file-based routes)
 * - Form components (e.g., `<form`, `useForm`, `<Form`)
 * - Page components (e.g., `export default function`, `export const`, page-level components)
 *
 * Returns a LayerTrace with status PRESENT/PARTIAL/ABSENT and file path evidence.
 */
export class UILayerInspector {
  /**
   * Inspect the UI layer for a given target within the project.
   *
   * @param target - The inspection target defining file patterns and required artifacts
   * @param projectRoot - The workspace root path
   * @returns A LayerTrace describing what was found in the UI layer
   */
  async inspect(target: InspectionTarget, projectRoot: string): Promise<LayerTrace> {
    const issues: string[] = [];
    const matchedFiles: string[] = [];

    // Step 1: Resolve glob patterns to find relevant TSX/TS files
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
        issues.push(`Glob pattern error for "${pattern.glob}": ${(err as Error).message}`);
      }
    }

    // No files matched any pattern — UI layer is absent
    if (matchedFiles.length === 0) {
      return {
        layer: 'UI',
        status: 'ABSENT',
        evidence: 'No files matched UI inspection patterns',
        issues: issues.length > 0 ? issues : undefined,
      };
    }

    // Step 2: If no required artifacts defined, file presence is sufficient
    const { requiredArtifacts } = target;
    if (requiredArtifacts.length === 0) {
      return {
        layer: 'UI',
        status: 'PRESENT',
        filePath: matchedFiles[0],
        evidence: `Found ${matchedFiles.length} UI file(s) matching patterns`,
        issues: issues.length > 0 ? issues : undefined,
      };
    }

    // Step 3: Search matched files for required artifacts
    let foundCount = 0;
    let firstMatchedFile: string | undefined;
    const foundArtifacts: string[] = [];
    const missingArtifacts: string[] = [];

    for (const artifact of requiredArtifacts) {
      const result = this.searchArtifactInFiles(artifact.searchPattern, matchedFiles, issues);

      if (result) {
        foundCount++;
        foundArtifacts.push(artifact.description);
        if (!firstMatchedFile) {
          firstMatchedFile = result.filePath;
        }
      } else {
        missingArtifacts.push(artifact.description);
      }
    }

    // Step 4: Determine status based on artifact coverage
    const status = this.determineStatus(foundCount, requiredArtifacts.length);

    const evidenceParts: string[] = [];
    if (foundArtifacts.length > 0) {
      evidenceParts.push(`Found: ${foundArtifacts.join(', ')}`);
    }
    if (missingArtifacts.length > 0) {
      evidenceParts.push(`Missing: ${missingArtifacts.join(', ')}`);
    }

    return {
      layer: 'UI',
      status,
      filePath: firstMatchedFile,
      evidence: evidenceParts.join('; ') || `Found ${foundCount}/${requiredArtifacts.length} required UI artifacts`,
      issues: issues.length > 0 ? issues : undefined,
    };
  }

  /**
   * Searches for a regex pattern in the given set of files.
   * Looks for UI-specific patterns: route definitions, form components, page components.
   */
  private searchArtifactInFiles(
    searchPattern: string,
    files: string[],
    issues: string[],
  ): { filePath: string; lineNumber?: number } | undefined {
    let regex: RegExp;
    try {
      regex = new RegExp(searchPattern, 'm');
    } catch (err) {
      issues.push(`Invalid regex pattern "${searchPattern}": ${(err as Error).message}`);
      return undefined;
    }

    for (const filePath of files) {
      const normalizedPath = path.resolve(filePath);

      try {
        if (!fs.existsSync(normalizedPath)) {
          continue;
        }

        const content = fs.readFileSync(normalizedPath, 'utf-8');
        const match = regex.exec(content);

        if (match) {
          const lineNumber = content.substring(0, match.index).split('\n').length;
          return { filePath: normalizedPath, lineNumber };
        }
      } catch (err) {
        issues.push(`Error reading file "${normalizedPath}": ${(err as Error).message}`);
      }
    }

    return undefined;
  }

  /**
   * Determines UI layer status based on artifact coverage:
   * - All found → PRESENT
   * - Some found → PARTIAL
   * - None found → ABSENT
   */
  private determineStatus(
    foundCount: number,
    totalRequired: number,
  ): 'PRESENT' | 'PARTIAL' | 'ABSENT' {
    if (foundCount === 0) {
      return 'ABSENT';
    }
    if (foundCount >= totalRequired) {
      return 'PRESENT';
    }
    return 'PARTIAL';
  }
}
