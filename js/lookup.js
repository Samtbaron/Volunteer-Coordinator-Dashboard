import { AppState } from './state.js';
import { escapeHtml } from './util.js';

let rows = [];

function findShifts(query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return rows.filter((row) => row.name.toLowerCase().includes(needle));
}

function renderQuickFacts() {
  const el = document.getElementById('quick-facts');
  if (rows.length === 0) {
    el.hidden = true;
    return;
  }
  const dates = [...new Set(rows.map((r) => r.date))].sort();
  const locations = new Set(rows.map((r) => r.location));
  el.hidden = false;
  el.textContent =
    `Schedule loaded: ${dates[0]} to ${dates[dates.length - 1]} · ` +
    `${locations.size} location${locations.size === 1 ? '' : 's'} · ` +
    `${rows.length} shift${rows.length === 1 ? '' : 's'} total.`;
}

function renderResults(query) {
  const container = document.getElementById('lookup-results');

  if (rows.length === 0) {
    container.innerHTML = '<p class="lookup-empty">No schedule has been loaded yet. Click <strong>Load sample roster</strong> above to see a demo schedule.</p>';
    return;
  }

  if (!query.trim()) {
    container.innerHTML = '<p class="lookup-empty">Enter your name above to see your upcoming shifts.</p>';
    return;
  }

  const matches = findShifts(query);

  if (matches.length === 0) {
    container.innerHTML = `<p class="lookup-empty">We couldn't find a shift under "${escapeHtml(query)}". Double-check the spelling, or contact your organizer.</p>`;
    return;
  }

  const list = document.createElement('div');
  list.className = 'shift-ticket-list';

  matches.forEach((row) => {
    const ticket = document.createElement('article');
    ticket.className = 'shift-ticket';
    ticket.innerHTML = `
      <p class="shift-ticket__role">${escapeHtml(row.role)}</p>
      <hr class="shift-ticket__divider">
      <p class="shift-ticket__meta">
        <span>${escapeHtml(row.date)} at ${escapeHtml(row.time)}</span>
        <span>${escapeHtml(row.location)}</span>
      </p>`;
    list.appendChild(ticket);
  });

  container.innerHTML = '';
  container.appendChild(list);
}

function onStateChange(state) {
  rows = state.cleanedRows;
  renderQuickFacts();
  renderResults(document.getElementById('lookup-input').value);
}

function initLookup() {
  AppState.subscribe(onStateChange);

  const form = document.getElementById('lookup-form');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    renderResults(document.getElementById('lookup-input').value);
  });

  renderResults('');
}

export { initLookup };
