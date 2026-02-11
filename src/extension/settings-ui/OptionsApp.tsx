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

import React, { useCallback } from 'react';
import type { UserPreferences } from '../../core/domain/preferences/user-preferences';
import { DEFAULT_USER_PREFERENCES, createUserPreferences } from '../../core/domain/preferences/user-preferences';
import type { PresetMode } from '../../core/domain/preferences/preset-mode';
import { getPresetValues } from '../../core/domain/preferences/preset-mode';
import { usePreferences } from './usePreferences';
import { PresetSelector } from './PresetSelector';
import { SettingsForm } from './SettingsForm';
import './options.css';

export function OptionsApp() {
  const { prefs, loading, saving, error, update } = usePreferences();

  const handlePresetChange = useCallback(
    (mode: PresetMode) => {
      const presetValues = getPresetValues(mode);
      if (presetValues) {
        // Apply preset values, keep display settings unchanged
        void update({ ...prefs, ...presetValues, presetMode: mode });
      } else {
        // 'custom' — just update the mode label
        void update({ ...prefs, presetMode: mode });
      }
    },
    [prefs, update],
  );

  const handleSettingsChange = useCallback(
    (next: UserPreferences) => {
      try {
        createUserPreferences(next);
        void update(next);
      } catch {
        // Validation failed — don't save, keep local state for the form
        // The SettingsForm shows inline errors
      }
    },
    [update],
  );

  const handleReset = useCallback(() => {
    if (window.confirm('Reset all settings to defaults?')) {
      void update(DEFAULT_USER_PREFERENCES);
    }
  }, [update]);

  if (loading) {
    return <div className="options-loading">Loading settings…</div>;
  }

  return (
    <div className="options-app">
      <header className="options-header">
        <h1>Emoji Whisper Settings</h1>
        {error && <p className="options-error" role="alert">{error}</p>}
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
