// Turns raw CSV text into { headers, rows }. Rows are plain objects keyed by header name.
// Handles quoted fields (e.g. "Smith, John" or fields containing escaped "" quotes) so a
// location or name with a comma in it doesn't break the columns.

function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++; // skip the escaped quote's pair
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

function parseCSV(text) {
  const lines = text
    .split(/\r\n|\n|\r/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseCSVLine(lines[0]).map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const fields = parseCSVLine(line);
    const row = {};
    headers.forEach((header, i) => {
      row[header] = fields[i] !== undefined ? fields[i] : '';
    });
    return row;
  });

  return { headers, rows };
}

export { parseCSV };
