import type { UserPreferences } from '../domain/preferences/user-preferences';

export interface PreferencesRepository {
  load(): Promise<UserPreferences>;
  save(prefs: UserPreferences): Promise<void>;
}
