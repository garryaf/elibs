import { Prisma } from '@prisma/client';
import { CryptoService } from '../crypto/crypto.service';

/**
 * PII Encryption Extension for Prisma Client.
 *
 * Transparently encrypts/decrypts the `nik` field on the Patient model:
 * - On create/update: encrypts `nik` if not already encrypted
 * - On find results: decrypts `nik` before returning to application
 * - On where clauses containing `nik`: encrypts filter value before query execution
 */
export function createPiiEncryptionExtension(cryptoService: CryptoService) {
  return Prisma.defineExtension({
    name: 'pii-encryption',
    query: {
      patient: {
        async create({ args, query }) {
          args.data = encryptNikInData(args.data, cryptoService);
          const result = await query(args);
          return decryptNikInResult(result, cryptoService);
        },

        async createMany({ args, query }) {
          if (Array.isArray(args.data)) {
            args.data = args.data.map((item) =>
              encryptNikInData(item, cryptoService),
            );
          } else {
            args.data = encryptNikInData(args.data, cryptoService);
          }
          return query(args);
        },

        async update({ args, query }) {
          if (args.data) {
            args.data = encryptNikInData(args.data, cryptoService);
          }
          if (args.where) {
            args.where = encryptNikInWhere(args.where, cryptoService);
          }
          const result = await query(args);
          return decryptNikInResult(result, cryptoService);
        },

        async updateMany({ args, query }) {
          if (args.data) {
            args.data = encryptNikInData(args.data, cryptoService);
          }
          if (args.where) {
            args.where = encryptNikInWhere(args.where, cryptoService);
          }
          return query(args);
        },

        async upsert({ args, query }) {
          if (args.create) {
            args.create = encryptNikInData(args.create, cryptoService);
          }
          if (args.update) {
            args.update = encryptNikInData(args.update, cryptoService);
          }
          if (args.where) {
            args.where = encryptNikInWhere(args.where, cryptoService);
          }
          const result = await query(args);
          return decryptNikInResult(result, cryptoService);
        },

        async findUnique({ args, query }) {
          if (args.where) {
            args.where = encryptNikInWhere(args.where, cryptoService);
          }
          const result = await query(args);
          return decryptNikInResult(result, cryptoService);
        },

        async findUniqueOrThrow({ args, query }) {
          if (args.where) {
            args.where = encryptNikInWhere(args.where, cryptoService);
          }
          const result = await query(args);
          return decryptNikInResult(result, cryptoService);
        },

        async findFirst({ args, query }) {
          if (args.where) {
            args.where = encryptNikInWhere(args.where, cryptoService);
          }
          const result = await query(args);
          return decryptNikInResult(result, cryptoService);
        },

        async findFirstOrThrow({ args, query }) {
          if (args.where) {
            args.where = encryptNikInWhere(args.where, cryptoService);
          }
          const result = await query(args);
          return decryptNikInResult(result, cryptoService);
        },

        async findMany({ args, query }) {
          if (args.where) {
            args.where = encryptNikInWhere(args.where, cryptoService);
          }
          const results = await query(args);
          if (Array.isArray(results)) {
            return results.map((result) =>
              decryptNikInResult(result, cryptoService),
            );
          }
          return results;
        },

        async delete({ args, query }) {
          if (args.where) {
            args.where = encryptNikInWhere(args.where, cryptoService);
          }
          const result = await query(args);
          return decryptNikInResult(result, cryptoService);
        },

        async deleteMany({ args, query }) {
          if (args.where) {
            args.where = encryptNikInWhere(args.where, cryptoService);
          }
          return query(args);
        },
      },
    },
  });
}

/**
 * Encrypt the `nik` field in a data object (create/update payload).
 * Skips encryption if the value is already encrypted.
 */
function encryptNikInData<T extends Record<string, unknown>>(
  data: T,
  cryptoService: CryptoService,
): T {
  if (!data || typeof data !== 'object') return data;

  const nikValue = extractStringValue(data['nik']);
  if (nikValue && !cryptoService.isEncrypted(nikValue)) {
    return { ...data, nik: cryptoService.encrypt(nikValue) };
  }
  return data;
}

/**
 * Encrypt `nik` values in where clauses so that equality/contains queries
 * match the encrypted database values.
 */
function encryptNikInWhere<T extends Record<string, unknown>>(
  where: T,
  cryptoService: CryptoService,
): T {
  if (!where || typeof where !== 'object') return where;

  const result = { ...where };

  if ('nik' in result && result['nik'] !== undefined) {
    const nikFilter = result['nik'];

    if (typeof nikFilter === 'string') {
      // Direct equality: where: { nik: "value" }
      if (!cryptoService.isEncrypted(nikFilter)) {
        (result as Record<string, unknown>)['nik'] =
          cryptoService.encrypt(nikFilter);
      }
    } else if (nikFilter && typeof nikFilter === 'object') {
      // Prisma filter objects: { equals: "value" }, { in: [...] }, etc.
      const filterObj = { ...(nikFilter as Record<string, unknown>) };

      if (
        'equals' in filterObj &&
        typeof filterObj['equals'] === 'string' &&
        !cryptoService.isEncrypted(filterObj['equals'])
      ) {
        filterObj['equals'] = cryptoService.encrypt(filterObj['equals']);
      }

      if ('in' in filterObj && Array.isArray(filterObj['in'])) {
        filterObj['in'] = filterObj['in'].map((val: unknown) => {
          if (typeof val === 'string' && !cryptoService.isEncrypted(val)) {
            return cryptoService.encrypt(val);
          }
          return val;
        });
      }

      if ('not' in filterObj) {
        const notVal = filterObj['not'];
        if (
          typeof notVal === 'string' &&
          !cryptoService.isEncrypted(notVal)
        ) {
          filterObj['not'] = cryptoService.encrypt(notVal);
        }
      }

      (result as Record<string, unknown>)['nik'] = filterObj;
    }
  }

  // Handle AND, OR, NOT compound conditions
  if ('AND' in result && Array.isArray(result['AND'])) {
    (result as Record<string, unknown>)['AND'] = (
      result['AND'] as Record<string, unknown>[]
    ).map((condition) => encryptNikInWhere(condition, cryptoService));
  }

  if ('OR' in result && Array.isArray(result['OR'])) {
    (result as Record<string, unknown>)['OR'] = (
      result['OR'] as Record<string, unknown>[]
    ).map((condition) => encryptNikInWhere(condition, cryptoService));
  }

  if (
    'NOT' in result &&
    result['NOT'] !== null &&
    typeof result['NOT'] === 'object'
  ) {
    if (Array.isArray(result['NOT'])) {
      (result as Record<string, unknown>)['NOT'] = (
        result['NOT'] as Record<string, unknown>[]
      ).map((condition) => encryptNikInWhere(condition, cryptoService));
    } else {
      (result as Record<string, unknown>)['NOT'] = encryptNikInWhere(
        result['NOT'] as Record<string, unknown>,
        cryptoService,
      );
    }
  }

  return result;
}

/**
 * Decrypt the `nik` field in a query result.
 * Handles null results gracefully.
 */
function decryptNikInResult<T>(
  result: T,
  cryptoService: CryptoService,
): T {
  if (!result || typeof result !== 'object') return result;

  const record = result as Record<string, unknown>;
  if ('nik' in record && typeof record['nik'] === 'string') {
    if (cryptoService.isEncrypted(record['nik'])) {
      try {
        return { ...record, nik: cryptoService.decrypt(record['nik']) } as T;
      } catch {
        // If decryption fails (corrupted data), return masked value
        return { ...record, nik: cryptoService.maskNik(record['nik']) } as T;
      }
    }
  }

  return result;
}

/**
 * Extract a plain string value from a Prisma field value
 * (handles both plain strings and Prisma's `{ set: string }` pattern).
 */
function extractStringValue(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (
    value &&
    typeof value === 'object' &&
    'set' in (value as Record<string, unknown>)
  ) {
    const setVal = (value as Record<string, unknown>)['set'];
    if (typeof setVal === 'string') return setVal;
  }
  return null;
}
