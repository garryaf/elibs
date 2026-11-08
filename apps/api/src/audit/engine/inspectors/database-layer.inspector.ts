import * as fs from 'fs';
import * as path from 'path';
import { InspectionTarget, LayerTrace } from '../interfaces';

// ---------------------------------------------------------------------------
// Parsed Schema Types
// ---------------------------------------------------------------------------

/** Represents a parsed field from a Prisma model */
export interface ParsedField {
  name: string;
  type: string;
  isOptional: boolean;
  isRelation: boolean;
  hasUnique: boolean;
  relationTarget?: string;
  modifiers: string;
}

/** Represents a parsed model from the Prisma schema */
export interface ParsedModel {
  name: string;
  fields: ParsedField[];
  uniqueConstraints: string[][];
  indexes: string[][];
  tableName?: string;
}

/** Represents a parsed enum from the Prisma schema */
export interface ParsedEnum {
  name: string;
  values: string[];
}

/** Complete parsed schema result */
export interface ParsedSchema {
  models: ParsedModel[];
  enums: ParsedEnum[];
}

// ---------------------------------------------------------------------------
// Regex Patterns
// ---------------------------------------------------------------------------

/** Matches model blocks: model ModelName { ... } */
const MODEL_BLOCK_REGEX = /model\s+(\w+)\s*\{([^}]*)\}/gs;

/** Matches enum blocks: enum EnumName { ... } */
const ENUM_BLOCK_REGEX = /enum\s+(\w+)\s*\{([^}]*)\}/gs;

/** Matches @@unique([field1, field2]) constraints */
const UNIQUE_CONSTRAINT_REGEX = /@@unique\(\[([^\]]+)\]\)/g;

/** Matches @@index([field1, field2]) */
const INDEX_CONSTRAINT_REGEX = /@@index\(\[([^\]]+)\]\)/g;

/** Matches @@map("table_name") */
const MAP_REGEX = /@@map\(["']([^"']+)["']\)/;

/** Matches @relation(...) on a field */
const RELATION_REGEX = /@relation\(/;

/** Matches @unique on a field line */
const FIELD_UNIQUE_REGEX = /@unique/;

// ---------------------------------------------------------------------------
// DatabaseLayerInspector
// ---------------------------------------------------------------------------

/**
 * DatabaseLayerInspector parses the Prisma schema file to determine if
 * database-layer artifacts exist for a given business process.
 *
 * It performs:
 * - Model definition extraction (name, fields, types, relations)
 * - Constraint detection (@@unique, @@index, @unique)
 * - Enum extraction
 * - Required artifact validation against parsed schema
 *
 * The inspector uses regex-based parsing (not full AST) for speed and simplicity.
 */
export class DatabaseLayerInspector {
  /**
   * Inspects the DATABASE layer for a given inspection target.
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

    // Step 1: Resolve schema file path
    const schemaPath = this.resolveSchemaPath(target, projectRoot);

    if (!fs.existsSync(schemaPath)) {
      return {
        layer: 'DATABASE',
        status: 'ABSENT',
        evidence: `Prisma schema not found at: ${schemaPath}`,
        issues: ['Schema file does not exist'],
      };
    }

    // Step 2: Read and parse schema
    let schemaContent: string;
    try {
      schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    } catch (err) {
      return {
        layer: 'DATABASE',
        status: 'ABSENT',
        evidence: `Failed to read Prisma schema: ${(err as Error).message}`,
        issues: [`Read error: ${(err as Error).message}`],
      };
    }

    let parsedSchema: ParsedSchema;
    try {
      parsedSchema = this.parseSchema(schemaContent);
    } catch (err) {
      return {
        layer: 'DATABASE',
        status: 'ABSENT',
        evidence: `Failed to parse Prisma schema: ${(err as Error).message}`,
        issues: [`Parse error: ${(err as Error).message}`],
      };
    }

    // Step 3: Validate required artifacts against parsed schema
    const { requiredArtifacts } = target;

    if (requiredArtifacts.length === 0) {
      // No specific artifacts required, schema existence is sufficient
      return {
        layer: 'DATABASE',
        status: 'PRESENT',
        filePath: schemaPath,
        evidence: `Schema found with ${parsedSchema.models.length} models, ${parsedSchema.enums.length} enums`,
      };
    }

    let foundCount = 0;
    const lineReferences: number[] = [];
    const lines = schemaContent.split('\n');

    for (const artifact of requiredArtifacts) {
      let regex: RegExp;
      try {
        regex = new RegExp(artifact.searchPattern, 'm');
      } catch (err) {
        issues.push(
          `Invalid regex "${artifact.searchPattern}": ${(err as Error).message}`,
        );
        continue;
      }

      const match = regex.exec(schemaContent);
      if (match) {
        foundCount++;
        // Calculate line number from match index
        const lineNumber = schemaContent
          .substring(0, match.index)
          .split('\n').length;
        lineReferences.push(lineNumber);
      }
    }

    // Step 4: Determine status
    const status = this.determineStatus(foundCount, requiredArtifacts.length);

    return {
      layer: 'DATABASE',
      status,
      filePath: schemaPath,
      lineReferences: lineReferences.length > 0 ? lineReferences : undefined,
      evidence: `Found ${foundCount}/${requiredArtifacts.length} required artifacts in schema (${parsedSchema.models.length} models, ${parsedSchema.enums.length} enums)`,
      issues: issues.length > 0 ? issues : undefined,
    };
  }

  // -------------------------------------------------------------------------
  // Schema Parsing
  // -------------------------------------------------------------------------

  /**
   * Parses the full Prisma schema content into structured models and enums.
   */
  parseSchema(content: string): ParsedSchema {
    const models = this.parseModels(content);
    const enums = this.parseEnums(content);
    return { models, enums };
  }

  /**
   * Extracts all model definitions from the schema content.
   */
  private parseModels(content: string): ParsedModel[] {
    const models: ParsedModel[] = [];

    // Reset regex lastIndex for global patterns
    MODEL_BLOCK_REGEX.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = MODEL_BLOCK_REGEX.exec(content)) !== null) {
      const modelName = match[1];
      const modelBody = match[2];

      const fields = this.parseFields(modelBody);
      const uniqueConstraints = this.parseUniqueConstraints(modelBody);
      const indexes = this.parseIndexes(modelBody);
      const tableName = this.parseTableName(modelBody);

      models.push({
        name: modelName,
        fields,
        uniqueConstraints,
        indexes,
        tableName,
      });
    }

    return models;
  }

  /**
   * Extracts fields from a model body string.
   * Each field line has the format: `fieldName FieldType modifiers`
   */
  private parseFields(modelBody: string): ParsedField[] {
    const fields: ParsedField[] = [];
    const lines = modelBody.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines, comments, and constraint lines (@@unique, @@index, @@map)
      if (
        !trimmed ||
        trimmed.startsWith('//') ||
        trimmed.startsWith('///') ||
        trimmed.startsWith('@@')
      ) {
        continue;
      }

      // Parse field: fieldName Type? @modifiers
      // Field pattern: word, whitespace, word (optionally with ? or [])
      const fieldMatch = trimmed.match(/^(\w+)\s+(\w+)(\[\])?([\s?].*)?$/);
      if (!fieldMatch) {
        continue;
      }

      const fieldName = fieldMatch[1];
      const fieldType = fieldMatch[2] + (fieldMatch[3] || '');
      const modifiers = fieldMatch[4] || '';
      const isOptional =
        modifiers.includes('?') || trimmed.includes(`${fieldType}?`);
      const isRelation = RELATION_REGEX.test(trimmed);
      const hasUnique = FIELD_UNIQUE_REGEX.test(trimmed);

      let relationTarget: string | undefined;
      if (isRelation) {
        // The field type is the related model name for relation fields
        relationTarget = fieldType.replace('[]', '').replace('?', '');
      }

      fields.push({
        name: fieldName,
        type: fieldType,
        isOptional,
        isRelation,
        hasUnique,
        relationTarget,
        modifiers: modifiers.trim(),
      });
    }

    return fields;
  }

  /**
   * Extracts @@unique([...]) constraints from a model body.
   */
  private parseUniqueConstraints(modelBody: string): string[][] {
    const constraints: string[][] = [];
    UNIQUE_CONSTRAINT_REGEX.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = UNIQUE_CONSTRAINT_REGEX.exec(modelBody)) !== null) {
      const fields = match[1].split(',').map((f) => f.trim());
      constraints.push(fields);
    }

    return constraints;
  }

  /**
   * Extracts @@index([...]) definitions from a model body.
   */
  private parseIndexes(modelBody: string): string[][] {
    const indexes: string[][] = [];
    INDEX_CONSTRAINT_REGEX.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = INDEX_CONSTRAINT_REGEX.exec(modelBody)) !== null) {
      const fields = match[1].split(',').map((f) => f.trim());
      indexes.push(fields);
    }

    return indexes;
  }

  /**
   * Extracts @@map("table_name") from a model body.
   */
  private parseTableName(modelBody: string): string | undefined {
    const match = MAP_REGEX.exec(modelBody);
    return match ? match[1] : undefined;
  }

  /**
   * Extracts all enum definitions from the schema content.
   */
  private parseEnums(content: string): ParsedEnum[] {
    const enums: ParsedEnum[] = [];
    ENUM_BLOCK_REGEX.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = ENUM_BLOCK_REGEX.exec(content)) !== null) {
      const enumName = match[1];
      const enumBody = match[2];

      const values = enumBody
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('//'));

      enums.push({ name: enumName, values });
    }

    return enums;
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /**
   * Resolves the schema file path from the target patterns or defaults.
   * Looks for a pattern with purpose containing "schema" or "prisma",
   * otherwise defaults to `apps/api/prisma/schema.prisma`.
   */
  private resolveSchemaPath(
    target: InspectionTarget,
    projectRoot: string,
  ): string {
    // Check if any pattern points to a schema file
    for (const pattern of target.patterns) {
      if (
        pattern.purpose.toLowerCase().includes('schema') ||
        pattern.purpose.toLowerCase().includes('prisma') ||
        pattern.glob.includes('schema.prisma')
      ) {
        // Extract the file path from the glob (strip wildcards)
        const cleanPath = pattern.glob.replace(/\*\*/g, '').replace(/\*/g, '');
        if (cleanPath.endsWith('.prisma')) {
          return path.resolve(projectRoot, cleanPath);
        }
      }
    }

    // Default path
    return path.resolve(projectRoot, 'apps/api/prisma/schema.prisma');
  }

  /**
   * Determines layer status based on how many required artifacts were found.
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
