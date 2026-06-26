/**
 * SettingsForm component.
 *
 * Full settings form with all configurable fields:
 * - topK & temperature (AI model tuning)
 * - Context extraction settings
 * - Skip conditions
 * - Display settings (toast/tooltip toggles)
 *
 * Renders inline validation errors near each invalid field (AC-19).
 * Changes are auto-saved on blur or toggle.
 */

import React from "react";
import type { UserPreferences } from "../../core/domain/preferences/user-preferences";
import type { ContextMode } from "../../core/domain/context/context-extraction";

/** Identifiers for fields that can produce validation errors. */
export type FieldErrorKey =
  | "topK"
  | "temperature"
  | "contextMode"
  | "minContextLength"
  | "maxContextLength"
  | "beforeSentenceCount"
  | "afterSentenceCount";

type Props = {
  prefs: UserPreferences;
  onChange: (next: UserPreferences) => void;
  disabled?: boolean;
  /** Current field-level validation errors (managed by parent). */
  fieldErrors?: Partial<Record<FieldErrorKey, string>>;
  /** Called when a field validation succeeds (`null`) or fails (error message). */
  onValidationError?: (field: FieldErrorKey, message: string | null) => void;
};

export function SettingsForm({
  prefs,
  onChange,
  disabled,
  fieldErrors,
  onValidationError,
}: Props) {
  /** Try a with*() update; on success notify cleared, on failure report error. */
  const tryUpdate = (field: FieldErrorKey, fn: () => UserPreferences) => {
    try {
      const next = fn();
      onValidationError?.(field, null);
      onChange(next);
    } catch (e: unknown) {
      onValidationError?.(
        field,
        e instanceof Error ? e.message : "Invalid value",
      );
    }
  };

  const handleTopKChange = (value: string) => {
    const n = parseInt(value, 10);
    if (!isNaN(n)) tryUpdate("topK", () => prefs.withTopK(n));
  };

  const handleTemperatureChange = (value: string) => {
    const n = parseFloat(value);
    if (!isNaN(n)) tryUpdate("temperature", () => prefs.withTemperature(n));
  };

  const handleContextModeChange = (mode: ContextMode) => {
    tryUpdate("contextMode", () => prefs.withContext({ contextMode: mode }));
  };

  const handleMinContextLength = (value: string) => {
    const n = parseInt(value, 10);
    if (!isNaN(n))
      tryUpdate("minContextLength", () =>
        prefs.withContext({ minContextLength: n }),
      );
  };

  const handleMaxContextLength = (value: string) => {
    const n = parseInt(value, 10);
    if (!isNaN(n))
      tryUpdate("maxContextLength", () =>
        prefs.withContext({ maxContextLength: n }),
      );
  };

  const handleBeforeSentenceCount = (value: string) => {
    const n = parseInt(value, 10);
    if (!isNaN(n))
      tryUpdate("beforeSentenceCount", () =>
        prefs.withSentenceContext({ beforeSentenceCount: n }),
      );
  };

  const handleAfterSentenceCount = (value: string) => {
    const n = parseInt(value, 10);
    if (!isNaN(n))
      tryUpdate("afterSentenceCount", () =>
        prefs.withSentenceContext({ afterSentenceCount: n }),
      );
  };

  const handleSkipToggle = (field: keyof typeof prefs.skip) => {
    try {
      onChange(prefs.withSkip({ [field]: !prefs.skip[field] }));
    } catch {
      /* boolean toggle — cannot realistically fail */
    }
  };

  const handleDisplayToggle = (field: keyof typeof prefs.display) => {
    try {
      onChange(prefs.withDisplay({ [field]: !prefs.display[field] }));
    } catch {
      /* boolean toggle — cannot realistically fail */
    }
  };

  const errorOf = (field: FieldErrorKey) => fieldErrors?.[field];
  const invalidProps = (field: FieldErrorKey, errorId: string) => {
    const error = errorOf(field);
    return error ? { "aria-invalid": true, "aria-describedby": errorId } : {};
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
          {...invalidProps("topK", "topK-error")}
        />
        {errorOf("topK") && (
          <p id="topK-error" className="field-error" role="alert">
            {errorOf("topK")}
          </p>
        )}

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
          {...invalidProps("temperature", "temperature-error")}
        />
        {errorOf("temperature") && (
          <p id="temperature-error" className="field-error" role="alert">
            {errorOf("temperature")}
          </p>
        )}
      </fieldset>

      {/* Context Extraction */}
      <fieldset disabled={disabled}>
        <legend>Context Extraction</legend>

        <label htmlFor="contextMode">Context Mode</label>
        <select
          id="contextMode"
          value={prefs.context.contextMode}
          onChange={(e) =>
            handleContextModeChange(e.target.value as ContextMode)
          }
          {...invalidProps("contextMode", "contextMode-error")}
        >
          <option value="characters">Characters</option>
          <option value="sentences">Sentences</option>
        </select>
        {errorOf("contextMode") && (
          <p id="contextMode-error" className="field-error" role="alert">
            {errorOf("contextMode")}
          </p>
        )}

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
          {...invalidProps("minContextLength", "minContextLength-error")}
        />
        {errorOf("minContextLength") && (
          <p id="minContextLength-error" className="field-error" role="alert">
            {errorOf("minContextLength")}
          </p>
        )}

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
          {...invalidProps("maxContextLength", "maxContextLength-error")}
        />
        {errorOf("maxContextLength") && (
          <p id="maxContextLength-error" className="field-error" role="alert">
            {errorOf("maxContextLength")}
          </p>
        )}

        {prefs.context.contextMode === "sentences" && (
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
              {...invalidProps(
                "beforeSentenceCount",
                "beforeSentenceCount-error",
              )}
            />
            {errorOf("beforeSentenceCount") && (
              <p
                id="beforeSentenceCount-error"
                className="field-error"
                role="alert"
              >
                {errorOf("beforeSentenceCount")}
              </p>
            )}

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
              {...invalidProps(
                "afterSentenceCount",
                "afterSentenceCount-error",
              )}
            />
            {errorOf("afterSentenceCount") && (
              <p
                id="afterSentenceCount-error"
                className="field-error"
                role="alert"
              >
                {errorOf("afterSentenceCount")}
              </p>
            )}
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
            onChange={() => handleSkipToggle("skipIfEmpty")}
          />
          Skip if input is empty
        </label>

        <label>
          <input
            type="checkbox"
            checked={prefs.skip.skipIfEmojiOnly}
            onChange={() => handleSkipToggle("skipIfEmojiOnly")}
          />
          Skip if input contains only emoji
        </label>

        <label>
          <input
            type="checkbox"
            checked={prefs.skip.skipIfUrlOnly}
            onChange={() => handleSkipToggle("skipIfUrlOnly")}
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
            onChange={() => handleDisplayToggle("showUnavailableToast")}
          />
          Show toast when Prompt API is unavailable
        </label>

        <label>
          <input
            type="checkbox"
            checked={prefs.display.showReasonTooltip}
            onChange={() => handleDisplayToggle("showReasonTooltip")}
          />
          Show reason tooltip on emoji hover
        </label>
      </fieldset>
    </div>
  );
}
