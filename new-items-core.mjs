export const sections = ['events', 'jobs', 'internships'];
export function chinaDay(value = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date(value));
}
export function readState(raw, today = chinaDay()) {
  try {
    const state = JSON.parse(raw);
    if (/^\d{4}-\d{2}-\d{2}$/.test(state.since) && sections.every(key => Array.isArray(state.read[key]) && state.read[key].every(id => typeof id === 'string'))) return state;
  } catch { /* A first visit or invalid stored data starts with today's additions. */ }
  return { since: today, read: { events: [], jobs: [], internships: [] } };
}
export function unread(items, state, section) {
  const seen = new Set(state.read[section]);
  return [...new Map(items.filter(item => item.addedDate >= state.since && !seen.has(item.id)).map(item => [item.id, item])).values()]
    .sort((a, b) => b.addedDate.localeCompare(a.addedDate) || (a.sortAt || a.title).localeCompare(b.sortAt || b.title));
}
export function markRead(state, section, items) {
  return { ...state, read: { ...state.read, [section]: [...new Set([...state.read[section], ...items.map(item => item.id)])] } };
}
function literalJson(source) {
  let output = '';
  for (let i = 0; i < source.length;) {
    const char = source[i];
    if (char === '"') {
      const start = i++;
      for (; i < source.length; i++) { if (source[i] === '\\') i++; else if (source[i] === '"') { i++; break; } }
      output += source.slice(start, i);
    } else if (char === '/' && source[i + 1] === '/') {
      i = source.indexOf('\n', i); if (i < 0) break;
    } else if (char === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2); if (end < 0) throw new Error('Incomplete comment'); i = end + 2;
    } else if (/[A-Za-z_$]/.test(char)) {
      const start = i++; while (/[\w$]/.test(source[i] || '') && i < source.length) i++;
      const word = source.slice(start, i);
      output += /^\s*:/.test(source.slice(i)) ? JSON.stringify(word) : word;
    } else if (char === ',' && /^\s*[\]}]/.test(source.slice(i + 1))) i++;
    else { output += char; i++; }
  }
  return JSON.parse(output);
}
export function extractJobs(html) {
  const match = /\bconst\s+jobs\s*=\s*\[/.exec(html);
  if (!match) throw new Error('Missing jobs data');
  const start = match.index + match[0].lastIndexOf('[');
  let depth = 0, quoted = false, escaped = false;
  for (let i = start; i < html.length; i++) {
    const char = html[i];
    if (!quoted && char === '/' && html[i + 1] === '/') { const end = html.indexOf('\n', i); if (end < 0) break; i = end; continue; }
    if (!quoted && char === '/' && html[i + 1] === '*') { const end = html.indexOf('*/', i + 2); if (end < 0) break; i = end + 1; continue; }
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === '[') depth++;
    else if (char === ']' && --depth === 0) return literalJson(html.slice(start, i + 1));
  }
  throw new Error('Incomplete jobs data');
}
export function jobItem(job) {
  return { id: JSON.stringify([job.company, job.title, job.url]), company: job.company, title: job.title, addedDate: job.addedDate || '', meta: [job.city, job.district].filter(Boolean).join(' · ') };
}
