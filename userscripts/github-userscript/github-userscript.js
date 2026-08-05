// ==UserScript==
// @name         GitHub: tags and conventional commit badges
// @namespace    local
// @version      4.1
// @description  Labels tagged commits and highlights conventional-commit prefixes in GitHub commit lists
// @match        https://github.com/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // Optional. Fine-grained PAT, Contents: Read-only, scoped to the repos you
  // browse. Required for private repos; also raises the 60 req/hour anonymous
  // limit to 5000. Note a fine-grained token only reaches repos on its
  // allowlist -- public repos outside it return 403.
  const TOKEN = '';

  const FEATURES = { tags: true, conventional: true };

  // 100 tags per request; stops early on a short batch. 20 covers 2000 tags.
  const MAX_PAGES = 20;

  const CLS = 'ud-tag-label';

  const CC_COLORS = {
    feat:     ['#1f6feb30', '#6cb0ff'],  // blue: new
    fix:      ['#f8514930', '#ff7b72'],  // red: something was broken
    refactor: ['#a371f730', '#bc8cff'],  // purple: reshaping
    test:     ['#d2992230', '#e3b341'],  // yellow: caution/lab
    ci:       ['#db6d2830', '#f0883e'],  // orange: pipelines
    build:    ['#a1793d30', '#d3a760'],  // bronze: tooling
    chore:    ['#8b949e30', '#adbac7'],  // grey: housekeeping
    docs:     ['#2eb0b830', '#39c5cf'],  // cyan: information
    perf:     ['#3fb95030', '#56d364'],  // green: go faster
    style:    ['#db61a230', '#f778ba'],  // pink: cosmetic
    lint:     ['#db61a230', '#f778ba'],  // pink: cosmetic (same as style)
    revert:   ['#c93c3730', '#e5827c'],  // dark red: undo
  };

  // GitHub's own tag-16 Octicon.
  const TAG_ICON =
    `<svg class="${CLS}-i" viewBox="0 0 16 16" width="12" height="12" ` +
    `fill="currentColor" aria-hidden="true">` +
    `<path d="M1 7.775V2.75C1 1.784 1.784 1 2.75 1h5.025c.464 0 .91.184 1.238.513l6.25 6.25a1.75 1.75 0 0 1 0 2.474l-5.026 5.026a1.75 1.75 0 0 1-2.474 0l-6.25-6.25A1.752 1.752 0 0 1 1 7.775Zm1.5 0c0 .066.026.13.073.177l6.25 6.25a.25.25 0 0 0 .354 0l5.025-5.025a.25.25 0 0 0 0-.354l-6.25-6.25a.25.25 0 0 0-.177-.073H2.75a.25.25 0 0 0-.25.25ZM6 5a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"/>` +
    `</svg>`;

  document.head.append(Object.assign(document.createElement('style'), {
    textContent: `
      .${CLS}{margin-left:8px;font-size:12px;font-weight:500;
        white-space:nowrap;text-decoration:none;
        color:var(--fgColor-muted,#8b949e)}
      .${CLS}:hover{color:var(--fgColor-accent,#4493f8);text-decoration:none}
      .${CLS}-i{vertical-align:-2px;margin-right:4px}
      .${CLS}-cc{margin-right:6px;padding:0 4px;border-radius:3px;
        font-size:inherit;
        background:var(--cc-bg);color:var(--cc-fg)}
      .${CLS}-cc[data-bang]{box-shadow:inset 0 0 0 1px var(--cc-fg)}
    `,
  }));

  let slug = null;      // "owner/name" the loaded tags belong to
  let tags = null;
  let pending = null;

  const repoFromPath = () =>
    location.pathname.match(/^\/([^/]+)\/([^/]+)\/commits(\/|$)/)
      ?.slice(1, 3).join('/') ?? null;

  async function fetchTags(s) {
    const map = {};
    let ok = false;
    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = await fetch(
        `https://api.github.com/repos/${s}/tags?per_page=100&page=${page}`,
        { headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {} }
      );
      if (!res.ok) {
        console.warn('[gh-tags]', res.status, await res.text());
        break;
      }
      ok = true;
      const batch = await res.json();
      for (const t of batch) (map[t.commit.sha] ??= []).push(t.name);
      if (batch.length < 100) break;
    }
    return ok ? map : null;
  }

  // Rewrites the "feat(api)!: " prefix into a coloured badge, leaving the rest
  // of the message untouched -- including <code> spans and issue links.
  function conventional(link) {
    if (link.dataset.ccDone) return;

    const first = link.firstChild;
    if (!first || first.nodeType !== 3) return;   // must start with text

    const m = first.data.match(/^\s*([a-z]+)(\([^)]*\))?(!)?:\s+/);
    if (!m || !CC_COLORS[m[1]]) return;

    const [, type, scope, bang] = m;
    const [bg, fg] = CC_COLORS[type];

    const badge = document.createElement('span');
    badge.className = `${CLS}-cc`;
    badge.textContent = type + (scope ?? '') + (bang ?? '') + ':';
    badge.style.setProperty('--cc-bg', bg);
    badge.style.setProperty('--cc-fg', fg);
    if (bang) badge.dataset.bang = '';

    first.data = first.data.slice(m[0].length);   // strip prefix in place
    link.prepend(badge);
    link.dataset.ccDone = '1';
  }

  function decorate() {
    const re = new RegExp(`^/${slug}/commit/([0-9a-f]{40})$`);
    // One query per pass rather than one per tagged commit.
    const seen = new Set(
      [...document.querySelectorAll(`.${CLS}[data-sha]`)].map(n => n.dataset.sha)
    );

    for (const link of document.querySelectorAll('a[href*="/commit/"]')) {
      if (FEATURES.conventional) conventional(link);
      if (!FEATURES.tags || !tags) continue;

      const sha = link.pathname.match(re)?.[1];
      if (!sha || !tags[sha]) continue;
      // Each row links the commit twice (message and short SHA); dedupe by SHA.
      if (seen.has(sha)) continue;

      // Append to the end of the metadata row, after the timestamp and CI
      // status. GitHub hydrates <relative-time> asynchronously, so a miss here
      // is retried on a later pass rather than marked as handled.
      const meta = link.closest('li, .Box-row, tr')?.querySelector('relative-time');
      if (!meta) continue;
      seen.add(sha);

      for (const name of tags[sha]) {
        const el = document.createElement('a');
        el.className = CLS;
        el.dataset.sha = sha;
        el.href = `/${slug}/releases/tag/${encodeURIComponent(name)}`;
        el.title = `tag: ${name}`;
        el.innerHTML = TAG_ICON;   // literal markup only
        el.append(name);           // tag name stays plain text
        meta.parentElement.append(el);
      }
    }
  }

  async function sync() {
    const s = repoFromPath();
    if (!s) {
      // Left the commits page: drop state so returning refetches.
      slug = null; tags = null; pending = null;
      return;
    }
    if (s !== slug) {
      document.querySelectorAll(`.${CLS}`).forEach(n => n.remove());
      slug = s;
      tags = null;
      pending = FEATURES.tags
        ? fetchTags(s).then(m => { if (slug === s) tags = m; })
        : null;
    }
    if (pending) await pending;
    if (repoFromPath() === slug) decorate();
  }

  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; sync(); });
  };

  schedule();
  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
