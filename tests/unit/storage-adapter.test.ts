import { describe, expect, it, vi, beforeEach } from "vitest";

import { UserPreferences } from "../../src/core/domain/preferences/user-preferences";

// Mock the WXT `browser` module
const mockStorage: Record<string, unknown> = {};

const getMock = vi.fn(async (key: string) => {
  return { [key]: mockStorage[key] };
});

const setMock = vi.fn(async (items: Record<string, unknown>) => {
  Object.assign(mockStorage, items);
});

vi.mock("wxt/browser", () => ({
  browser: {
    storage: {
      local: {
        get: (...args: unknown[]) => getMock(...(args as [string])),
        set: (...args: unknown[]) =>
          setMock(...(args as [Record<string, unknown>])),
      },
    },
  },
}));

// Import after mocking
const { StorageAdapter } =
  await import("../../src/extension/adapters/storage-adapter");

const DEFAULTS = UserPreferences.createDefault();

beforeEach(() => {
  // Clear storage between tests
  for (const key of Object.keys(mockStorage)) {
    delete mockStorage[key];
  }
  vi.clearAllMocks();
});

describe("StorageAdapter", () => {
  const adapter = new StorageAdapter();

  describe("load", () => {
    it("returns defaults when storage is empty", async () => {
      const result = await adapter.load();
      expect(result.toJSON()).toEqual(DEFAULTS.toJSON());
    });

    it("returns stored preferences", async () => {
      const custom = UserPreferences.create({
        ...DEFAULTS.toJSON(),
        topK: 15,
        temperature: 1.0,
        presetMode: "creative",
      });
      mockStorage["userPreferences"] = custom.toJSON();

      const result = await adapter.load();
      expect(result.topK).toBe(15);
      expect(result.temperature).toBe(1.0);
      expect(result.presetMode).toBe("creative");
    });

    it("merges new fields with defaults (schema migration)", async () => {
      // Simulate an old stored value that lacks display settings
      const json = DEFAULTS.toJSON();
      const oldStored = {
        enabled: json.enabled,
        acceptKey: json.acceptKey,
        presetMode: json.presetMode,
        topK: json.topK,
        temperature: json.temperature,
        context: json.context,
        skip: json.skip,
        // display is missing — should be filled from defaults
      };
      mockStorage["userPreferences"] = oldStored;

      const result = await adapter.load();
      expect(result.display).toEqual(DEFAULTS.display);
    });

    it("falls back to defaults on invalid data", async () => {
      mockStorage["userPreferences"] = {
        ...DEFAULTS.toJSON(),
        topK: -999, // invalid
      };

      const result = await adapter.load();
      expect(result.toJSON()).toEqual(DEFAULTS.toJSON());
    });

    it("falls back to defaults when storage throws", async () => {
      getMock.mockRejectedValueOnce(new Error("denied"));

      const result = await adapter.load();
      expect(result.toJSON()).toEqual(DEFAULTS.toJSON());
    });
  });

  describe("save", () => {
    it("persists valid preferences as plain object", async () => {
      const custom = DEFAULTS.applyPreset("simple").withTopK(3);

      await adapter.save(custom);
      expect(setMock).toHaveBeenCalledWith({
        userPreferences: custom.toJSON(),
      });
    });

    it("save result is a plain object (not a class instance)", async () => {
      await adapter.save(DEFAULTS);
      const arg = setMock.mock.calls[0][0] as Record<string, unknown>;
      const stored = arg["userPreferences"] as Record<string, unknown>;
      expect(stored.constructor).toBe(Object);
    });
  });
});
