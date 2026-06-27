import { describe, expect, it } from "vitest";

import {
  createUserPreferences,
  DEFAULT_USER_PREFERENCES,
  UserPreferences,
} from "../../src/core/domain/preferences/user-preferences";
import type { UserPreferencesInput } from "../../src/core/domain/preferences/user-preferences";
import {
  SIMPLE_PRESET,
  CREATIVE_PRESET,
} from "../../src/core/domain/preferences/preset-mode";

describe("createUserPreferences", () => {
  it("accepts valid preferences", () => {
    expect(() => createUserPreferences(DEFAULT_USER_PREFERENCES)).not.toThrow();
  });

  it("rejects unsupported acceptKey", () => {
    expect(() =>
      createUserPreferences({
        ...DEFAULT_USER_PREFERENCES,
        acceptKey: "Enter" as "Tab",
      }),
    ).toThrow("Invalid acceptKey");
  });

  it("rejects invalid context settings", () => {
    expect(() =>
      createUserPreferences({
        ...DEFAULT_USER_PREFERENCES,
        context: {
          ...DEFAULT_USER_PREFERENCES.context,
          minContextLength: 0,
        },
      }),
    ).toThrow("minContextLength must be > 0");

    expect(() =>
      createUserPreferences({
        ...DEFAULT_USER_PREFERENCES,
        context: {
          ...DEFAULT_USER_PREFERENCES.context,
          minContextLength: 10,
          maxContextLength: 5,
        },
      }),
    ).toThrow("maxContextLength must be >= minContextLength");

    expect(() =>
      createUserPreferences({
        ...DEFAULT_USER_PREFERENCES,
        context: {
          ...DEFAULT_USER_PREFERENCES.context,
          maxContextLength: 2000,
        },
      }),
    ).toThrow("maxContextLength must be <= 1000");
  });

  it("rejects invalid contextMode", () => {
    expect(() =>
      createUserPreferences({
        ...DEFAULT_USER_PREFERENCES,
        context: {
          ...DEFAULT_USER_PREFERENCES.context,
          contextMode: "invalid" as "sentences",
        },
      }),
    ).toThrow('contextMode must be "characters" or "sentences"');
  });

  it("rejects negative beforeSentenceCount", () => {
    expect(() =>
      createUserPreferences({
        ...DEFAULT_USER_PREFERENCES,
        context: {
          ...DEFAULT_USER_PREFERENCES.context,
          sentenceContext: {
            ...DEFAULT_USER_PREFERENCES.context.sentenceContext,
            beforeSentenceCount: -1,
          },
        },
      }),
    ).toThrow("beforeSentenceCount must be >= 0");
  });

  it("rejects beforeSentenceCount > 10", () => {
    expect(() =>
      createUserPreferences({
        ...DEFAULT_USER_PREFERENCES,
        context: {
          ...DEFAULT_USER_PREFERENCES.context,
          sentenceContext: {
            ...DEFAULT_USER_PREFERENCES.context.sentenceContext,
            beforeSentenceCount: 11,
          },
        },
      }),
    ).toThrow("beforeSentenceCount must be <= 10");
  });

  it("rejects negative afterSentenceCount", () => {
    expect(() =>
      createUserPreferences({
        ...DEFAULT_USER_PREFERENCES,
        context: {
          ...DEFAULT_USER_PREFERENCES.context,
          sentenceContext: {
            ...DEFAULT_USER_PREFERENCES.context.sentenceContext,
            afterSentenceCount: -1,
          },
        },
      }),
    ).toThrow("afterSentenceCount must be >= 0");
  });

  it("rejects afterSentenceCount > 10", () => {
    expect(() =>
      createUserPreferences({
        ...DEFAULT_USER_PREFERENCES,
        context: {
          ...DEFAULT_USER_PREFERENCES.context,
          sentenceContext: {
            ...DEFAULT_USER_PREFERENCES.context.sentenceContext,
            afterSentenceCount: 11,
          },
        },
      }),
    ).toThrow("afterSentenceCount must be <= 10");
  });

  it("rejects empty cursorMarker", () => {
    expect(() =>
      createUserPreferences({
        ...DEFAULT_USER_PREFERENCES,
        context: {
          ...DEFAULT_USER_PREFERENCES.context,
          sentenceContext: {
            ...DEFAULT_USER_PREFERENCES.context.sentenceContext,
            cursorMarker: "",
          },
        },
      }),
    ).toThrow("cursorMarker must not be empty");
  });

  it("rejects cursorMarker > 20 characters", () => {
    expect(() =>
      createUserPreferences({
        ...DEFAULT_USER_PREFERENCES,
        context: {
          ...DEFAULT_USER_PREFERENCES.context,
          sentenceContext: {
            ...DEFAULT_USER_PREFERENCES.context.sentenceContext,
            cursorMarker: "A".repeat(21),
          },
        },
      }),
    ).toThrow("cursorMarker must be <= 20 characters");
  });

  it("skips sentence validation when contextMode is characters", () => {
    // Should not throw even with invalid-looking sentence settings
    // because sentence mode is not active
    expect(() =>
      createUserPreferences({
        ...DEFAULT_USER_PREFERENCES,
        context: {
          ...DEFAULT_USER_PREFERENCES.context,
          contextMode: "characters",
        },
      }),
    ).not.toThrow();
  });

  // --- topK validation ---

  it("rejects topK < 1", () => {
    expect(() =>
      createUserPreferences({ ...DEFAULT_USER_PREFERENCES, topK: 0 }),
    ).toThrow("topK must be between 1 and 40");
  });

  it("rejects topK > 40", () => {
    expect(() =>
      createUserPreferences({ ...DEFAULT_USER_PREFERENCES, topK: 41 }),
    ).toThrow("topK must be between 1 and 40");
  });

  it("rejects non-integer topK", () => {
    expect(() =>
      createUserPreferences({ ...DEFAULT_USER_PREFERENCES, topK: 3.5 }),
    ).toThrow("topK must be an integer");
  });

  it("accepts topK at boundaries", () => {
    expect(() =>
      createUserPreferences({ ...DEFAULT_USER_PREFERENCES, topK: 1 }),
    ).not.toThrow();
    expect(() =>
      createUserPreferences({ ...DEFAULT_USER_PREFERENCES, topK: 40 }),
    ).not.toThrow();
  });

  // --- temperature validation ---

  it("rejects temperature < 0", () => {
    expect(() =>
      createUserPreferences({ ...DEFAULT_USER_PREFERENCES, temperature: -0.1 }),
    ).toThrow("temperature must be between 0.0 and 2.0");
  });

  it("rejects temperature > 2.0", () => {
    expect(() =>
      createUserPreferences({ ...DEFAULT_USER_PREFERENCES, temperature: 2.1 }),
    ).toThrow("temperature must be between 0.0 and 2.0");
  });

  it("accepts temperature at boundaries", () => {
    expect(() =>
      createUserPreferences({ ...DEFAULT_USER_PREFERENCES, temperature: 0 }),
    ).not.toThrow();
    expect(() =>
      createUserPreferences({ ...DEFAULT_USER_PREFERENCES, temperature: 2.0 }),
    ).not.toThrow();
  });

  // --- presetMode validation ---

  it("rejects invalid presetMode", () => {
    expect(() =>
      createUserPreferences({
        ...DEFAULT_USER_PREFERENCES,
        presetMode: "invalid" as "balanced",
      }),
    ).toThrow("Invalid presetMode");
  });

  it("accepts all valid preset modes", () => {
    for (const mode of ["simple", "balanced", "creative", "custom"] as const) {
      expect(() =>
        createUserPreferences({
          ...DEFAULT_USER_PREFERENCES,
          presetMode: mode,
        }),
      ).not.toThrow();
    }
  });

  // --- display settings ---

  it("preserves display settings in defaults", () => {
    const prefs = createUserPreferences(DEFAULT_USER_PREFERENCES);
    expect(prefs.display).toEqual({
      showUnavailableToast: true,
      showReasonTooltip: true,
    });
  });
});

// ===========================================================================
// Class API tests (ADR 0014)
// ===========================================================================

describe("UserPreferences class", () => {
  // ---------------------------------------------------------------------------
  // Static factories
  // ---------------------------------------------------------------------------

  describe("create", () => {
    it("returns a UserPreferences instance", () => {
      const prefs = UserPreferences.create(
        UserPreferences.createDefault().toJSON(),
      );
      expect(prefs).toBeInstanceOf(UserPreferences);
    });

    it("throws on invalid input", () => {
      expect(() =>
        UserPreferences.create({
          ...UserPreferences.createDefault().toJSON(),
          topK: -1,
        }),
      ).toThrow();
    });
  });

  describe("createDefault", () => {
    it("returns a valid instance with balanced defaults", () => {
      const prefs = UserPreferences.createDefault();
      expect(prefs).toBeInstanceOf(UserPreferences);
      expect(prefs.enabled).toBe(true);
      expect(prefs.acceptKey).toBe("Tab");
      expect(prefs.presetMode).toBe("balanced");
      expect(prefs.topK).toBe(8);
      expect(prefs.temperature).toBe(0.7);
    });
  });

  describe("fromJSON", () => {
    it("returns defaults for null", () => {
      const prefs = UserPreferences.fromJSON(null);
      expect(prefs.toJSON()).toEqual(UserPreferences.createDefault().toJSON());
    });

    it("returns defaults for undefined", () => {
      const prefs = UserPreferences.fromJSON(undefined);
      expect(prefs.toJSON()).toEqual(UserPreferences.createDefault().toJSON());
    });

    it("returns defaults for non-object", () => {
      const prefs = UserPreferences.fromJSON("not-an-object");
      expect(prefs.toJSON()).toEqual(UserPreferences.createDefault().toJSON());
    });

    it("merges partial data over defaults (schema migration)", () => {
      const prefs = UserPreferences.fromJSON({ topK: 3 });
      expect(prefs.topK).toBe(3);
      // Other fields should be defaults
      expect(prefs.temperature).toBe(0.7);
      expect(prefs.presetMode).toBe("balanced");
    });

    it("handles partial nested context", () => {
      const prefs = UserPreferences.fromJSON({
        context: { maxContextLength: 100 },
      });
      expect(prefs.context.maxContextLength).toBe(100);
      expect(prefs.context.minContextLength).toBe(5); // default preserved
    });

    it("handles partial sentenceContext", () => {
      const prefs = UserPreferences.fromJSON({
        context: {
          contextMode: "sentences",
          sentenceContext: { beforeSentenceCount: 5 },
        },
      });
      expect(prefs.context.sentenceContext.beforeSentenceCount).toBe(5);
      expect(prefs.context.sentenceContext.cursorMarker).toBe("[CURSOR]"); // default
    });

    it("returns defaults when validation fails on partial data", () => {
      // topK: 0 is invalid → should fall back to defaults
      const prefs = UserPreferences.fromJSON({ topK: 0 });
      expect(prefs.toJSON()).toEqual(UserPreferences.createDefault().toJSON());
    });

    it("round-trips through toJSON", () => {
      const original = UserPreferences.createDefault();
      const restored = UserPreferences.fromJSON(original.toJSON());
      expect(restored.toJSON()).toEqual(original.toJSON());
    });
  });

  // ---------------------------------------------------------------------------
  // toJSON
  // ---------------------------------------------------------------------------

  describe("toJSON", () => {
    it("returns a plain object (not a class instance)", () => {
      const json = UserPreferences.createDefault().toJSON();
      expect(json.constructor).toBe(Object);
    });

    it("contains all expected keys", () => {
      const json = UserPreferences.createDefault().toJSON();
      expect(Object.keys(json).sort()).toEqual(
        [
          "acceptKey",
          "context",
          "display",
          "enabled",
          "presetMode",
          "skip",
          "temperature",
          "topK",
        ].sort(),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // with*() immutable update methods
  // ---------------------------------------------------------------------------

  describe("withEnabled", () => {
    it("returns a new instance with updated enabled", () => {
      const prefs = UserPreferences.createDefault();
      const updated = prefs.withEnabled(false);
      expect(updated).not.toBe(prefs);
      expect(updated.enabled).toBe(false);
      expect(prefs.enabled).toBe(true); // original unchanged
    });
  });

  describe("withPresetMode", () => {
    it("changes only the presetMode", () => {
      const prefs = UserPreferences.createDefault();
      const updated = prefs.withPresetMode("custom");
      expect(updated.presetMode).toBe("custom");
      expect(updated.topK).toBe(prefs.topK); // other fields unchanged
    });
  });

  describe("withTopK", () => {
    it("updates topK and sets presetMode to custom", () => {
      const prefs = UserPreferences.createDefault();
      expect(prefs.presetMode).toBe("balanced");
      const updated = prefs.withTopK(3);
      expect(updated.topK).toBe(3);
      expect(updated.presetMode).toBe("custom");
    });

    it("throws on invalid topK", () => {
      expect(() => UserPreferences.createDefault().withTopK(0)).toThrow();
    });
  });

  describe("withTemperature", () => {
    it("updates temperature and sets presetMode to custom", () => {
      const prefs = UserPreferences.createDefault();
      const updated = prefs.withTemperature(1.5);
      expect(updated.temperature).toBe(1.5);
      expect(updated.presetMode).toBe("custom");
    });

    it("throws on out-of-range temperature", () => {
      expect(() =>
        UserPreferences.createDefault().withTemperature(3.0),
      ).toThrow();
    });
  });

  describe("withContext", () => {
    it("merges partial context and sets presetMode to custom", () => {
      const prefs = UserPreferences.createDefault();
      const updated = prefs.withContext({ maxContextLength: 150 });
      expect(updated.context.maxContextLength).toBe(150);
      expect(updated.context.minContextLength).toBe(
        prefs.context.minContextLength,
      );
      expect(updated.presetMode).toBe("custom");
    });
  });

  describe("withSentenceContext", () => {
    it("merges partial sentence context and sets presetMode to custom", () => {
      const prefs = UserPreferences.createDefault();
      const updated = prefs.withSentenceContext({ beforeSentenceCount: 5 });
      expect(updated.context.sentenceContext.beforeSentenceCount).toBe(5);
      expect(updated.context.sentenceContext.cursorMarker).toBe("[CURSOR]");
      expect(updated.presetMode).toBe("custom");
    });
  });

  describe("withSkip", () => {
    it("merges partial skip conditions and sets presetMode to custom", () => {
      const prefs = UserPreferences.createDefault();
      const updated = prefs.withSkip({ skipIfUrlOnly: true });
      expect(updated.skip.skipIfUrlOnly).toBe(true);
      expect(updated.skip.skipIfEmpty).toBe(true); // preserved
      expect(updated.presetMode).toBe("custom");
    });
  });

  describe("withDisplay", () => {
    it("merges partial display settings WITHOUT changing presetMode", () => {
      const prefs = UserPreferences.createDefault();
      expect(prefs.presetMode).toBe("balanced");
      const updated = prefs.withDisplay({ showReasonTooltip: false });
      expect(updated.display.showReasonTooltip).toBe(false);
      expect(updated.display.showUnavailableToast).toBe(true); // preserved
      expect(updated.presetMode).toBe("balanced"); // NOT changed to custom
    });
  });

  // ---------------------------------------------------------------------------
  // applyPreset
  // ---------------------------------------------------------------------------

  describe("applyPreset", () => {
    it("applies simple preset values", () => {
      const prefs = UserPreferences.createDefault().applyPreset("simple");
      expect(prefs.presetMode).toBe("simple");
      expect(prefs.topK).toBe(SIMPLE_PRESET.topK);
      expect(prefs.temperature).toBe(SIMPLE_PRESET.temperature);
      expect(prefs.context).toEqual(SIMPLE_PRESET.context);
    });

    it("applies creative preset values", () => {
      const prefs = UserPreferences.createDefault().applyPreset("creative");
      expect(prefs.presetMode).toBe("creative");
      expect(prefs.topK).toBe(CREATIVE_PRESET.topK);
      expect(prefs.temperature).toBe(CREATIVE_PRESET.temperature);
    });

    it("only changes mode label for custom", () => {
      const prefs = UserPreferences.createDefault();
      const custom = prefs.applyPreset("custom");
      expect(custom.presetMode).toBe("custom");
      expect(custom.topK).toBe(prefs.topK); // unchanged
      expect(custom.temperature).toBe(prefs.temperature); // unchanged
    });

    it("preserves display settings across preset change", () => {
      const prefs = UserPreferences.createDefault().withDisplay({
        showReasonTooltip: false,
      });
      const applied = prefs.applyPreset("simple");
      expect(applied.display.showReasonTooltip).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Backward compatibility
  // ---------------------------------------------------------------------------

  describe("deprecated exports", () => {
    it("DEFAULT_USER_PREFERENCES is a UserPreferences instance", () => {
      expect(DEFAULT_USER_PREFERENCES).toBeInstanceOf(UserPreferences);
    });

    it("createUserPreferences returns a UserPreferences instance", () => {
      const prefs = createUserPreferences(DEFAULT_USER_PREFERENCES.toJSON());
      expect(prefs).toBeInstanceOf(UserPreferences);
    });

    it("spread of class instance produces valid input for create", () => {
      const json = {
        ...DEFAULT_USER_PREFERENCES,
      } as unknown as UserPreferencesInput;
      // Spreading a class copies own enumerable properties
      expect(() => UserPreferences.create(json)).not.toThrow();
    });
  });
});
