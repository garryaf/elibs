/**
 * Interface contract for cross-module queries into Settings.
 *
 * Consuming modules should depend on this interface rather than
 * accessing PrismaService directly for settings lookups.
 */

export interface ISettingsQueryService {
  getSetting(key: string): Promise<string | null>;
  getSettingsByPrefix(prefix: string): Promise<Record<string, string>>;
}

/**
 * Injection token for ISettingsQueryService.
 * Use with @Inject(SETTINGS_QUERY_SERVICE) in consuming modules.
 */
export const SETTINGS_QUERY_SERVICE = 'SETTINGS_QUERY_SERVICE';
