// Cleans and validates parsed CSV rows. Produces cleanedRows (no issues found),
// flaggedRows (at least one issue, with human-readable reasons), and a summary
// used by the KPI cards and the validation "stamp".
//
// Dates and times are accepted in several common spreadsheet formats, then
// normalized here — cleanedRows always carry an ISO date (YYYY-MM-DD) and a
// 12-hour display time ("8:00 AM"), so every other module can rely on one
// consistent shape regardless of how the source CSV was formatted.

const REQUIRED_COLUMNS = ['name', 'email', 'role', 'date', 'time', 'location'];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year, month) {
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[month - 1];
}

function isCalendarDate(year, month, day) {
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > daysInMonth(year, month)) return false;
  return true;
}

// Accepts YYYY-MM-DD (ISO), and M/D/YYYY or M-D-YYYY (American month-day-year,
// with or without leading zeros). Returns { year, month, day } or null.
function parseDate(value) {
  let match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const [, y, m, d] = match.map(Number);
    return isCalendarDate(y, m, d) ? { year: y, month: m, day: d } : null;
  }

  match = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match) {
    const month = Number(match[1]);
    const day = Number(match[2]);
    const year = Number(match[3]);
    return isCalendarDate(year, month, day) ? { year, month, day } : null;
  }

  return null;
}

function formatDateISO({ year, month, day }) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}`;
}

// Accepts "H:MM AM/PM" explicitly, or a bare "H:MM"/"HH:MM" with no period —
// the bare form is read as 24-hour notation, which also covers "single digit,
// no AM/PM means morning" as a special case (1-9 in 24-hour time is always AM).
// Returns { hour12, minute, period } or null.
function parseTime(value) {
  let match = value.match(/^(\d{1,2}):([0-5]\d)\s*(AM|PM)$/i);
  if (match) {
    const hour = Number(match[1]);
    if (hour < 1 || hour > 12) return null;
    return { hour12: hour, minute: match[2], period: match[3].toUpperCase() };
  }

  match = value.match(/^(\d{1,2}):([0-5]\d)$/);
  if (match) {
    const hour24 = Number(match[1]);
    if (hour24 > 23) return null;
    const period = hour24 < 12 ? 'AM' : 'PM';
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    return { hour12, minute: match[2], period };
  }

  return null;
}

function formatTime12h({ hour12, minute, period }) {
  return `${hour12}:${minute} ${period}`;
}

function duplicateKey(row) {
  return [row.name, row.role, row.date, row.time, row.location]
    .map((v) => (v || '').trim().toLowerCase())
    .join('|');
}

function validate(headers, rawRows) {
  const normalizedHeaders = headers.map((h) => h.trim().toLowerCase());
  const missingColumns = REQUIRED_COLUMNS.filter(
    (col) => !normalizedHeaders.includes(col)
  );

  if (missingColumns.length > 0) {
    return {
      ok: false,
      missingColumns,
      cleanedRows: [],
      flaggedRows: [],
      summary: null,
    };
  }

  // Trim every field on every row first, so downstream checks and the
  // duplicate key never trip over stray whitespace.
  const trimmedRows = rawRows.map((row) => {
    const trimmed = {};
    Object.keys(row).forEach((key) => {
      trimmed[key.trim()] = (row[key] || '').trim();
    });
    return trimmed;
  });

  const seenKeys = new Map(); // duplicateKey -> count seen so far
  let missingEmailCount = 0;
  let duplicateCount = 0;
  let invalidDateCount = 0;
  let invalidTimeCount = 0;

  const cleanedRows = [];
  const flaggedRows = [];

  trimmedRows.forEach((row) => {
    const reasons = [];

    REQUIRED_COLUMNS.forEach((col) => {
      if (!row[col]) {
        reasons.push(`Missing ${col}`);
        if (col === 'email') missingEmailCount++;
      }
    });

    if (row.email && !EMAIL_PATTERN.test(row.email)) {
      reasons.push('Invalid email format');
    }

    // Normalize date/time when parseable; otherwise leave the raw value in
    // place so the flagged-rows list still shows the coordinator what they typed.
    let normalizedDate = row.date;
    if (row.date) {
      const parsedDate = parseDate(row.date);
      if (parsedDate) {
        normalizedDate = formatDateISO(parsedDate);
      } else {
        reasons.push('Invalid date (try YYYY-MM-DD, MM/DD/YYYY, or MM-DD-YYYY)');
        invalidDateCount++;
      }
    }

    let normalizedTime = row.time;
    if (row.time) {
      const parsedTime = parseTime(row.time);
      if (parsedTime) {
        normalizedTime = formatTime12h(parsedTime);
      } else {
        reasons.push('Invalid time (try HH:MM 24-hour, or H:MM AM/PM)');
        invalidTimeCount++;
      }
    }

    const normalizedRow = { ...row, date: normalizedDate, time: normalizedTime };

    const key = duplicateKey(normalizedRow);
    const seenCount = seenKeys.get(key) || 0;
    seenKeys.set(key, seenCount + 1);
    if (seenCount > 0) {
      reasons.push('Duplicate assignment (same name, role, date, time, location)');
      duplicateCount++;
    }

    if (reasons.length > 0) {
      flaggedRows.push({ ...normalizedRow, reasons });
    } else {
      cleanedRows.push(normalizedRow);
    }
  });

  const summary = {
    totalRows: trimmedRows.length,
    validRows: cleanedRows.length,
    flaggedRows: flaggedRows.length,
    missingEmails: missingEmailCount,
    duplicates: duplicateCount,
    invalidDates: invalidDateCount,
    invalidTimes: invalidTimeCount,
  };

  return { ok: true, missingColumns: [], cleanedRows, flaggedRows, summary };
}

export { validate, REQUIRED_COLUMNS };
