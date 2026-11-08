// LeiBox adaptations: Fluid Tooltip, Tactile Push Button, Sailing Toc.
// Sources, original notices and adaptation details: ./NOTICE.md
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const styleURL = new URL('./site-interactions.css', import.meta.url).href;
const scriptURL = import.meta.url;
const animate = (element, frames, duration = 220) => {
  if (element && !reduced.matches) element.animate(frames, {duration, easing: 'cubic-bezier(.2,.8,.2,1)'});
};

function navigation() {
  document.documentElement.dataset.uiPage = 'shell';
  const rail = document.querySelector('.switcher');
  const tabs = [...rail.querySelectorAll('[role=tab]')];
  const indicator = document.createElement('span');
  indicator.className = 'ei-nav-indicator'; indicator.setAttribute('aria-hidden', 'true'); rail.prepend(indicator);
  function position() {
    const selected = tabs.find(tab => tab.getAttribute('aria-selected') === 'true');
    if (!selected) return;
    indicator.style.transform = `translate(${selected.offsetLeft}px,${selected.offsetTop}px)`;
    indicator.style.width = selected.offsetWidth + 'px'; indicator.style.height = selected.offsetHeight + 'px';
  }
  new ResizeObserver(position).observe(rail);
  new MutationObserver(position).observe(rail, {subtree: true, attributes: true, attributeFilter: ['aria-selected']});
  rail.addEventListener('keydown', event => {
    const index = tabs.indexOf(document.activeElement); if (index < 0) return;
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault(); tabs[next].focus();
  });
  const frame = document.querySelector('#content');
  function enhance() {
    const doc = frame.contentDocument; if (!doc?.head || frame.contentWindow.location.href === 'about:blank' || doc.querySelector('[data-ei-interactions]')) return;
    const link = doc.createElement('link'); link.rel = 'stylesheet'; link.href = styleURL;
    const script = doc.createElement('script'); script.type = 'module'; script.src = scriptURL; script.dataset.eiInteractions = '';
    doc.head.append(link, script);
    animate(frame, [{opacity: .92, transform: 'translateY(5px)'}, {opacity: 1, transform: 'none'}]);
  }
  frame.addEventListener('load', enhance); enhance(); position();
}

function pageInteractions() {
  const page = location.pathname.split('/').pop() || 'events';
  document.documentElement.dataset.uiPage = page;
  const progress = document.createElement('div'); progress.className = 'ei-reading-progress'; progress.setAttribute('aria-hidden', 'true');
  const top = document.createElement('button'); top.type = 'button'; top.className = 'tactile-button ei-backtop'; top.hidden = true;
  top.setAttribute('aria-label', '返回页面顶部');
  // Original LeiBox tactile surface structure, recoloured to the calendar's blue.
  top.innerHTML = '<span class="button-outer"><span class="button-inner"><span>↑ 返回顶部</span></span></span>';
  top.addEventListener('click', () => window.scrollTo({top: 0, behavior: reduced.matches ? 'instant' : 'smooth'}));
  document.body.append(progress, top);
  let frame = 0;
  const update = () => {
    frame = 0; const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
    top.hidden = scrollY < 420;
    if (reader) updateQuestion();
  };
  const request = () => { if (!frame) frame = requestAnimationFrame(update); };
  window.addEventListener('scroll', request, {passive: true}); window.addEventListener('resize', request);
  const resize = new ResizeObserver(request); resize.observe(document.body);
  window.addEventListener('pagehide', () => {resize.disconnect(); cancelAnimationFrame(frame);}, {once: true});

  // Keep the existing copy success/failure message as the authoritative result.
  const toast = document.createElement('div'); toast.className = 'ei-copy-toast'; toast.setAttribute('aria-hidden', 'true'); toast.hidden = true;
  document.body.append(toast); let toastTimer;
  for (const button of document.querySelectorAll('[data-copy-status]')) {
    const status = document.getElementById(button.dataset.copyStatus); if (!status) continue;
    new MutationObserver(() => {
      const success = /已复制|复制成功/.test(status.textContent) && !/失败/.test(status.textContent);
      button.classList.toggle('ei-copy-done', success);
      if (success) { clearTimeout(toastTimer); toast.textContent = '✓ 已复制，可粘贴使用'; toast.hidden = false; toastTimer = setTimeout(() => {toast.hidden = true;}, 2400); }
    }).observe(status, {childList: true, subtree: true, characterData: true});
  }
  document.addEventListener('click', event => {
    const entry = event.target.closest('[data-tool-target]');
    if (entry) requestAnimationFrame(() => animate(document.getElementById(entry.dataset.toolTarget), [{opacity: .9, transform: 'translateY(8px)'}, {opacity: 1, transform: 'none'}], 260));
  });

  let reader, anchors = [], links = [], active = -1;
  if (page === 'interview.html') {
    anchors = [...document.querySelectorAll('.question-anchor')]; links = [...document.querySelectorAll('#toc-groups a')];
    reader = document.createElement('nav'); reader.className = 'ei-reader'; reader.setAttribute('aria-label', '面试题阅读导航');
    reader.innerHTML = '<button type="button" data-reader="previous" aria-label="上一道题">‹</button><span class="ei-reader-current"></span><button type="button" data-reader="contents">目录</button><button type="button" data-reader="next" aria-label="下一道题">›</button>';
    document.body.append(reader);
    reader.addEventListener('click', event => {
      const action = event.target.closest('[data-reader]')?.dataset.reader; if (!action) return;
      if (action === 'contents') { const toc = document.querySelector('.toc'); toc.open = true; toc.scrollIntoView({behavior: reduced.matches ? 'instant' : 'smooth', block: 'start'}); toc.querySelector('summary').focus({preventScroll: true}); return; }
      const next = Math.max(0, Math.min(anchors.length - 1, active + (action === 'next' ? 1 : -1)));
      anchors[next]?.scrollIntoView({behavior: reduced.matches ? 'instant' : 'smooth', block: 'start'});
    });
  }
  function updateQuestion() {
    // Sailing Toc's scroll-follow selection, mapped onto the original 100 anchors.
    let left = 0, right = anchors.length - 1, current = 0;
    while (left <= right) { const mid = (left + right) >> 1; if (anchors[mid].getBoundingClientRect().top <= 48) {current = mid; left = mid + 1;} else right = mid - 1; }
    if (active === current) return; active = current;
    reader.querySelector('.ei-reader-current').textContent = `${active + 1} / ${anchors.length} · ${links[active].textContent}`;
    reader.querySelector('[data-reader=previous]').disabled = active === 0;
    reader.querySelector('[data-reader=next]').disabled = active === anchors.length - 1;
    links.forEach((link, index) => index === active ? link.setAttribute('aria-current', 'location') : link.removeAttribute('aria-current'));
  }
  update();
}

if (document.querySelector('#content') && window.parent === window) navigation();
else pageInteractions();
reduced.addEventListener('change', () => { if (reduced.matches) document.getAnimations().forEach(animation => animation.cancel()); });
