import * as fs from 'fs';
import { AuditStatusEntry, ProcessClassification } from './interfaces';

/**
 * Cross-references audit findings against docs/AUDIT_STATUS.md to
 * deduplicate already-resolved items from the Gap Report output.
 */
export class AuditStatusCrossRef {
  /**
   * Parse the AUDIT_STATUS.md markdown file into structured entries.
   * Returns empty entries with a warning if the file is missing or unparseable.
   */
  loadAuditStatus(filePath: string): {
    entries: AuditStatusEntry[];
    warning?: string;
  } {
    let content: string;

    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unknown read error';
      return {
        entries: [],
        warning: `AUDIT_STATUS.md could not be read: ${message}`,
      };
    }

    try {
      const entries = this.parseMarkdownTables(content);
      return { entries };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unknown parse error';
      return {
        entries: [],
        warning: `AUDIT_STATUS.md could not be parsed: ${message}`,
      };
    }
  }

  /**
   * Filter out classifications that match an AUDIT_STATUS entry with
   * "Implemented" status. Matching is done by checking if the entry title
   * contains the classification's processName (case-insensitive) AND the
   * entry's gapDescription (remainingGap or title) relates to the
   * classification's gapDescription.
   *
   * When entries is empty, all classifications pass through unfiltered.
   */
  deduplicate(
    classifications: ProcessClassification[],
    entries: AuditStatusEntry[],
  ): ProcessClassification[] {
    if (entries.length === 0) {
      return classifications;
    }

    const implementedEntries = entries.filter(
      (e) => e.status === 'Implemented',
    );

    if (implementedEntries.length === 0) {
      return classifications;
    }

    return classifications.filter((classification) => {
      // IMPLEMENTED classifications are never excluded by cross-ref
      if (classification.status === 'IMPLEMENTED') {
        return true;
      }

      // Check if any implemented entry matches this classification
      const isAlreadyResolved = implementedEntries.some((entry) =>
        this.matches(classification, entry),
      );

      // Exclude (filter out) findings that are already resolved
      return !isAlreadyResolved;
    });
  }

  /**
   * Determine if a classification matches an audit status entry.
   * Match criteria: entry title contains the process name (case-insensitive)
   * AND (if the classification has a gapDescription) the entry title or
   * remainingGap relates to the gap description.
   */
  private matches(
    classification: ProcessClassification,
    entry: AuditStatusEntry,
  ): boolean {
    const titleLower = entry.title.toLowerCase();
    const processLower = classification.processName.toLowerCase();

    // Process name must appear in the entry title
    if (!titleLower.includes(processLower)) {
      return false;
    }

    // If classification has no gap description, process name match is sufficient
    if (!classification.gapDescription) {
      return true;
    }

    // Check if gap description keywords appear in entry title or remainingGap
    const gapLower = classification.gapDescription.toLowerCase();
    const gapWords = this.extractKeywords(gapLower);

    // At least some keywords from the gap description should match
    const entryText = [titleLower, (entry.remainingGap || '').toLowerCase()]
      .join(' ')
      .trim();

    // Match if at least half of the significant keywords are found
    const matchCount = gapWords.filter((word) =>
      entryText.includes(word),
    ).length;

    return gapWords.length === 0 || matchCount >= Math.ceil(gapWords.length / 2);
  }

  /**
   * Extract significant keywords (3+ chars) from a text string.
   */
  private extractKeywords(text: string): string[] {
    return text
      .split(/\s+/)
      .filter((word) => word.length >= 3)
      .filter(
        (word) =>
          !['the', 'and', 'for', 'not', 'but', 'are', 'was', 'has', 'with'].includes(word),
      );
  }

  /**
   * Parse all markdown tables in the content into AuditStatusEntry[].
   * Handles multiple sections (Critical, High, Medium, Low).
   */
  private parseMarkdownTables(content: string): AuditStatusEntry[] {
    const entries: AuditStatusEntry[] = [];
    const lines = content.split('\n');

    let inTable = false;
    let headerParsed = false;
    let columnIndices: {
      id: number;
      title: number;
      status: number;
      evidence: number;
      remainingGap: number;
    } | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      // Detect table header row
      if (trimmed.startsWith('|') && trimmed.includes('ID') && trimmed.includes('Title') && trimmed.includes('Status')) {
        const columns = this.splitTableRow(trimmed);
        columnIndices = this.findColumnIndices(columns);
        inTable = true;
        headerParsed = false;
        continue;
      }

      // Skip separator row (e.g., |----|------|...)
      if (inTable && !headerParsed && trimmed.startsWith('|') && trimmed.includes('---')) {
        headerParsed = true;
        continue;
      }

      // Parse data rows
      if (inTable && headerParsed && trimmed.startsWith('|') && columnIndices) {
        const columns = this.splitTableRow(trimmed);

        // End of table detection (empty row or non-table line)
        if (columns.length < 3) {
          inTable = false;
          headerParsed = false;
          columnIndices = null;
          continue;
        }

        const entry = this.parseTableRow(columns, columnIndices);
        if (entry) {
          entries.push(entry);
        }
      } else if (inTable && !trimmed.startsWith('|')) {
        // Left table zone
        inTable = false;
        headerParsed = false;
        columnIndices = null;
      }
    }

    return entries;
  }

  /**
   * Split a markdown table row into cell values.
   */
  private splitTableRow(row: string): string[] {
    // Remove leading/trailing pipes and split by |
    return row
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim());
  }

  /**
   * Find column indices by header names.
   */
  private findColumnIndices(headers: string[]): {
    id: number;
    title: number;
    status: number;
    evidence: number;
    remainingGap: number;
  } {
    const find = (name: string) =>
      headers.findIndex((h) => h.toLowerCase().includes(name.toLowerCase()));

    return {
      id: Math.max(find('ID'), 0),
      title: Math.max(find('Title'), 1),
      status: Math.max(find('Status'), 2),
      evidence: Math.max(find('Evidence'), 3),
      remainingGap: Math.max(find('Remaining'), find('Gap') !== -1 ? find('Gap') : 4),
    };
  }

  /**
   * Parse a single table row into an AuditStatusEntry.
   */
  private parseTableRow(
    columns: string[],
    indices: {
      id: number;
      title: number;
      status: number;
      evidence: number;
      remainingGap: number;
    },
  ): AuditStatusEntry | null {
    const id = columns[indices.id];
    const title = columns[indices.title];
    const statusRaw = columns[indices.status];
    const evidence = columns[indices.evidence] || '';
    const remainingGapRaw = columns[indices.remainingGap] || '';

    if (!id || !title || !statusRaw) {
      return null;
    }

    const status = this.parseStatus(statusRaw);
    if (!status) {
      return null;
    }

    const remainingGap =
      remainingGapRaw === '—' || remainingGapRaw === '-' || remainingGapRaw === ''
        ? null
        : remainingGapRaw;

    return { id, title, status, evidence, remainingGap };
  }

  /**
   * Map emoji-prefixed status strings to the AuditStatusEntry status type.
   */
  private parseStatus(
    raw: string,
  ): AuditStatusEntry['status'] | null {
    const normalized = raw.trim().toLowerCase();

    if (normalized.includes('implemented') || normalized.startsWith('✅')) {
      return 'Implemented';
    }
    if (normalized.includes('partial') || normalized.startsWith('🔶') || normalized.startsWith('🟡')) {
      return 'Partial';
    }
    if (normalized.includes('open') || normalized.startsWith('❌') || normalized.startsWith('🔴')) {
      return 'Open';
    }
    if (normalized.includes('blocked') || normalized.startsWith('🚫') || normalized.startsWith('⚫')) {
      return 'Blocked';
    }
    if (normalized.includes('false positive') || normalized.includes('falsepositive')) {
      return 'FalsePositive';
    }

    return null;
  }
}
