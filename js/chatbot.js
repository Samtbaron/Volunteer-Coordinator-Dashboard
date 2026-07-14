import { AppState } from './state.js';

// Rule-based, not AI — this pattern-matches schedule questions against the cleaned
// rows in AppState, and general questions against a static FAQ list. No network calls.

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const STOP_WORDS = new Set([
  'who', 'is', 'volunteering', 'on', 'the', 'a', 'for', 'what', 'time', 'does',
  'shift', 'start', 'starts', 'where', 'when', 'at', 'to', 'in', 'of', 'and',
  'is', 'are', 'working', 'this', 'that', 'me', 'tell', 'please', 'do',
]);

let rows = [];

// FAQs volunteers commonly ask organizers directly — folding these into the
// chatbot is the whole point of this view, so organizers stop fielding them 1:1.
const FAQ_ENTRIES = [
  {
    keywords: ['bring', 'what to bring'],
    answer: "Bring a refillable water bottle, closed-toe shoes, and weather-appropriate layers. Name tags and any role-specific gear (aprons, gloves, etc.) are provided at check-in.",
  },
  {
    keywords: ['dress code', 'wear', 'what to wear'],
    answer: "Wear closed-toe shoes and clothes you don't mind getting a little messy. We provide a volunteer T-shirt at check-in — feel free to wear one from a past event too.",
  },
  {
    keywords: ['park', 'parking'],
    answer: "Volunteer parking is in the North Parking Lot. It's about a 2-minute walk to check-in at the Riverside Community Center.",
  },
  {
    keywords: ['check in', 'check-in', 'checkin'],
    answer: "Check in at the Info Booth at least 15 minutes before your shift starts. A coordinator will confirm your role and point you to your station.",
  },
  {
    keywords: ['late', 'cancel', "can't make it", 'cant make it', 'no show'],
    answer: "Life happens — call or text the Volunteer Hotline at (555) 010-2938 as early as you can so we can adjust coverage.",
  },
  {
    keywords: ['rain', 'weather', 'storm'],
    answer: "Outdoor shifts run rain or shine unless there's a severe weather alert. If something's cancelled, everyone scheduled gets a text at least 2 hours ahead.",
  },
  {
    keywords: ['contact', 'questions', 'who do i talk to', 'phone number', 'email'],
    answer: "For day-of questions, text the Volunteer Hotline at (555) 010-2938. For anything else, email volunteer@example.org.",
  },
  {
    keywords: ['break', 'snack', 'food', 'lunch'],
    answer: "Shifts longer than 3 hours include a 15-minute break, and light snacks and water are available at the Info Booth all day.",
  },
  {
    keywords: ['training', 'first time', 'new volunteer', 'never volunteered'],
    answer: "No experience needed — your station lead will walk you through everything in the first 5 minutes of your shift.",
  },
];

function matchFaq(question) {
  const lower = question.toLowerCase();
  return FAQ_ENTRIES.find((entry) => entry.keywords.some((kw) => lower.includes(kw))) || null;
}

function isoDateForDayName(dayName) {
  // Rows carry their own real dates, so instead of guessing "which Saturday"
  // we just match every row whose date falls on that weekday.
  const targetIndex = DAY_NAMES.indexOf(dayName);
  return (row) => {
    const [year, month, day] = row.date.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCDay() === targetIndex;
  };
}

function significantTokens(question) {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s:-]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function matchByNameOrRole(question) {
  const tokens = significantTokens(question);
  if (tokens.length === 0) return [];
  return rows.filter((row) => {
    const haystack = `${row.name} ${row.role}`.toLowerCase();
    return tokens.some((token) => haystack.includes(token));
  });
}

function formatShift(row) {
  return `${row.name} — ${row.role}, ${row.date} at ${row.time} (${row.location})`;
}

function handleQuestion(rawQuestion) {
  const question = rawQuestion.trim();
  if (!question) return "Ask me something — try one of the suggestions below.";

  // FAQs are static and don't need a schedule loaded, so check these first.
  const faqMatch = matchFaq(question);
  if (faqMatch) return faqMatch.answer;

  if (rows.length === 0) {
    return "I don't have a schedule loaded to check yet — ask an organizer to load the roster, or click \"Load sample roster\" above to see a demo.";
  }

  const lower = question.toLowerCase();

  const isoDateMatch = lower.match(/\d{4}-\d{2}-\d{2}/);
  const dayNameMatch = DAY_NAMES.find((day) => lower.includes(day));

  // "Who is volunteering on <day or date>"
  if (lower.includes('who') && (isoDateMatch || dayNameMatch)) {
    const matches = isoDateMatch
      ? rows.filter((row) => row.date === isoDateMatch[0])
      : rows.filter(isoDateForDayName(dayNameMatch));

    if (matches.length === 0) {
      return `No shifts found for ${isoDateMatch ? isoDateMatch[0] : dayNameMatch}.`;
    }
    return `${matches.length} shift${matches.length === 1 ? '' : 's'} on ${isoDateMatch ? isoDateMatch[0] : dayNameMatch}:\n` +
      matches.map((row) => `• ${row.name} — ${row.role} at ${row.time} (${row.location})`).join('\n');
  }

  // "How many volunteers / shifts"
  if (lower.includes('how many')) {
    if (lower.includes('volunteer')) {
      const unique = new Set(rows.map((r) => r.name.toLowerCase())).size;
      return `There are ${unique} unique volunteers scheduled across ${rows.length} shifts.`;
    }
    return `There are ${rows.length} shifts scheduled in total.`;
  }

  // "What time does X start" / "What time is X"
  if (lower.includes('time')) {
    const matches = matchByNameOrRole(question);
    if (matches.length === 0) {
      return `I couldn't find a shift matching that. Try asking with a volunteer's name or a role, e.g. "what time does Registration start".`;
    }
    return matches.map((row) => `${row.name}'s ${row.role} shift starts at ${row.time} on ${row.date}.`).join('\n');
  }

  // "Where is X volunteering"
  if (lower.includes('where')) {
    const matches = matchByNameOrRole(question);
    if (matches.length === 0) {
      return `I couldn't find a shift matching that. Try including the volunteer's name.`;
    }
    return matches.map((row) => `${row.name} is at ${row.location} for ${row.role} on ${row.date}.`).join('\n');
  }

  // Fallback: try a general name/role match before giving up.
  const generalMatches = matchByNameOrRole(question);
  if (generalMatches.length > 0) {
    return generalMatches.map(formatShift).join('\n');
  }

  return "I didn't catch that. Try a schedule question like \"who is volunteering Saturday\", or a general question like \"what should I bring\" or \"where do I park\".";
}

function onStateChange(state) {
  rows = state.cleanedRows;
}

function initChatbot() {
  AppState.subscribe(onStateChange);
}

export { initChatbot, handleQuestion };
