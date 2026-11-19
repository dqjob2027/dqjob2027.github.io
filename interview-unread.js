const storageKey = 'eiCalendarInterviewRead.groupGuide.v1';
const badge = document.getElementById('interview-unread');

if (badge) {
  const tab = badge.closest('button');
  const updateBadge = () => {
    let read = false;
    try { read = localStorage.getItem(storageKey) === '1'; } catch { /* Keep the unread reminder when storage is unavailable. */ }
    badge.hidden = read;
    tab.setAttribute('aria-label', read ? '面试' : '面试，1条未读新增');
  };

  updateBadge();
  window.addEventListener('storage', event => {
    if (event.key === storageKey || event.key === null) updateBadge();
  });
  window.addEventListener('pageshow', updateBadge);
} else if (document.getElementById('guide-title')) {
  try { localStorage.setItem(storageKey, '1'); } catch { /* The guide remains usable without storage. */ }
}
