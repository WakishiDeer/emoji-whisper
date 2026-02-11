/**
 * OptionsApp – Full settings page (chrome-extension://…/options.html).
 *
 * Shows all configurable preferences:
 * - Preset mode selector
 * - AI model tuning (topK, temperature)
 * - Context extraction settings
 * - Skip conditions
 * - Display settings
 * - Reset to defaults
 */

import React, { useCallback, useState } from "react";
import type { UserPreferences } from "../../core/domain/preferences/user-preferences";
import { UserPreferences as UserPreferencesClass } from "../../core/domain/preferences/user-preferences";
import type { PresetMode } from "../../core/domain/preferences/preset-mode";
import { usePreferences } from "./usePreferences";
import { PresetSelector } from "./PresetSelector";
import { SettingsForm } from "./SettingsForm";
import type { FieldErrorKey } from "./SettingsForm";
import "./options.css";

export function OptionsApp() {
  const { prefs, loading, saving, error, update } = usePreferences();
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<FieldErrorKey, string>>
  >({});

  const handlePresetChange = useCallback(
    (mode: PresetMode) => {
      setFieldErrors({});
      void update(prefs.applyPreset(mode));
    },
    [prefs, update],
  );

  const handleSettingsChange = useCallback(
    (next: UserPreferences) => {
      // SettingsForm already validates via with*() methods
      void update(next);
    },
    [update],
  );

  const handleValidationError = useCallback(
    (field: FieldErrorKey, message: string | null) => {
      setFieldErrors((prev) => {
        if (message === null) {
          if (!(field in prev)) return prev;
          const next = { ...prev };
          delete next[field];
          return next;
        }
        return { ...prev, [field]: message };
      });
    },
    [],
  );

  const handleReset = useCallback(() => {
    if (window.confirm("Reset all settings to defaults?")) {
      setFieldErrors({});
      void update(UserPreferencesClass.createDefault());
    }
  }, [update]);

  if (loading) {
    return <div className="options-loading">Loading settings…</div>;
  }

  return (
    <div className="options-app">
      <header className="options-header">
        <h1>Emoji Whisper Settings</h1>
        {error && (
          <p className="options-error" role="alert">
            {error}
          </p>
        )}
        {saving && <p className="options-saving">Saving…</p>}
      </header>

      <main className="options-main">
        <section className="options-section">
          <PresetSelector
            current={prefs.presetMode}
            onChange={handlePresetChange}
            disabled={saving}
          />
        </section>

        <section className="options-section">
          <SettingsForm
            prefs={prefs}
            onChange={handleSettingsChange}
            disabled={saving}
            fieldErrors={fieldErrors}
            onValidationError={handleValidationError}
          />
        </section>

        <section className="options-actions">
          <button
            type="button"
            className="btn-reset"
            onClick={handleReset}
            disabled={saving}
          >
            Reset to Defaults
          </button>
        </section>
      </main>
    </div>
  );
}
