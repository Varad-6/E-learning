/**
 * Utility functions for Course Duration & Deadline formatting and validation.
 * Standard format: "Xd Yh Zm" (e.g. "7d 0h 0m", "2h 30m", "14d").
 */

export interface ParsedDuration {
  days: number;
  hours: number;
  minutes: number;
}

export const parseDuration = (raw: string | null | undefined): ParsedDuration => {
  if (!raw || !raw.trim()) {
    return { days: 0, hours: 0, minutes: 0 };
  }

  const str = raw.trim().toLowerCase();

  let days = 0;
  let totalHours = 0;
  let totalMinutes = 0;

  // Pattern 1: Explicit tokens like "7d", "2h", "30m"
  const dayMatch = str.match(/(\d+)\s*d(?:ays?)?/);
  const hourMatch = str.match(/(\d+)\s*h(?:ours?|rs?)?/);
  const minMatch = str.match(/(\d+)\s*m(?:in(?:ute)?s?)?/);

  if (dayMatch) {
    days = parseInt(dayMatch[1], 10) || 0;
  }
  if (hourMatch) {
    totalHours += parseInt(hourMatch[1], 10) || 0;
  }
  if (minMatch) {
    totalMinutes += parseInt(minMatch[1], 10) || 0;
  }

  // Pattern 2: English words like "7 days", "10 hours", "30 mins"
  if (!dayMatch && !hourMatch && !minMatch) {
    const daysWordMatch = str.match(/(\d+)\s*(?:day|days)/);
    const hoursWordMatch = str.match(/(\d+)\s*(?:hour|hours|hr|hrs)/);
    const minsWordMatch = str.match(/(\d+)\s*(?:min|mins|minute|minutes)/);

    if (daysWordMatch) days = parseInt(daysWordMatch[1], 10) || 0;
    if (hoursWordMatch) totalHours += parseInt(hoursWordMatch[1], 10) || 0;
    if (minsWordMatch) totalMinutes += parseInt(minsWordMatch[1], 10) || 0;

    // Pattern 3: Pure number (treat as hours if > 0)
    if (!daysWordMatch && !hoursWordMatch && !minsWordMatch) {
      const pureNum = parseInt(str, 10);
      if (!isNaN(pureNum)) totalHours = pureNum;
    }
  }

  // Normalize minutes >= 60
  if (totalMinutes >= 60) {
    totalHours += Math.floor(totalMinutes / 60);
    totalMinutes = totalMinutes % 60;
  }

  return { days, hours: totalHours, minutes: totalMinutes };
};

export const buildDurationString = (
  daysOrHours: number,
  hoursOrMinutes?: number,
  maybeMinutes?: number
): string => {
  let d = 0;
  let h = 0;
  let m = 0;

  if (maybeMinutes !== undefined) {
    // 3-argument call: (days, hours, minutes)
    d = Math.max(0, isNaN(daysOrHours) ? 0 : Math.floor(daysOrHours));
    h = Math.max(0, isNaN(hoursOrMinutes || 0) ? 0 : Math.floor(hoursOrMinutes || 0));
    m = Math.min(59, Math.max(0, isNaN(maybeMinutes) ? 0 : Math.floor(maybeMinutes)));
  } else {
    // 2-argument legacy call: (hours, minutes)
    h = Math.max(0, isNaN(daysOrHours) ? 0 : Math.floor(daysOrHours));
    m = Math.min(59, Math.max(0, isNaN(hoursOrMinutes || 0) ? 0 : Math.floor(hoursOrMinutes || 0)));
  }

  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0 || (d === 0 && m === 0)) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);

  return parts.length > 0 ? parts.join(' ') : '0h 0m';
};

export const formatDuration = (raw: string | number | null | undefined): string => {
  if (raw === null || raw === undefined) {
    return '0h 0m';
  }
  if (typeof raw === 'number') {
    if (raw >= 86400) {
      const d = Math.floor(raw / 86400);
      const rem = raw % 86400;
      const h = Math.floor(rem / 3600);
      return h > 0 ? `${d}d ${h}h` : `${d}d`;
    }
    if (raw >= 3600) {
      const h = Math.floor(raw / 3600);
      const m = Math.floor((raw % 3600) / 60);
      return `${h}h ${m}m`;
    }
    const m = Math.floor(raw / 60);
    return `${m}m`;
  }
  const str = String(raw).trim();
  if (!str) {
    return '0h 0m';
  }
  const parsed = parseDuration(str);
  const parts: string[] = [];
  if (parsed.days > 0) {
    parts.push(`${parsed.days} ${parsed.days === 1 ? 'day' : 'days'}`);
  }
  if (parsed.hours > 0) {
    parts.push(`${parsed.hours} ${parsed.hours === 1 ? 'hr' : 'hrs'}`);
  }
  if (parsed.minutes > 0) {
    parts.push(`${parsed.minutes} min`);
  }
  return parts.length > 0 ? parts.join(' ') : '0h 0m';
};

export const formatSecondsToTime = (seconds: number | string | null | undefined, fallback = '10:00'): string => {
  if (seconds === null || seconds === undefined) return fallback;
  if (typeof seconds === 'string') {
    if (seconds.includes(':') || seconds.includes('min') || seconds.includes('read')) {
      return seconds;
    }
    const num = parseInt(seconds, 10);
    if (isNaN(num)) return seconds;
    seconds = num;
  }
  if (typeof seconds === 'number') {
    const total = Math.floor(seconds);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return fallback;
};

export const validateDuration = (
  daysOrHours: number,
  hoursOrMinutes?: number,
  maybeMinutes?: number
): string | null => {
  let d = 0;
  let h = 0;
  let m = 0;

  if (maybeMinutes !== undefined) {
    d = daysOrHours;
    h = hoursOrMinutes || 0;
    m = maybeMinutes;
  } else {
    h = daysOrHours;
    m = hoursOrMinutes || 0;
  }

  if (isNaN(d) || d < 0) return 'Days cannot be negative.';
  if (isNaN(h) || h < 0) return 'Hours cannot be negative.';
  if (isNaN(m) || m < 0 || m > 59) return 'Minutes must be between 0 and 59.';
  if (d === 0 && h === 0 && m === 0) return 'Duration / Deadline must be at least 1 minute.';
  return null;
};
