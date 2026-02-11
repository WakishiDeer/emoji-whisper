import { describe, expect, it, vi, beforeEach } from 'vitest';

import { DEFAULT_USER_PREFERENCES } from '../../src/core/domain/preferences/user-preferences';
import type { UserPreferences } from '../../src/core/domain/preferences/user-preferences';

// Mock the WXT `browser` module
const mockStorage: Record<string, unknown> = {};

const getMock = vi.fn(async (key: string) => {
    return { [key]: mockStorage[key] };
});

const setMock = vi.fn(async (items: Record<string, unknown>) => {
    Object.assign(mockStorage, items);
});

vi.mock('wxt/browser', () => ({
    browser: {
        storage: {
            local: {
                get: (...args: unknown[]) => getMock(...(args as [string])),
                set: (...args: unknown[]) => setMock(...(args as [Record<string, unknown>])),
            },
        },
    },
}));

// Import after mocking
const { StorageAdapter } = await import('../../src/extension/adapters/storage-adapter');

beforeEach(() => {
    // Clear storage between tests
    for (const key of Object.keys(mockStorage)) {
        delete mockStorage[key];
    }
    vi.clearAllMocks();
});

describe('StorageAdapter', () => {
    const adapter = new StorageAdapter();

    describe('load', () => {
        it('returns defaults when storage is empty', async () => {
            const result = await adapter.load();
            expect(result).toEqual(DEFAULT_USER_PREFERENCES);
        });

        it('returns stored preferences', async () => {
            const custom: UserPreferences = {
                ...DEFAULT_USER_PREFERENCES,
                topK: 15,
                temperature: 1.0,
                presetMode: 'creative',
            };
            mockStorage['userPreferences'] = custom;

            const result = await adapter.load();
            expect(result.topK).toBe(15);
            expect(result.temperature).toBe(1.0);
            expect(result.presetMode).toBe('creative');
        });

        it('merges new fields with defaults (schema migration)', async () => {
            // Simulate an old stored value that lacks display settings
            const oldStored = {
                enabled: true,
                acceptKey: 'Tab',
                presetMode: 'balanced',
                topK: 8,
                temperature: 0.7,
                context: DEFAULT_USER_PREFERENCES.context,
                skip: DEFAULT_USER_PREFERENCES.skip,
                // display is missing — should be filled from defaults
            };
            mockStorage['userPreferences'] = oldStored;

            const result = await adapter.load();
            expect(result.display).toEqual(DEFAULT_USER_PREFERENCES.display);
        });

        it('falls back to defaults on invalid data', async () => {
            mockStorage['userPreferences'] = {
                ...DEFAULT_USER_PREFERENCES,
                topK: -999, // invalid
            };

            const result = await adapter.load();
            expect(result).toEqual(DEFAULT_USER_PREFERENCES);
        });

        it('falls back to defaults when storage throws', async () => {
            getMock.mockRejectedValueOnce(new Error('denied'));

            const result = await adapter.load();
            expect(result).toEqual(DEFAULT_USER_PREFERENCES);
        });
    });

    describe('save', () => {
        it('persists valid preferences', async () => {
            const custom: UserPreferences = {
                ...DEFAULT_USER_PREFERENCES,
                topK: 3,
                presetMode: 'simple',
            };

            await adapter.save(custom);
            expect(setMock).toHaveBeenCalledWith({
                userPreferences: custom,
            });
        });

        it('rejects invalid preferences', async () => {
            const invalid = {
                ...DEFAULT_USER_PREFERENCES,
                topK: 0, // invalid
            } as UserPreferences;

            await expect(adapter.save(invalid)).rejects.toThrow('topK must be between 1 and 40');
        });
    });
});
