# Volunteer Coordinator Dashboard

A static web app for community organizations to manage a volunteer shift roster — clean up messy CSV exports, see the schedule at a glance, and give volunteers a self-serve way to find their shifts and get answers without pinging an organizer.

**Live demo:** https://samtbaron.github.io/Volunteer-Coordinator-Dashboard/

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

I built this project using Claude Code, Anthropic's AI coding assistant, as my implementation partner. My role was the one a developer plays on any project: I owned the architecture, the technical requirements, and the quality bar the app had to meet.

I designed the two-view structure (volunteer vs. organizer) around a single shared data model, specified the module breakdown (parser, validator, dashboard, chatbot, reminders, lookup), and made the core technical calls — no framework, no build step, no backend, everything client-side. I set the constraint that CSV parsing had to tolerate real-world spreadsheet exports (multiple date/time formats, BOM characters, malformed cells) rather than assuming clean input, and defined what the validation report needed to catch and how it should explain each issue in plain English. I also made the call to keep the chatbot rule-based instead of wiring in a live LLM, to keep the demo self-contained, free to host, and reliable as a public link.

Claude Code wrote the code to those specs. I reviewed every stage in-browser, tested edge cases myself, and drove multiple rounds of debugging — including a CSS specificity bug in the view switcher, an Excel byte-order-mark issue in CSV parsing, and fallback handling for CDN failures. When something didn't work the way I wanted, I diagnosed the problem, decided on the fix, and had Claude Code implement it.

I'm sharing this openly because directing and quality-checking AI-assisted development is itself a real technical skill, and I think this project demonstrates that as much as it demonstrates the app itself.

