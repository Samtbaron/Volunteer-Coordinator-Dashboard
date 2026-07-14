// Single shared in-memory store. No localStorage/sessionStorage per project constraints —
// state lives only for the current page session, which is fine since this is a demo/utility tool.
const AppState = {
  cleanedRows: [],
  flaggedRows: [],
  summary: null,
  sourceLabel: '', // "Uploaded: myfile.csv" or "Sample roster" — shown in the UI so it's clear what's loaded

  _listeners: [],

  // Modules call this once, at init, to be notified whenever new data lands.
  subscribe(fn) {
    this._listeners.push(fn);
  },

  // The only place state is written. Called by app.js after parsing + validating a CSV.
  setData({ cleanedRows, flaggedRows, summary, sourceLabel }) {
    this.cleanedRows = cleanedRows;
    this.flaggedRows = flaggedRows;
    this.summary = summary;
    this.sourceLabel = sourceLabel;
    this._listeners.forEach((fn) => fn(this));
  },
};

export { AppState };
