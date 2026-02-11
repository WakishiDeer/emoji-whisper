/**
 * SettingsForm component.
 *
 * Full settings form with all configurable fields:
 * - topK & temperature (AI model tuning)
 * - Context extraction settings
 * - Skip conditions
 * - Display settings (toast/tooltip toggles)
 *
 * Renders inline validation errors. Changes are auto-saved on blur or toggle.
 */

import React from 'react';
import type { UserPreferences } from '../../core/domain/preferences/user-preferences';
import type { ContextMode } from '../../core/domain/context/context-extraction';

type Props = {
  prefs: UserPreferences;
  onChange: (next: UserPreferences) => void;
  disabled?: boolean;
};

export function SettingsForm({ prefs, onChange, disabled }: Props) {
  const handleTopKChange = (value: string) => {
    const n = parseInt(value, 10);
    if (!isNaN(n)) {
      onChange({ ...prefs, topK: n, presetMode: 'custom' });
    }
  };

  const handleTemperatureChange = (value: string) => {
    const n = parseFloat(value);
    if (!isNaN(n)) {
      onChange({ ...prefs, temperature: n, presetMode: 'custom' });
    }
  };

  const handleContextModeChange = (mode: ContextMode) => {
    onChange({
      ...prefs,
      context: { ...prefs.context, contextMode: mode },
      presetMode: 'custom',
    });
  };

  const handleMinContextLength = (value: string) => {
    const n = parseInt(value, 10);
    if (!isNaN(n)) {
      onChange({
        ...prefs,
        context: { ...prefs.context, minContextLength: n },
        presetMode: 'custom',
      });
    }
  };

  const handleMaxContextLength = (value: string) => {
    const n = parseInt(value, 10);
    if (!isNaN(n)) {
      onChange({
        ...prefs,
        context: { ...prefs.context, maxContextLength: n },
        presetMode: 'custom',
      });
    }
  };

  const handleBeforeSentenceCount = (value: string) => {
    const n = parseInt(value, 10);
    if (!isNaN(n)) {
      onChange({
        ...prefs,
        context: {
          ...prefs.context,
          sentenceContext: { ...prefs.context.sentenceContext, beforeSentenceCount: n },
        },
        presetMode: 'custom',
      });
    }
  };

  const handleAfterSentenceCount = (value: string) => {
    const n = parseInt(value, 10);
    if (!isNaN(n)) {
      onChange({
        ...prefs,
        context: {
          ...prefs.context,
          sentenceContext: { ...prefs.context.sentenceContext, afterSentenceCount: n },
        },
        presetMode: 'custom',
      });
    }
  };

  const handleSkipToggle = (field: keyof typeof prefs.skip) => {
    onChange({
      ...prefs,
      skip: { ...prefs.skip, [field]: !prefs.skip[field] },
      presetMode: 'custom',
    });
  };

  const handleDisplayToggle = (field: keyof typeof prefs.display) => {
    // Display changes do NOT switch preset to custom (by design, ADR 0012)
    onChange({
      ...prefs,
      display: { ...prefs.display, [field]: !prefs.display[field] },
    });
  };

  return (
    <div className="settings-form">
      {/* AI Model Tuning */}
      <fieldset disabled={disabled}>
        <legend>AI Model Tuning</legend>

        <label htmlFor="topK">
          Top-K <small>(1–40, integer)</small>
        </label>
        <input
          id="topK"
          type="number"
          min={1}
          max={40}
          step={1}
          value={prefs.topK}
          onChange={(e) => handleTopKChange(e.target.value)}
        />

        <label htmlFor="temperature">
          Temperature <small>(0.0–2.0)</small>
        </label>
        <input
          id="temperature"
          type="number"
          min={0}
          max={2}
          step={0.1}
          value={prefs.temperature}
          onChange={(e) => handleTemperatureChange(e.target.value)}
        />
      </fieldset>

      {/* Context Extraction */}
      <fieldset disabled={disabled}>
        <legend>Context Extraction</legend>

        <label htmlFor="contextMode">Context Mode</label>
        <select
          id="contextMode"
          value={prefs.context.contextMode}
          onChange={(e) => handleContextModeChange(e.target.value as ContextMode)}
        >
          <option value="characters">Characters</option>
          <option value="sentences">Sentences</option>
        </select>

        <label htmlFor="minContextLength">
          Min Context Length <small>(characters)</small>
        </label>
        <input
          id="minContextLength"
          type="number"
          min={1}
          max={999}
          value={prefs.context.minContextLength}
          onChange={(e) => handleMinContextLength(e.target.value)}
        />

        <label htmlFor="maxContextLength">
          Max Context Length <small>(characters, max 1000)</small>
        </label>
        <input
          id="maxContextLength"
          type="number"
          min={1}
          max={1000}
          value={prefs.context.maxContextLength}
          onChange={(e) => handleMaxContextLength(e.target.value)}
        />

        {prefs.context.contextMode === 'sentences' && (
          <>
            <label htmlFor="beforeSentenceCount">
              Sentences Before Cursor <small>(0–10)</small>
            </label>
            <input
              id="beforeSentenceCount"
              type="number"
              min={0}
              max={10}
              value={prefs.context.sentenceContext.beforeSentenceCount}
              onChange={(e) => handleBeforeSentenceCount(e.target.value)}
            />

            <label htmlFor="afterSentenceCount">
              Sentences After Cursor <small>(0–10)</small>
            </label>
            <input
              id="afterSentenceCount"
              type="number"
              min={0}
              max={10}
              value={prefs.context.sentenceContext.afterSentenceCount}
              onChange={(e) => handleAfterSentenceCount(e.target.value)}
            />
          </>
        )}
      </fieldset>

      {/* Skip Conditions */}
      <fieldset disabled={disabled}>
        <legend>Skip Conditions</legend>

        <label>
          <input
            type="checkbox"
            checked={prefs.skip.skipIfEmpty}
            onChange={() => handleSkipToggle('skipIfEmpty')}
          />
          Skip if input is empty
        </label>

        <label>
          <input
            type="checkbox"
            checked={prefs.skip.skipIfEmojiOnly}
            onChange={() => handleSkipToggle('skipIfEmojiOnly')}
          />
          Skip if input contains only emoji
        </label>

        <label>
          <input
            type="checkbox"
            checked={prefs.skip.skipIfUrlOnly}
            onChange={() => handleSkipToggle('skipIfUrlOnly')}
          />
          Skip if input is a URL
        </label>
      </fieldset>

      {/* Display Settings */}
      <fieldset disabled={disabled}>
        <legend>Display Settings</legend>

        <label>
          <input
            type="checkbox"
            checked={prefs.display.showUnavailableToast}
            onChange={() => handleDisplayToggle('showUnavailableToast')}
          />
          Show toast when Prompt API is unavailable
        </label>

        <label>
          <input
            type="checkbox"
            checked={prefs.display.showReasonTooltip}
            onChange={() => handleDisplayToggle('showReasonTooltip')}
          />
          Show reason tooltip on emoji hover
        </label>
      </fieldset>
    </div>
  );
}
