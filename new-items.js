import { sections, readState, unread, markRead, extractJobs, jobItem } from './new-items-core.mjs';

const frame = document.querySelector('#content');
const labels = { events: '招聘活动', jobs: '找工作', internships: '找实习' };
const paths = { events: './events/', jobs: './jobs.html', internships: './internships.html' };
const tabs = Object.fromEntries(sections.map(key => [key, document.querySelector(`[data-page="${paths[key]}"]`)]));
const catalog = { events: [], jobs: [], internships: [] };
const loaded = new Set();
const storageKey = 'eiCalendarUnread.v1';
let state = readState(null), shown = null, pending = null, readySection = null;
function storedState() {
  try { return readState(localStorage.getItem(storageKey) || JSON.stringify(state)); } catch { return state; }
}
function save(next) {
  state = next;
  try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* Reading remains usable when persistent storage is unavailable. */ }
}
save(storedState());
const activeSection = () => sections.find(key => tabs[key].getAttribute('aria-selected') === 'true');
const badges = Object.fromEntries(sections.map(key => {
  const badge = document.createElement('span');
  badge.className = 'new-count'; badge.hidden = true; badge.setAttribute('aria-hidden', 'true');
  tabs[key].append(badge);
  return [key, badge];
}));
const dialog = document.createElement('dialog');
dialog.className = 'new-items-dialog'; dialog.id = 'new-items-dialog';
dialog.setAttribute('aria-labelledby', 'new-items-title'); dialog.setAttribute('aria-describedby', 'new-items-hint');
dialog.innerHTML = '<div class="new-items-head"><div><p>本次新增</p><h2 id="new-items-title"></h2></div><button type="button" class="new-items-close" aria-label="关闭新增提醒">关闭</button></div><p id="new-items-hint">点击一条信息可查看具体内容。关闭后，该栏目的本次提醒会标为已读。</p><div class="new-items-list"></div><div class="new-items-foot"><button type="button">我知道了</button></div>';
document.body.append(dialog);
function positionDialog() { dialog.style.setProperty('--new-items-top', `${Math.ceil(document.querySelector('.site-nav').getBoundingClientRect().bottom) + 12}px`); }
window.addEventListener('resize', positionDialog);
function updateBadges() {
  for (const key of sections) {
    const count = unread(catalog[key], state, key).length;
    badges[key].textContent = count > 99 ? '99+' : String(count);
    badges[key].hidden = count === 0;
    tabs[key].setAttribute('aria-label', count ? `${labels[key]}，${count}条未读新增` : labels[key]);
  }
}
function showNew() {
  const key = activeSection();
  if (!key || readySection !== key || !loaded.has(key) || dialog.open) return;
  state = storedState();
  const items = unread(catalog[key], state, key);
  updateBadges();
  if (!items.length) return;
  shown = { key, items };
  const total = document.createElement('span'); total.className = 'new-items-total'; total.textContent = `新增${items.length}${key === 'events' ? '场' : '条'}`;
  dialog.querySelector('h2').replaceChildren(document.createTextNode(`${labels[key]} · `), total);
  const list = dialog.querySelector('.new-items-list'); list.replaceChildren();
  let day = '';
  for (const item of items) {
    if (item.addedDate !== day) {
      day = item.addedDate;
      const heading = document.createElement('h3'); heading.textContent = `${day} 新增`; list.append(heading);
    }
    const row = document.createElement('button'); row.type = 'button'; row.className = 'new-item';
    const title = document.createElement('strong'); title.textContent = item.company ? `${item.company} · ${item.title}` : item.title;
    const meta = document.createElement('span'); meta.textContent = item.meta || '';
    const action = document.createElement('span'); action.className = 'new-item-action'; action.textContent = key === 'events' ? '查看活动 →' : '查看岗位 →';
    row.append(title, meta, action);
    row.addEventListener('click', () => { pending = { key, item }; dialog.close(); });
    list.append(row);
  }
  list.scrollTop = 0; positionDialog(); dialog.showModal();
}
function locate({ key, item }) {
  if (key === 'events') {
    frame.contentWindow.postMessage({ type: 'ei-open-event', id: item.id }, location.origin);
    return;
  }
  const doc = frame.contentDocument;
  doc.querySelector('#resetButton')?.click();
  const card = [...doc.querySelectorAll('.job-card')].find(card => card.querySelector('.company-name')?.textContent === item.company && card.querySelector('.job-title')?.textContent === item.title);
  if (!card) return;
  let style = doc.querySelector('#new-item-highlight-style');
  if (!style) { style = doc.createElement('style'); style.id = 'new-item-highlight-style'; style.textContent = '.new-item-highlight{outline:3px solid #1f5fbf;outline-offset:4px}'; doc.head.append(style); }
  doc.querySelectorAll('.new-item-highlight').forEach(el => el.classList.remove('new-item-highlight'));
  card.classList.add('new-item-highlight'); card.tabIndex = -1; card.focus({ preventScroll: true }); card.scrollIntoView({ block: 'center', behavior: 'instant' });
}
dialog.querySelectorAll('.new-items-close, .new-items-foot button').forEach(button => button.addEventListener('click', () => dialog.close()));
dialog.addEventListener('click', event => { const r = dialog.getBoundingClientRect(); if (event.target === dialog && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)) dialog.close(); });
dialog.addEventListener('close', () => {
  if (shown) { save(markRead(storedState(), shown.key, shown.items)); updateBadges(); tabs[shown.key].focus({ preventScroll: true }); shown = null; }
  if (pending) { const target = pending; pending = null; locate(target); }
});
window.addEventListener('storage', event => { if (event.key === storageKey) { state = storedState(); updateBadges(); } });
window.addEventListener('message', event => {
  if (event.origin !== location.origin || event.source !== frame.contentWindow || event.data?.type !== 'ei-event-updates' || !Array.isArray(event.data.items)) return;
  catalog.events = event.data.items.filter(item => typeof item.id === 'string' && typeof item.title === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.addedDate));
  loaded.add('events'); updateBadges(); showNew();
});
function frameReady() {
  readySection = activeSection();
  if (activeSection() === 'events') frame.contentWindow.postMessage({ type: 'ei-request-updates' }, location.origin);
  else showNew();
}
frame.addEventListener('load', frameReady);
Object.values(tabs).forEach(tab => tab.addEventListener('click', () => { readySection = null; }));
if (frame.contentDocument?.readyState === 'complete') frameReady();
for (const key of ['jobs', 'internships']) {
  fetch(paths[key], { cache: 'no-store' }).then(response => { if (!response.ok) throw new Error('Unable to load updates'); return response.text(); }).then(html => {
    catalog[key] = extractJobs(html).map(jobItem); loaded.add(key); updateBadges(); if (activeSection() === key) showNew();
  }).catch(error => console.warn(labels[key] + '新增提醒暂未加载', error));
}
