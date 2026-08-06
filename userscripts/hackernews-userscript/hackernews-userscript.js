// ==UserScript==
// @name         Hacker News — Comfortable Dark Mode
// @namespace    https://news.ycombinator.com/
// @version      5.2
// @description  A warm, low-contrast dark theme for Hacker News, with tighter comment indenting and infinite scroll.
// @author       you
// @match        https://news.ycombinator.com/*
// @run-at       document-start
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Theme                                                               */
  /* ------------------------------------------------------------------ */

  const css = `
    :root {
      --hn-bg:        #16161a;  /* page background */
      --hn-surface:   #1c1c21;  /* main content panel */
      --hn-surface-2: #232329;  /* inputs, code blocks */
      --hn-border:    #32323a;
      --hn-text:      #d6d3cd;  /* body/comment text, warm off-white */
      --hn-title:     #ece8e2;  /* story titles — brightest thing on the page */
      --hn-dim:       #78746f;  /* metadata, timestamps, points */
      --hn-dimmer:    #605d59;
      --hn-visited:   #97928b;
      --hn-accent:    #e07a3f;  /* softened HN orange */
      --hn-accent-bg: #2a1e17;
    }

    html, body {
      background: var(--hn-bg) !important;
      color: var(--hn-text) !important;
    }

    body, td, th, p, div, span, a, input, textarea, select, pre, code, li {
      color: var(--hn-text);
      -webkit-font-smoothing: antialiased;
    }

    /* ---- Layout containers ---- */
    #hnmain {
      background: var(--hn-surface) !important;
      border: 1px solid var(--hn-border);
      border-radius: 6px;
    }
    table, tbody, tr, td { background-color: transparent !important; }

    /* ---- Top bar ---- */
    td[bgcolor="#ff6600"], tr[bgcolor="#ff6600"], .pagetop {
      background: var(--hn-accent-bg) !important;
    }
    .pagetop, .pagetop a, .pagetop a:link, .pagetop a:visited {
      color: var(--hn-text) !important;
    }
    .pagetop b a, .pagetop b {
      color: var(--hn-accent) !important;
      font-weight: 700;
    }
    .pagetop a:hover { color: var(--hn-accent) !important; }
    img[src*="y18"] {
      border-color: var(--hn-accent) !important;
      opacity: 0.85;
    }

    /* ---- Story listings ---- */
    .titleline a:link, .storylink, .titlelink,
    .athing .title a:link {
      color: var(--hn-title) !important;
      font-weight: 500;
    }
    .titleline a:visited, .storylink:visited, .titlelink:visited,
    .athing .title a:visited {
      color: var(--hn-visited) !important;
    }
    .titleline a:hover { color: var(--hn-accent) !important; }

    .rank, .title, .sitestr, .sitebit, .sitebit a,
    .subtext, .subline, .subtext a, .subline a,
    .age, .age a, .score, .hnuser, .comhead, .comhead a {
      color: var(--hn-dim) !important;
    }
    .hnuser:hover, .subtext a:hover, .subline a:hover, .age a:hover {
      color: var(--hn-accent) !important;
    }

    /* ---- Comments ---- */
    .comment, .commtext, .commtext a {
      color: var(--hn-text) !important;
    }
    .commtext a, .comment a { text-decoration: underline; text-underline-offset: 2px; }
    .commtext a:hover { color: var(--hn-accent) !important; }

    /* HN dims downvoted comments via these classes — remap so they stay readable */
    .c00, .c00 a:link { color: var(--hn-text) !important; }
    .c5a, .c5a a:link { color: #bab6b0 !important; }
    .c73, .c73 a:link { color: #a9a5a0 !important; }
    .c82, .c82 a:link { color: #9d9994 !important; }
    .c88, .c88 a:link { color: #949089 !important; }
    .c9c, .c9c a:link { color: #8a8680 !important; }
    .cae, .cae a:link { color: #807c77 !important; }
    .cbe, .cbe a:link { color: #78746f !important; }
    .cce, .cce a:link { color: #6f6b66 !important; }
    .cdd, .cdd a:link { color: #67635e !important; }

    .comhead .togg, .togg { color: var(--hn-dimmer) !important; }
    .coll { color: var(--hn-dim) !important; }
    .athing:target { background: #24242b !important; }

    /* ---- Reply link ---- */
    /* HN wraps it in a literal <u>, which stacks with the comment-link
       underline and makes it look broken. Strip both, treat it as a control. */
    .reply { margin-top: 6px; }
    .reply p { margin: 0; }
    .reply u { text-decoration: none !important; }
    .reply a, .reply a:link, .reply a:visited, .reply font, .reply u a {
      color: var(--hn-dim) !important;
      text-decoration: none !important;
      font-size: 11px;
      letter-spacing: 0.03em;
      text-transform: lowercase;
    }
    .reply a:hover, .reply u a:hover {
      color: var(--hn-accent) !important;
      text-decoration: none !important;
    }

    /* ---- Date nav links ---- */
    /* HN puts the underline on the .hnmore SPAN, not the link inside it, so
       the rule is drawn in the span's colour while the <a> colours only the
       glyphs. Move the decoration onto the link so the two always match. */
    .hnmore { text-decoration: none !important; }
    .hnmore a, .hnmore a:link, .hnmore a:visited {
      text-decoration: underline !important;
    }
    .hnmore a:hover { color: var(--hn-accent) !important; }

    /* ---- Vote arrows (dark GIFs, so invert them) ---- */
    .votearrow, .votelinks a, .votelinks img,
    img[src*="grayarrow"], img[src*="triangle"] {
      filter: invert(0.72) hue-rotate(180deg) brightness(0.95);
    }

    /* ---- Forms & inputs ---- */
    input, textarea, select, button {
      background: var(--hn-surface-2) !important;
      color: var(--hn-text) !important;
      border: 1px solid var(--hn-border) !important;
      border-radius: 4px;
    }
    input:focus, textarea:focus {
      outline: none !important;
      border-color: var(--hn-accent) !important;
    }
    input[type="submit"], button { cursor: pointer; }
    input[type="submit"]:hover, button:hover {
      border-color: var(--hn-accent) !important;
      color: var(--hn-accent) !important;
    }

    /* ---- Footer / misc ---- */
    .yclinks, .yclinks a { color: var(--hn-dim) !important; }
    .yclinks a:hover { color: var(--hn-accent) !important; }
    .morelink, a.morelink {
      color: var(--hn-accent) !important;
      font-weight: 600;
    }
    hr, table[border] { border-color: var(--hn-border) !important; }
    td[bgcolor="#f6f6ef"], .default, .admin {
      background: transparent !important;
      color: var(--hn-text) !important;
    }

    pre, code {
      background: var(--hn-surface-2) !important;
      color: #cfc9c1 !important;
      border-radius: 4px;
      padding: 1px 4px;
    }
    pre { padding: 8px 10px; overflow-x: auto; }

    /* ---- Vertical rhythm ---- */
    tr.spacer { height: 9px !important; }
    tr.athing td.title { vertical-align: baseline !important; }
    /* Fixed width so the column doesn't re-measure when ranks reach three
       digits mid-scroll. Numbers are right-aligned, so single and double
       digits just gain space on the left — visually unchanged. */
    tr.athing td.title:first-child {
      width: 2em;
      min-width: 2em;
      padding-left: 10px;
      padding-right: 6px;
      white-space: nowrap;
    }
    .rank {
      color: var(--hn-dimmer) !important;
      font-size: 0.8em;
      line-height: 1.5;
    }
    .subtext, .subline { display: inline-block; padding-top: 0; }

    tr.athing.comtr td.default { padding-bottom: 6px; }
    .comment-tree { margin-left: 12px; }
    .comhead { padding-bottom: 2px; display: inline-block; }

    /* ---- Readability ---- */
    .commtext { line-height: 1.55; }
    .titleline { line-height: 1.5; }
    .titleline .sitebit, .titleline .sitestr { font-size: 0.92em; }

    ::selection { background: var(--hn-accent); color: #16161a; }
    ::-webkit-scrollbar { width: 12px; height: 12px; }
    ::-webkit-scrollbar-track { background: var(--hn-bg); }
    ::-webkit-scrollbar-thumb {
      background: #3a3a42; border-radius: 6px; border: 3px solid var(--hn-bg);
    }
    ::-webkit-scrollbar-thumb:hover { background: #4a4a54; }
  `;

  /* ------------------------------------------------------------------ */
  /* Comment indent width                                                */
  /* ------------------------------------------------------------------ */
  // HN indents replies with a spacer GIF sized indent*40px, so the step isn't
  // a CSS property we can shrink. Hide the image and drive the cell width off
  // the indent attribute instead.

  const INDENT_STEP = 26; // px per nesting level (HN's default is 40)

  let indentCss = 'td.ind img { display: none !important; }\n';
  for (let i = 0; i <= 60; i++) {
    indentCss += `td.ind[indent="${i}"] { width: ${i * INDENT_STEP}px !important; min-width: ${i * INDENT_STEP}px !important; }\n`;
  }

  // Inject immediately so there's no white flash before the page paints.
  const style = css + indentCss;
  if (typeof GM_addStyle === 'function') {
    GM_addStyle(style);
  } else {
    const el = document.createElement('style');
    el.textContent = style;
    (document.head || document.documentElement).appendChild(el);
  }

  const meta = document.createElement('meta');
  meta.name = 'color-scheme';
  meta.content = 'dark';
  (document.head || document.documentElement).appendChild(meta);

  /* ------------------------------------------------------------------ */
  /* Infinite scroll                                                     */
  /* ------------------------------------------------------------------ */
  // Appends the next page's rows into the existing table. The "More" row is
  // reused rather than replaced, so its position is stable and the observer
  // never needs re-attaching.

  function initInfiniteScroll() {
    const moreLink = document.querySelector('a.morelink');
    if (!moreLink) return; // last page, or a page without pagination

    const moreRow = moreLink.closest('tr');
    const tbody = moreRow.parentNode;
    let loading = false;

    async function loadNext() {
      if (loading) return;
      loading = true;
      moreLink.dataset.label = moreLink.dataset.label || moreLink.textContent;
      moreLink.textContent = 'Loading…';

      try {
        const res = await fetch(moreLink.href, { credentials: 'same-origin' });
        if (!res.ok) throw new Error('HTTP ' + res.status);

        const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
        const nextMore = doc.querySelector('a.morelink');

        // Rows to append: everything in the source table except its own
        // spacer/More footer, which we already have.
        const nextMoreRow = nextMore ? nextMore.closest('tr') : null;
        const srcBody = nextMoreRow
          ? nextMoreRow.parentNode
          : doc.querySelector('tr.athing')?.parentNode;

        if (!srcBody) throw new Error('no rows found');

        const frag = document.createDocumentFragment();
        for (const row of Array.from(srcBody.children)) {
          if (row === nextMoreRow) continue;
          if (row.classList.contains('morespace')) continue;
          frag.appendChild(document.importNode(row, true));
        }

        // Insert above the spacer/More footer so it stays at the bottom.
        const prev = moreRow.previousElementSibling;
        const anchor = prev && prev.classList.contains('morespace') ? prev : moreRow;
        tbody.insertBefore(frag, anchor);

        if (nextMore) {
          // Keep it relative, as HN serves it.
          moreLink.setAttribute('href', nextMore.getAttribute('href'));
          moreLink.textContent = moreLink.dataset.label;
          loading = false;
          // Re-run the check: if the footer is still on screen after
          // appending, load the following page too.
          observer.unobserve(moreRow);
          observer.observe(moreRow);
        } else {
          observer.disconnect();
          moreRow.remove();
        }
      } catch (err) {
        console.error('[HN dark] infinite scroll:', err);
        moreLink.textContent = moreLink.dataset.label;
        loading = false;
      }
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) loadNext();
    }, { rootMargin: '1200px' });

    observer.observe(moreRow);

    // Clicking "More" still works as a manual fallback.
    moreLink.addEventListener('click', (e) => {
      e.preventDefault();
      loadNext();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInfiniteScroll);
  } else {
    initInfiniteScroll();
  }
})();
