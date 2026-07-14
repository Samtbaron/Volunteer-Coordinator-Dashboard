import { AppState } from './state.js';

let rows = [];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function friendlyDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${DAY_NAMES[date.getUTCDay()]}, ${monthNames[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

function draftReminder(row) {
  const subject = `Reminder: your ${row.role} shift on ${friendlyDate(row.date)}`;
  const body = `Hi ${row.name},

This is a quick reminder about your upcoming volunteer shift:

  Role:     ${row.role}
  Date:     ${friendlyDate(row.date)}
  Time:     ${row.time}
  Location: ${row.location}

If anything's changed and you can no longer make it, please let us know as soon as you can so we can find coverage.

Thanks for volunteering — we couldn't do this without you!`;

  return `Subject: ${subject}\n\n${body}`;
}

function populateSelect() {
  const select = document.getElementById('reminder-shift-select');
  select.innerHTML = '';

  if (rows.length === 0) {
    const option = document.createElement('option');
    option.textContent = 'No shifts loaded yet';
    select.appendChild(option);
    select.disabled = true;
    return;
  }

  select.disabled = false;
  rows.forEach((row, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `${row.name} — ${row.role}, ${row.date} ${row.time}`;
    select.appendChild(option);
  });
}

function onStateChange(state) {
  rows = state.cleanedRows;
  populateSelect();
  document.getElementById('reminder-output').value = '';
}

function initReminders() {
  AppState.subscribe(onStateChange);

  document.getElementById('generate-reminder-btn').addEventListener('click', () => {
    const select = document.getElementById('reminder-shift-select');
    const index = Number(select.value);
    const output = document.getElementById('reminder-output');

    if (Number.isNaN(index) || !rows[index]) {
      output.value = '';
      return;
    }
    output.value = draftReminder(rows[index]);
  });

  document.getElementById('copy-reminder-btn').addEventListener('click', async () => {
    const output = document.getElementById('reminder-output');
    if (!output.value) return;

    const btn = document.getElementById('copy-reminder-btn');
    try {
      await navigator.clipboard.writeText(output.value);
      const original = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = original; }, 1500);
    } catch (err) {
      output.select();
    }
  });
}

export { initReminders };
