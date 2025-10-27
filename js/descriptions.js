
'use strict';

let allTweets = [];            // all Tweet instances
let searchable = [];           // completed_event + written == true

/** Escape HTML to avoid breaking the table. */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/** Highlight all matches of the regex (case-insensitive) with <mark>. */
function highlight(text, regex) {
  // Split into pieces so we can safely escape *then* wrap matches.
  const parts = [];
  let last = 0, m;
  while ((m = regex.exec(text)) !== null) {
    parts.push(escapeHtml(text.slice(last, m.index)));
    parts.push('<mark>' + escapeHtml(m[0]) + '</mark>');
    last = m.index + m[0].length;
    // prevent zero-length match loops
    if (m.index === regex.lastIndex) regex.lastIndex++;
  }
  parts.push(escapeHtml(text.slice(last)));
  return parts.join('');
}

/** Build one table row. Prefer Tweet.getHTMLTableRow if your class implements it. */
function buildRow(tweet, idx, termRegex, useHelper) {
  if (useHelper && typeof tweet.getHTMLTableRow === 'function') {
    // Your Tweet.getHTMLTableRow(idx) should already include link + safe HTML.
    return tweet.getHTMLTableRow(idx);
  }
  // Otherwise build a minimal row here.
  const urlMatch = tweet.text.match(/https?:\/\/\S+/);
  const url = urlMatch ? urlMatch[0] : '#';
  // Prefer highlighting the user-written portion if available; otherwise the full text.
  const body = (typeof tweet.writtenText === 'string' && tweet.writtenText.length > 0)
    ? tweet.writtenText
    : tweet.text;
  const html = highlight(body, termRegex);
  return `
    <tr>
      <th scope="row">${idx}</th>
      <td>${escapeHtml(tweet.activityType)}</td>
      <td><a href="${escapeHtml(url)}" target="_blank" rel="noopener">${html}</a></td>
    </tr>`;
}

/** Apply filter from the input box, update count text and table. */
function applyFilter(rawTerm) {
  const term = (rawTerm || '').trim();
  const countSpan = document.getElementById('searchCount');
  const termSpan  = document.getElementById('searchText');
  const tbody     = document.getElementById('tweetTable');

  termSpan.textContent = term;
  if (term.length === 0) {
    countSpan.textContent = '0';
    tbody.innerHTML = '';
    return;
  }

  // Escape user term to build a safe RegExp, case-insensitive + global for highlighting.
  const safe = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(safe, 'ig');

  const matches = searchable.filter(t => {
    const hay = (typeof t.writtenText === 'string' && t.writtenText.length > 0) ? t.writtenText : t.text;
    return re.test(hay);
  });

  countSpan.textContent = String(matches.length);

  const useHelper = typeof matches[0]?.getHTMLTableRow === 'function';
  tbody.innerHTML = matches.map((t, i) => buildRow(t, i + 1, new RegExp(safe, 'ig'), useHelper)).join('');
}

/** Entry: load JSON → Tweet objects → wire up input. */
function parseTweets(runkeeper_tweets) {
  if (!Array.isArray(runkeeper_tweets)) {
    window.alert('No tweets returned');
    return;
  }

  // Map raw objects → Tweet instances (class defined in js/tweet.js)
  allTweets = runkeeper_tweets.map(t => new Tweet(t.text, t.created_at));

  // Only completed events with user-written text
  searchable = allTweets.filter(t => t.source === 'completed_event' && t.written === true);

  // Hook up the input
  const input = document.getElementById('textFilter');
  if (input) {
    // Live filter as the user types
    input.addEventListener('input', () => applyFilter(input.value));
  }

  // Initial state: clear table and counts
  applyFilter('');
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  loadSavedRunkeeperTweets().then(parseTweets);
});
