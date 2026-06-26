/**
 * PresetSelector component.
 *
 * Displays preset mode buttons (Simple / Balanced / Creative / Custom).
 * Selecting a non-custom preset fills AI-tuning and context fields.
 * Manual edits to individual fields switch the mode to Custom.
 */

import type { PresetMode } from '../../core/domain/preferences/preset-mode';
import { PRESET_MODES } from '../../core/domain/preferences/preset-mode';

type Props = {
  current: PresetMode;
  onChange: (mode: PresetMode) => void;
  disabled?: boolean;
};

const LABELS: Record<PresetMode, string> = {
  simple: 'Simple',
  balanced: 'Balanced',
  creative: 'Creative',
  custom: 'Custom',
};

const DESCRIPTIONS: Record<PresetMode, string> = {
  simple: 'Fewer candidates, lower randomness',
  balanced: 'Recommended defaults',
  creative: 'More candidates, higher randomness',
  custom: 'Manually configured',
};

export function PresetSelector({ current, onChange, disabled }: Props) {
  return (
    <fieldset className="preset-selector" disabled={disabled}>
      <legend>Preset Mode</legend>
      <div className="preset-buttons">
        {PRESET_MODES.map((mode) => (
          <label
            key={mode}
            className={`preset-btn ${current === mode ? 'active' : ''}`}
            title={DESCRIPTIONS[mode]}
          >
            <input
              type="radio"
              name="presetMode"
              value={mode}
              checked={current === mode}
              onChange={() => onChange(mode)}
              className="preset-radio-input"
            />
            {LABELS[mode]}
          </label>
        ))}
      </div>
      <p className="preset-description">{DESCRIPTIONS[current]}</p>
    </fieldset>
  );
}
