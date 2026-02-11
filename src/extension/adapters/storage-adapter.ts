/**
 * Infrastructure: PreferencesRepository implementation using chrome.storage.local.
 *
 * Persists UserPreferences to browser extension storage.
 * Never stores user text or AI prompt data — only configuration values.
 */

import type { PreferencesRepository } from '../../core/ports/preferences-repository';
import { UserPreferences } from '../../core/domain/preferences/user-preferences';
import { browser } from 'wxt/browser';

const STORAGE_KEY = 'userPreferences';

export class StorageAdapter implements PreferencesRepository {
    async load(): Promise<UserPreferences> {
        try {
            const result = await browser.storage.local.get(STORAGE_KEY);
            const raw = result[STORAGE_KEY];
            // fromJSON handles null/undefined, merges partial data, and validates
            return UserPreferences.fromJSON(raw);
        } catch {
            return UserPreferences.createDefault();
        }
    }

    async save(prefs: UserPreferences): Promise<void> {
        // Serialize to plain object before persisting
        await browser.storage.local.set({ [STORAGE_KEY]: prefs.toJSON() });
    }
}
