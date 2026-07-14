import { AppState } from './state.js';

// Keep references to the live Chart.js instances so we can destroy them before
// redrawing — otherwise Chart.js stacks a new canvas context on top of the old
// one every time a new CSV is loaded and the charts get slower and glitchy.
let dayChart = null;
let roleChart = null;

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function countByDay(rows) {
  const counts = {}; // 'YYYY-MM-DD' -> count
  rows.forEach((row) => {
    counts[row.date] = (counts[row.date] || 0) + 1;
  });
  // Sort chronologically so the bar chart reads left-to-right as a timeline.
  return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
}

function countByRole(rows) {
  const counts = {};
  rows.forEach((row) => {
    counts[row.role] = (counts[row.role] || 0) + 1;
  });
  return Object.entries(counts).sort(([, a], [, b]) => b - a);
}

function dayLabel(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return `${DAY_NAMES[date.getUTCDay()].slice(0, 3)} ${month}/${day}`;
}

function renderKPIs(state) {
  document.getElementById('kpi-total-shifts').textContent = state.cleanedRows.length;
  document.getElementById('kpi-unique-volunteers').textContent = new Set(
    state.cleanedRows.map((r) => r.name.toLowerCase())
  ).size;
  document.getElementById('kpi-missing-emails').textContent = state.summary.missingEmails;
  document.getElementById('kpi-duplicates').textContent = state.summary.duplicates;
}

function renderDayChart(rows) {
  const entries = countByDay(rows);
  const ctx = document.getElementById('chart-by-day').getContext('2d');

  if (dayChart) dayChart.destroy();
  dayChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: entries.map(([date]) => dayLabel(date)),
      datasets: [
        {
          label: 'Shifts',
          data: entries.map(([, count]) => count),
          backgroundColor: '#2B5D45',
          borderRadius: 4,
          maxBarThickness: 40,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#E4DCC6' } },
        x: { grid: { display: false } },
      },
    },
  });
}

function renderRoleChart(rows) {
  const entries = countByRole(rows);
  const ctx = document.getElementById('chart-by-role').getContext('2d');
  const palette = ['#2B5D45', '#E0932C', '#B5482F', '#5B7F9E', '#8A6A9E', '#C9A227', '#4E8B7A', '#9E5B3F'];

  if (roleChart) roleChart.destroy();
  roleChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: entries.map(([role]) => role),
      datasets: [
        {
          data: entries.map(([, count]) => count),
          backgroundColor: entries.map((_, i) => palette[i % palette.length]),
          borderColor: '#F6F2E9',
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { boxWidth: 12, font: { family: "'IBM Plex Sans', sans-serif" } },
        },
      },
    },
  });
}

function render(state) {
  if (!state.summary) return;
  renderKPIs(state);
  renderDayChart(state.cleanedRows);
  renderRoleChart(state.cleanedRows);
  document.getElementById('dashboard-empty').hidden = true;
  document.getElementById('dashboard-content').hidden = false;
}

function initDashboard() {
  AppState.subscribe(render);
}

// Charts can be created while the organizer view is hidden (display: none) —
// e.g. a volunteer loads the sample roster from the header while on the
// Volunteer view — which leaves Chart.js measuring a zero-size canvas. Call
// this when the organizer view becomes visible to force a correct re-measure.
function resizeCharts() {
  if (dayChart) dayChart.resize();
  if (roleChart) roleChart.resize();
}

export { initDashboard, resizeCharts };
