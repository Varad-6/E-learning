import React, { useRef } from 'react';
import './OTPInput.css';

interface OTPInputProps {
  value: string;
  onChange: (val: string) => void;
  cooldown: number;
  onResend: () => void;
}

export const OTPInput: React.FC<OTPInputProps> = ({ value, onChange, cooldown, onResend }) => {
  const inputsRef = useRef<HTMLInputElement[]>([]);

  // Split value into array of 6 characters
  const digits = value.split('').concat(Array(6).fill('')).slice(0, 6);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    if (!val) return;

    const newDigits = [...digits];
    // Use last char typed
    newDigits[idx] = val.substring(val.length - 1);
    const newOTP = newDigits.join('');
    onChange(newOTP);

    // Focus next input if not the last one
    if (idx < 5 && newDigits[idx] !== '') {
      inputsRef.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Backspace') {
      const newDigits = [...digits];
      if (newDigits[idx] === '') {
        // Focus previous input on backspace if current field is empty
        if (idx > 0) {
          inputsRef.current[idx - 1]?.focus();
          newDigits[idx - 1] = '';
          onChange(newDigits.join(''));
        }
      } else {
        newDigits[idx] = '';
        onChange(newDigits.join(''));
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim().replace(/[^0-9]/g, '').substring(0, 6);
    if (pasteData.length === 6) {
      onChange(pasteData);
      inputsRef.current[5]?.focus();
    }
  };

  return (
    <div className="otp-input-container">
      <div className="otp-inputs-wrapper">
        {digits.map((digit, idx) => (
          <input
            key={idx}
            ref={(el) => { inputsRef.current[idx] = el as HTMLInputElement; }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(e, idx)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            onPaste={handlePaste}
            className="otp-digit-box"
            autoComplete="one-time-code"
          />
        ))}
      </div>
      <div className="otp-meta-row">
        {cooldown > 0 ? (
          <span className="otp-cooldown-text">
            Resend code in <strong style={{ color: 'var(--accent-color)' }}>{cooldown}s</strong>
          </span>
        ) : (
          <button type="button" onClick={onResend} className="otp-resend-btn">
            Resend OTP code
          </button>
        )}
      </div>
    </div>
  );
};
