import { parseCSV } from './parser.js';
import { validate } from './validator.js';
import { AppState } from './state.js';
import { initDashboard, resizeCharts } from './dashboard.js';
import { initChatbot, handleQuestion } from './chatbot.js';
import { initReminders } from './reminders.js';
import { initLookup } from './lookup.js';
import { escapeHtml } from './util.js';

function renderValidationSummary(state) {
  const section = document.getElementById('validation-summary');
  const empty = document.getElementById('validation-empty');
  const content = document.getElementById('validation-content');

  empty.hidden = true;
  content.hidden = false;

  document.getElementById('source-label').textContent = state.sourceLabel;
  document.getElementById('stamp-text').textContent =
    `${state.summary.validRows} VALID · ${state.summary.flaggedRows} FLAGGED`;

  document.getElementById('stat-total').textContent = state.summary.totalRows;
  document.getElementById('stat-valid').textContent = state.summary.validRows;
  document.getElementById('stat-flagged').textContent = state.summary.flaggedRows;
  document.getElementById('stat-missing-emails').textContent = state.summary.missingEmails;
  document.getElementById('stat-duplicates').textContent = state.summary.duplicates;
  document.getElementById('stat-invalid-dates').textContent = state.summary.invalidDates;
  document.getElementById('stat-invalid-times').textContent = state.summary.invalidTimes;

  const list = document.getElementById('flagged-list');
  list.innerHTML = '';

  if (state.flaggedRows.length === 0) {
    const li = document.createElement('li');
    li.className = 'flagged-list__empty';
    li.textContent = 'No flagged rows — every row passed validation.';
    list.appendChild(li);
  } else {
    state.flaggedRows.forEach((row) => {
      const li = document.createElement('li');
      li.className = 'flagged-list__item';
      li.innerHTML = `<strong>${escapeHtml(row.name || '(no name)')}</strong> — ${escapeHtml(row.role || '(no role)')}, ${escapeHtml(row.date || '?')} ${escapeHtml(row.time || '?')} ` +
        `<span class="flagged-list__reasons">${escapeHtml(row.reasons.join('; '))}</span>`;
      list.appendChild(li);
    });
  }

  section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showParseError(message) {
  const empty = document.getElementById('validation-empty');
  empty.hidden = false;
  empty.textContent = message;
  document.getElementById('validation-content').hidden = true;
}

function processCSVText(text, sourceLabel) {
  const { headers, rows } = parseCSV(text);

  if (headers.length === 0) {
    showParseError('That file looks empty. Upload a CSV with a header row and at least one shift.');
    return;
  }

  const result = validate(headers, rows);

  if (!result.ok) {
    showParseError(
      `Missing required column${result.missingColumns.length > 1 ? 's' : ''}: ${result.missingColumns.join(', ')}. ` +
      `Required columns are: name, email, role, date, time, location.`
    );
    return;
  }

  AppState.setData({
    cleanedRows: result.cleanedRows,
    flaggedRows: result.flaggedRows,
    summary: result.summary,
    sourceLabel,
  });

  renderValidationSummary(AppState);
  document.getElementById('upload-filename').textContent = sourceLabel;
}

function initUpload() {
  const input = document.getElementById('csv-upload');
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => processCSVText(reader.result, `Uploaded: ${file.name}`);
    reader.onerror = () => showParseError('Could not read that file. Please try again.');
    reader.readAsText(file);
  });
}

function initSampleLoader() {
  document.getElementById('load-sample-btn').addEventListener('click', async () => {
    try {
      const response = await fetch('sample-data/sample-roster.csv');
      if (!response.ok) throw new Error('fetch failed');
      const text = await response.text();
      processCSVText(text, 'Sample roster');
    } catch (err) {
      showParseError('Could not load the sample roster. If you opened this file directly (file://), serve it over a local web server instead.');
    }
  });
}

function appendChatMessage(role, text) {
  const log = document.getElementById('chat-log');
  const message = document.createElement('div');
  message.className = `chat-message chat-message--${role}`;
  message.textContent = text;
  log.appendChild(message);
  log.scrollTop = log.scrollHeight;
}

function initChatUI() {
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question) return;

    appendChatMessage('user', question);
    appendChatMessage('bot', handleQuestion(question));
    input.value = '';
    input.focus();
  });

  document.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      input.value = chip.dataset.question;
      form.requestSubmit();
    });
  });
}

function setView(view) {
  document.getElementById('view-volunteer').hidden = view !== 'volunteer';
  document.getElementById('view-organizer').hidden = view !== 'organizer';

  document.querySelectorAll('.view-nav__btn').forEach((btn) => {
    const active = btn.dataset.view === view;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', String(active));
  });

  if (view === 'organizer') resizeCharts();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initViewRouter() {
  document.querySelectorAll('.view-nav__btn').forEach((btn) => {
    btn.addEventListener('click', () => setView(btn.dataset.view));
  });
}

function init() {
  initUpload();
  initSampleLoader();
  initDashboard();
  initChatbot();
  initReminders();
  initLookup();
  initChatUI();
  initViewRouter();
}

document.addEventListener('DOMContentLoaded', init);
