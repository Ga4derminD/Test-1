(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const search = byId('guide-search');
  const clear = byId('clear-search');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const entries = [...document.querySelectorAll('.entry')];
  const navEntries = [...document.querySelectorAll('.nav-entry')];
  const chapters = [...document.querySelectorAll('.guide-chapter')];
  const achievementGroups = [...document.querySelectorAll('.achievement-group')];
  const groups = [...document.querySelectorAll('.nav-group')];
  const sidebar = byId('sidebar');
  let filter = '全部';
  let searching = false;
  let previousGroupState = [];
  const normalize = value => value.toLocaleLowerCase().replace(/[\s·，。、“”‘’（）()：:]/g, '');
  const haystacks = new WeakMap();
  [...entries, ...navEntries].forEach(el => haystacks.set(el, normalize(el.dataset.search)));

  function applyFilters(moveToResults = false) {
    const terms = search.value.trim().split(/\s+/).filter(Boolean).map(normalize);
    const restricted = terms.length > 0 || filter !== '全部';
    if (restricted && !searching) previousGroupState = groups.map(group => group.open);
    if (!restricted && searching) groups.forEach((group, i) => group.open = previousGroupState[i]);
    searching = restricted;
    const matches = el => (filter === '全部' || el.dataset.kind === filter) && terms.every(term => haystacks.get(el).includes(term));
    let visibleQuests = 0, visibleAchievements = 0;
    entries.forEach(el => {
      el.hidden = !matches(el);
      if (!el.hidden) el.dataset.kind === '成就' ? visibleAchievements++ : visibleQuests++;
    });
    navEntries.forEach(el => el.hidden = !matches(el));
    chapters.forEach(chapter => chapter.hidden = ![...chapter.querySelectorAll('.entry')].some(el => !el.hidden));
    achievementGroups.forEach(group => group.hidden = ![...group.querySelectorAll('.entry')].some(el => !el.hidden));
    byId('achievements').hidden = restricted && !visibleAchievements;
    groups.forEach(group => {
      group.hidden = ![...group.querySelectorAll('.nav-entry')].some(el => !el.hidden);
      if (restricted && !group.hidden) group.open = true;
    });
    byId('no-results').hidden = visibleQuests + visibleAchievements > 0;
    byId('results-bar').hidden = !restricted;
    byId('results-label').textContent = `${terms.length ? `搜索“${search.value.trim()}” · ` : ''}${filter}：${visibleQuests} 条任务与事件，${visibleAchievements} 个成就`;
    byId('search-status').textContent = restricted ? `找到 ${visibleQuests + visibleAchievements} 条内容 · 点击目录直达` : '按行进路线排列 · 点击直达正文';
    clear.hidden = !search.value;
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
    if (moveToResults) {
      closeDrawer();
      requestAnimationFrame(() => byId(visibleQuests + visibleAchievements ? 'results-bar' : 'no-results').scrollIntoView({block: 'start'}));
    }
  }
  function resetFilters() {
    search.value = '';
    filter = '全部';
    applyFilters();
  }
  search.addEventListener('input', () => applyFilters());
  search.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      applyFilters(true);
    }
    if (event.key === 'Escape') { resetFilters(); search.focus(); }
  });
  clear.addEventListener('click', () => { search.value = ''; applyFilters(); search.focus(); });
  filters.forEach(button => button.addEventListener('click', () => { filter = button.dataset.filter; applyFilters(true); }));
  byId('reset-filters').addEventListener('click', resetFilters);
  byId('empty-reset').addEventListener('click', () => { resetFilters(); search.focus(); });

  function openDrawer() {
    sidebar.classList.add('open');
    document.body.classList.add('drawer-open');
    byId('drawer-backdrop').hidden = false;
    byId('menu-toggle').setAttribute('aria-expanded', 'true');
    search.focus({preventScroll:true});
  }
  function closeDrawer() {
    sidebar.classList.remove('open');
    document.body.classList.remove('drawer-open');
    byId('drawer-backdrop').hidden = true;
    byId('menu-toggle').setAttribute('aria-expanded', 'false');
  }
  byId('menu-toggle').addEventListener('click', () => sidebar.classList.contains('open') ? closeDrawer() : openDrawer());
  byId('menu-close').addEventListener('click', () => { closeDrawer(); byId('menu-toggle').focus(); });
  byId('drawer-backdrop').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && sidebar.classList.contains('open')) { closeDrawer(); byId('menu-toggle').focus(); }
    if (event.key === 'Tab' && sidebar.classList.contains('open')) {
      const focusable = [...sidebar.querySelectorAll('a,button,input,summary')].filter(el => el.getClientRects().length && !el.hidden);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  window.matchMedia('(min-width:761px)').addEventListener('change', event => { if(event.matches) closeDrawer(); });

  function activateNav(target, reveal = false) {
    const active = navEntries.find(el => el.hash === `#${target.id}`);
    navEntries.forEach(el => {
      const selected = el === active;
      el.classList.toggle('active', selected);
      if (selected) el.setAttribute('aria-current', 'location');
      else el.removeAttribute('aria-current');
    });
    if (reveal && active) {
      active.closest('details').open = true;
      const directory = document.querySelector('.directory');
      directory.scrollTop += active.getBoundingClientRect().top - directory.getBoundingClientRect().top - directory.clientHeight / 3;
    }
  }
  function visitHash(hash, focus = true) {
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
    const target = byId(id);
    if (!target) return;
    if (target.hidden || target.closest('[hidden]')) resetFilters();
    closeDrawer();
    activateNav(target, true);
    requestAnimationFrame(() => {
      target.scrollIntoView({block:'start'});
      if (focus && target.matches('.entry')) target.focus({preventScroll:true});
    });
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const target = byId(link.hash.slice(1));
    if (!target) return;
    event.preventDefault();
    if (link.hash !== location.hash) history.pushState(null, '', link.hash);
    visitHash(link.hash);
  });
  window.addEventListener('hashchange', () => visitHash(location.hash, false));
  window.addEventListener('popstate', () => visitHash(location.hash, false));
  if (location.hash) requestAnimationFrame(() => visitHash(location.hash, false));

  const observer = new IntersectionObserver(changes => {
    const visible = changes.filter(change => change.isIntersecting).sort((a,b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (visible.length) activateNav(visible[0].target);
  }, {rootMargin:'-12% 0px -58% 0px',threshold:0});
  entries.forEach(entry => observer.observe(entry));
  let scrollQueued = false;
  function updateTopButton() { byId('back-to-top').hidden = window.scrollY < 500; scrollQueued = false; }
  window.addEventListener('scroll', () => { if(!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateTopButton); } }, {passive:true});
  updateTopButton();

  const storageKey = 'dos2-guide-achievements-v2';
  const checks = [...document.querySelectorAll('[data-achievement]')];
  let saved = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (Array.isArray(parsed)) saved = parsed;
  } catch {
    byId('progress-storage').textContent = '此浏览器暂不能保存记录；当前页面仍可勾选。';
  }
  function updateProgress(persist = false) {
    const complete = checks.filter(check => check.checked).map(check => check.dataset.achievement);
    byId('achievement-count').textContent = complete.length;
    byId('achievement-progress').value = complete.length;
    checks.forEach(check => check.closest('.achievement-card').classList.toggle('completed', check.checked));
    if (persist) {
      try { localStorage.setItem(storageKey, JSON.stringify(complete)); }
      catch { byId('progress-storage').textContent = '此浏览器暂不能保存记录；当前页面仍可勾选。'; }
    }
  }
  checks.forEach(check => {
    check.checked = saved.includes(check.dataset.achievement);
    check.addEventListener('change', () => updateProgress(true));
  });
  updateProgress();
})();
