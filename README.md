# Volunteer Coordinator Dashboard

A static web app for community organizations to manage a volunteer shift roster — clean up messy CSV exports, see the schedule at a glance, and give volunteers a self-serve way to find their shifts and get answers without pinging an organizer.

**Live demo:** https://samtbaron.github.io/Volunteer-Coordinator-Assistant/

## What it does

The app has two views, switched from the header — same data underneath, different audience:

**Volunteer view**
- **Find my shifts** — type a name to look up upcoming shifts, styled as ticket-stub cards
- **Before you arrive** — quick reference cards (what to bring, dress code, parking/check-in, weather policy, day-of contact)
- **Ask a question** — a rule-based chatbot that answers both schedule questions ("who's on Saturday?", "what time does Registration start?") and general FAQs ("what should I bring?", "where do I park?")

**Organizer view**
- **Roster health check** — upload a CSV and get a validation report: missing fields, malformed emails, duplicate assignments, and invalid dates/times, each with a plain-English reason
- **At a glance** — KPI cards (total shifts, unique volunteers, missing emails, duplicates) plus shifts-by-day and shifts-by-role charts
- **Send a nudge** — generates a draft reminder email per shift, ready to copy and send

CSV dates and times are read in several common formats (`YYYY-MM-DD`, `MM/DD/YYYY`, `MM-DD-YYYY`, 24-hour or 12-hour time) and normalized automatically, so it tolerates real-world spreadsheet exports rather than requiring one exact format.

A small fictional sample roster (`sample-data/sample-roster.csv`) is included and loads automatically on page load, so the app is fully populated the moment it's opened — no setup needed to see it working. A second, messier file (`sample-data/upload-demo-roster.csv`) is included for testing the **Upload roster CSV** button by hand — download it, then upload it, to see the validation report catch a byte-order-mark from Excel, a raw decimal time value from a misformatted time cell, an invalid date, a bad email, a missing email, and a duplicate row.

## Tech stack

Plain HTML, CSS, and JavaScript (ES modules) — no framework, no build step, no backend. [Chart.js](https://www.chartjs.org/) is loaded via CDN for the two charts; everything else is hand-written. All processing happens client-side in the browser; nothing is uploaded to a server.

## Running it locally

Because the app fetches the sample CSV with `fetch()`, it needs to be served over `http://`, not opened directly as a `file://` URL. Any static file server works, for example:

```bash
python -m http.server 3000
# then open http://localhost:3000
```

## Project structure

```
index.html
styles.css
sample-data/
  sample-roster.csv       # fictional demo roster (loads automatically)
  upload-demo-roster.csv  # messier test file for manually testing the upload button
js/
  state.js                # shared in-memory store (pub/sub)
  parser.js                # CSV text -> row objects
  validator.js              # cleaning, validation, date/time normalization
  dashboard.js              # KPI cards + Chart.js charts
  chatbot.js                # rule-based schedule Q&A + FAQ matching
  reminders.js               # reminder email draft generator
  lookup.js                 # volunteer "find my shifts" + quick facts
  util.js                   # shared HTML-escaping helper
  app.js                    # wires DOM events to the modules above
```

## A note on AI collaboration

This project was built in collaboration with [Claude Code](https://claude.com/claude-code), Anthropic's AI coding assistant. I set the direction throughout — the feature scope, the two-audience (volunteer/organizer) structure, explicit constraints like staying fully static with no backend, and the call to decline adding a live LLM integration to keep the demo self-contained and free to host. I reviewed the app in-browser at each stage, asked follow-up questions about tradeoffs (like GitHub Pages visibility and public-link reliability), and directed several rounds of bug fixes.

Claude Code handled the implementation: writing the HTML/CSS/JS, the validation and normalization logic, the visual design, and catching and fixing issues I wouldn't have thought to check for myself (a CSS specificity bug in the view switcher, an Excel byte-order-mark parsing bug, and resilience fallbacks for CDN failures, among others).

I'm sharing this openly because I think how a person directs and reviews AI-assisted work is itself a relevant skill — this project is as much a demonstration of that as it is of the code itself.
