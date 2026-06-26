/**
 * Infrastructure: PreferencesRepository implementation using chrome.storage.local.
 *
 * Persists UserPreferences to browser extension storage.
 * Never stores user text or AI prompt data — only configuration values.
 */

import type { PreferencesRepository } from '../../core/ports/preferences-repository';
import type { UserPreferences } from '../../core/domain/preferences/user-preferences';
import { DEFAULT_USER_PREFERENCES, createUserPreferences } from '../../core/domain/preferences/user-preferences';
import { browser } from 'wxt/browser';

const STORAGE_KEY = 'userPreferences';

export class StorageAdapter implements PreferencesRepository {
    async load(): Promise<UserPreferences> {
        try {
            const result = await browser.storage.local.get(STORAGE_KEY);
            const raw = result[STORAGE_KEY];
            if (!raw || typeof raw !== 'object') return DEFAULT_USER_PREFERENCES;

            // Merge saved values over defaults to handle schema migrations
            // (new fields get default values automatically)
            const merged: UserPreferences = {
                ...DEFAULT_USER_PREFERENCES,
                ...(raw as Partial<UserPreferences>),
                context: {
                    ...DEFAULT_USER_PREFERENCES.context,
                    ...((raw as Partial<UserPreferences>).context ?? {}),
                    sentenceContext: {
                        ...DEFAULT_USER_PREFERENCES.context.sentenceContext,
                        ...(((raw as Partial<UserPreferences>).context as Record<string, unknown>)
                            ?.sentenceContext as Record<string, unknown> ?? {}),
                    },
                },
                skip: {
                    ...DEFAULT_USER_PREFERENCES.skip,
                    ...((raw as Partial<UserPreferences>).skip ?? {}),
                },
                display: {
                    ...DEFAULT_USER_PREFERENCES.display,
                    ...((raw as Partial<UserPreferences>).display ?? {}),
                },
            };

            // Validate the merged result; fall back to defaults if invalid
            return createUserPreferences(merged);
        } catch {
            return DEFAULT_USER_PREFERENCES;
        }
    }

    async save(prefs: UserPreferences): Promise<void> {
        // Validate before persisting
        createUserPreferences(prefs);
        await browser.storage.local.set({ [STORAGE_KEY]: prefs });
    }
}
