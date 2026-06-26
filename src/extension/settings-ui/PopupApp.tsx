/**
 * PopupApp – Extension popup (toolbar icon click).
 *
 * Quick-access controls:
 * - Enable/disable toggle
 * - Preset mode selector
 * - Link to full Options page
 */

import React, { useCallback } from "react";
import type { PresetMode } from "../../core/domain/preferences/preset-mode";
import { usePreferences } from "./usePreferences";
import { PresetSelector } from "./PresetSelector";
import { browser } from "wxt/browser";
import "./popup.css";

export function PopupApp() {
  const { prefs, loading, saving, error, update } = usePreferences();

  const handleToggle = useCallback(() => {
    void update(prefs.withEnabled(!prefs.enabled));
  }, [prefs, update]);

  const handlePresetChange = useCallback(
    (mode: PresetMode) => {
      void update(prefs.applyPreset(mode));
    },
    [prefs, update],
  );

  const openOptions = useCallback(() => {
    void browser.runtime.openOptionsPage();
  }, []);

  if (loading) {
    return <div className="popup-loading">Loading…</div>;
  }

  return (
    <div className="popup-app">
      <header className="popup-header">
        <h1>Emoji Whisper</h1>
      </header>

      {error && (
        <p className="popup-error" role="alert">
          {error}
        </p>
      )}

      <div className="popup-toggle">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={prefs.enabled}
            onChange={handleToggle}
            disabled={saving}
          />
          <span>{prefs.enabled ? "Enabled" : "Disabled"}</span>
        </label>
      </div>

      <div className="popup-preset">
        <PresetSelector
          current={prefs.presetMode}
          onChange={handlePresetChange}
          disabled={saving || !prefs.enabled}
        />
      </div>

      <footer className="popup-footer">
        <button type="button" className="btn-options" onClick={openOptions}>
          All Settings…
        </button>
      </footer>
    </div>
  );
}
