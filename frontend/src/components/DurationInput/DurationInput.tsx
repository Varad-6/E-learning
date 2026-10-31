import React from 'react';
import './DurationInput.css';

export interface DurationInputProps {
  days?: number;
  hours: number;
  minutes: number;
  showDays?: boolean;
  onChange: ((hours: number, minutes: number) => void) | ((days: number, hours: number, minutes: number) => void);
  error?: string;
  label?: string;
  required?: boolean;
  helperNote?: string;
  idPrefix?: string;
  disabled?: boolean;
}

export const DurationInput: React.FC<DurationInputProps> = ({
  days = 0,
  hours,
  minutes,
  showDays = false,
  onChange,
  error,
  label = 'Course Duration',
  required = true,
  helperNote = 'Set the estimated total time required for learners to complete this course (minimum 1 minute).',
  idPrefix = 'duration',
  disabled = false
}) => {
  const triggerChange = (newDays: number, newHours: number, newMinutes: number) => {
    if (showDays) {
      (onChange as (d: number, h: number, m: number) => void)(newDays, newHours, newMinutes);
    } else {
      (onChange as (h: number, m: number) => void)(newHours, newMinutes);
    }
  };

  const handleDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
    const safeDays = isNaN(val) ? 0 : Math.max(0, Math.min(365, val));
    triggerChange(safeDays, hours, minutes);
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
    const safeHours = isNaN(val) ? 0 : Math.max(0, showDays ? Math.min(23, val) : Math.min(999, val));
    triggerChange(days, safeHours, minutes);
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
    const safeMinutes = isNaN(val) ? 0 : Math.min(59, Math.max(0, val));
    triggerChange(days, hours, safeMinutes);
  };

  const applyPreset = (presetDays: number) => {
    triggerChange(presetDays, 0, 0);
  };

  return (
    <div className="duration-input-wrapper">
      <label className="form-label-styled" htmlFor={`${idPrefix}-hours`}>
        {label} {required && <span className="required-star">*</span>}
      </label>

      <div className={`duration-inputs-row ${showDays ? 'has-days' : ''}`}>
        {/* Optional Days Field */}
        {showDays && (
          <div className="duration-input-field-group">
            <input
              id={`${idPrefix}-days`}
              type="number"
              min="0"
              max="365"
              placeholder="0"
              className={`form-input-styled duration-number-input ${error ? 'has-error' : ''}`}
              value={days === 0 ? '' : days}
              onChange={handleDaysChange}
              disabled={disabled}
              aria-label="Duration Days"
            />
            <span className="duration-unit-badge">Days</span>
          </div>
        )}

        {/* Hours Field */}
        <div className="duration-input-field-group">
          <input
            id={`${idPrefix}-hours`}
            type="number"
            min="0"
            max={showDays ? 23 : 999}
            placeholder="0"
            className={`form-input-styled duration-number-input ${error ? 'has-error' : ''}`}
            value={hours === 0 ? '' : hours}
            onChange={handleHoursChange}
            disabled={disabled}
            aria-label="Duration Hours"
          />
          <span className="duration-unit-badge">{showDays ? 'Hours (0-23)' : 'Hours'}</span>
        </div>

        {/* Minutes Field */}
        <div className="duration-input-field-group">
          <input
            id={`${idPrefix}-minutes`}
            type="number"
            min="0"
            max="59"
            placeholder="0"
            className={`form-input-styled duration-number-input ${error ? 'has-error' : ''}`}
            value={minutes === 0 ? '' : minutes}
            onChange={handleMinutesChange}
            disabled={disabled}
            aria-label="Duration Minutes"
          />
          <span className="duration-unit-badge">Minutes (0-59)</span>
        </div>
      </div>

      {showDays && (
        <div className="duration-presets-row">
          <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginRight: '4px' }}>
            Quick Presets:
          </span>
          {[3, 7, 14, 30].map((preset) => (
            <button
              key={preset}
              type="button"
              className={`duration-preset-btn ${days === preset && hours === 0 && minutes === 0 ? 'active' : ''}`}
              onClick={() => applyPreset(preset)}
              disabled={disabled}
            >
              {preset} Days
            </button>
          ))}
        </div>
      )}

      {helperNote && (
        <p className="duration-helper-note">
          ℹ️ {helperNote}
        </p>
      )}

      {error && (
        <p className="duration-error-text">
          ⚠️ {error}
        </p>
      )}
    </div>
  );
};
