import * as fs from 'fs';
import * as path from 'path';
import fg from 'fast-glob';
import { InspectionTarget, LayerTrace, StackLayer } from './interfaces';

/** Default timeout per layer inspection in milliseconds */
const DEFAULT_LAYER_TIMEOUT_MS = 30_000;

/**
 * StackTracer inspects each architectural layer for a given business process.
 *
 * For each InspectionTarget it:
 * 1. Scans the file system using glob patterns to find relevant source files
 * 2. Searches matched files for required artifacts using regex patterns
 * 3. Determines layer status: PRESENT (all found), PARTIAL (some), ABSENT (none or timeout)
 * 4. Tracks visited file paths to detect and skip circular module references
 */
export class StackTracer {
  private readonly projectRoot: string;
  private readonly timeoutMs: number;

  constructor(projectRoot: string, timeoutMs = DEFAULT_LAYER_TIMEOUT_MS) {
    this.projectRoot = projectRoot;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Traces all inspection targets and produces a LayerTrace per target.
   *
   * Each target is inspected with a timeout. If the timeout fires, the layer
   * is marked ABSENT with a timeout evidence note.
   */
  async traceStack(targets: InspectionTarget[]): Promise<LayerTrace[]> {
    const results: LayerTrace[] = [];

    for (const target of targets) {
      const trace = await this.inspectLayerWithTimeout(target);
      results.push(trace);
    }

    return results;
  }

  /**
   * Wraps a single layer inspection in a timeout race.
   * If inspection exceeds the configured timeout, returns ABSENT with timeout note.
   */
  private async inspectLayerWithTimeout(target: InspectionTarget): Promise<LayerTrace> {
    return Promise.race([
      this.inspectLayer(target),
      this.createTimeoutPromise(target.layer),
    ]);
  }

  /**
   * Creates a promise that resolves to an ABSENT LayerTrace after the timeout period.
   */
  private createTimeoutPromise(layer: StackLayer): Promise<LayerTrace> {
    return new Promise<LayerTrace>((resolve) => {
      setTimeout(() => {
        resolve({
          layer,
          status: 'ABSENT',
          evidence: `Timeout exceeded (${this.timeoutMs / 1000}s)`,
          issues: ['Layer inspection timed out'],
        });
      }, this.timeoutMs);
    });
  }

  /**
   * Inspects a single layer by:
   * 1. Resolving glob patterns to matching files
   * 2. Scanning matched files for required artifact patterns
   * 3. Determining overall status based on artifact coverage
   */
  private async inspectLayer(target: InspectionTarget): Promise<LayerTrace> {
    const visitedFiles = new Set<string>();
    const matchedFiles: string[] = [];
    const issues: string[] = [];

    // Step 1: Resolve all glob patterns to file paths
    for (const pattern of target.patterns) {
      try {
        const files = await fg(pattern.glob, {
          cwd: this.projectRoot,
          absolute: true,
          onlyFiles: true,
          suppressErrors: true,
        });
        matchedFiles.push(...files);
      } catch (err) {
        issues.push(`Glob pattern error for "${pattern.glob}": ${(err as Error).message}`);
      }
    }

    // No files matched any pattern
    if (matchedFiles.length === 0) {
      return {
        layer: target.layer,
        status: 'ABSENT',
        evidence: 'No files matched inspection patterns',
        issues: issues.length > 0 ? issues : undefined,
      };
    }

    // Step 2: Check each required artifact against matched files
    const { requiredArtifacts } = target;
    if (requiredArtifacts.length === 0) {
      // If no required artifacts specified, presence of matching files is sufficient
      return {
        layer: target.layer,
        status: 'PRESENT',
        filePath: matchedFiles[0],
        evidence: `Found ${matchedFiles.length} file(s) matching patterns`,
        issues: issues.length > 0 ? issues : undefined,
      };
    }

    let foundCount = 0;
    const lineReferences: number[] = [];
    let firstMatchedFile: string | undefined;

    for (const artifact of requiredArtifacts) {
      const found = this.searchArtifactInFiles(
        artifact.searchPattern,
        matchedFiles,
        visitedFiles,
        issues,
      );

      if (found) {
        foundCount++;
        if (!firstMatchedFile) {
          firstMatchedFile = found.filePath;
        }
        if (found.lineNumber !== undefined) {
          lineReferences.push(found.lineNumber);
        }
      }
    }

    // Step 3: Determine status based on artifact coverage
    const status = this.determineStatus(foundCount, requiredArtifacts.length);

    return {
      layer: target.layer,
      status,
      filePath: firstMatchedFile,
      lineReferences: lineReferences.length > 0 ? lineReferences : undefined,
      evidence: `Found ${foundCount}/${requiredArtifacts.length} required artifacts in ${matchedFiles.length} file(s)`,
      issues: issues.length > 0 ? issues : undefined,
    };
  }

  /**
   * Searches for a regex pattern across a set of files.
   * Uses visited-set tracking to detect and skip circular references.
   *
   * @returns Match info if found, undefined otherwise
   */
  private searchArtifactInFiles(
    searchPattern: string,
    files: string[],
    visitedFiles: Set<string>,
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

      // Circular reference detection: skip already-visited files
      if (visitedFiles.has(normalizedPath)) {
        continue;
      }
      visitedFiles.add(normalizedPath);

      try {
        if (!fs.existsSync(normalizedPath)) {
          continue;
        }

        const content = fs.readFileSync(normalizedPath, 'utf-8');
        const match = regex.exec(content);

        if (match) {
          // Calculate line number from match index
          const lineNumber = content.substring(0, match.index).split('\n').length;
          return { filePath: normalizedPath, lineNumber };
        }
      } catch (err) {
        issues.push(
          `Error reading file "${normalizedPath}": ${(err as Error).message}`,
        );
      }
    }

    return undefined;
  }

  /**
   * Determines layer status based on how many required artifacts were found.
   *
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
