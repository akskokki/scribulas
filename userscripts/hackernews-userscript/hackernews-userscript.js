// ==UserScript==
// @name         Hacker News — Comfortable Dark Mode
// @namespace    https://news.ycombinator.com/
// @version      2.9
// @description  A warm, low-contrast dark theme for Hacker News that's easy on the eyes.
// @author       you
// @match        https://news.ycombinator.com/*
// @run-at       document-start
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  'use strict';

  const css = `
    :root {
      --hn-bg:        #16161a;  /* page background */
      --hn-surface:   #1c1c21;  /* main content panel */
      --hn-surface-2: #232329;  /* subtle raised areas, inputs */
      --hn-border:    #32323a;
      --hn-text:      #d6d3cd;  /* body/comment text, warm off-white */
      --hn-title:     #ece8e2;  /* story titles — brightest thing on the page */
      --hn-dim:       #78746f;  /* metadata, timestamps, points */
      --hn-dimmer:    #605d59;
      --hn-link:      #ece8e2;
      --hn-visited:   #97928b;
      --hn-accent:    #e07a3f;  /* softened HN orange */
      --hn-accent-bg: #2a1e17;
      --hn-guide:     #2a2a31;  /* comment indent guide lines */
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
    /* the y18 logo box */
    .pagetop img[src*="y18"], img[src*="y18"] {
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

    /* HN puts the underline on the .hnmore SPAN, not the link inside it, so
       the rule is drawn in the span's colour while the <a> colours only the
       glyphs. Move the decoration onto the link so the two always match. */
    .hnmore {
      text-decoration: none !important;
    }
    .hnmore a, .hnmore a:link, .hnmore a:visited {
      text-decoration: underline !important;
    }
    .hnmore a:hover {
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
    .comment-tree .athing:target > td,
    .athing:target { background: #24242b !important; }

    /* Indentation spacer image is invisible on dark anyway, but keep spacing clean */
    img[src*="s.gif"] { opacity: 0; }

    /* ---- Vote links (arrows are hidden below; this covers downvote arrows
           for users who have them) ---- */
    .votelinks a, img[src*="grayarrow"], img[src*="triangle"] {
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
    input[type="submit"], button {
      background: var(--hn-surface-2) !important;
      cursor: pointer;
    }
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
    /* HN's spacer row is ~5px and vanishes on dark; give each story room. */
    tr.spacer { height: 9px !important; }

    tr.athing td.title { padding-top: 3px; }
    .subtext, .subline { display: inline-block; padding-top: 0; }

    /* ---- Vote arrow: removed ---- */
    .votearrow[title="upvote"], .votearrow {
      display: none !important;
    }
    /* Collapse the now-empty arrow column so it doesn't leave a gap. */
    tr.athing td.votelinks {
      width: 0 !important;
      padding: 0 !important;
      vertical-align: middle !important;
    }
    tr.athing td.votelinks center { display: none; }

    /* Rank recedes so the title carries the row. Both cells align on the
       first text baseline rather than the cell top, so the number sits on
       the same line as the title regardless of font size. */
    tr.athing td.title { vertical-align: baseline !important; }
    tr.athing td.title:first-child {
      padding-left: 10px;
      padding-right: 6px;
    }
    .rank {
      color: var(--hn-dimmer) !important;
      font-size: 0.8em;
      line-height: 1.5;
    }

    /* HN's comment tables have no cellspacing attribute, so browsers apply a
       default 2px border-spacing around every cell. That's the 2px artifact
       and the gap the indent guides can't paint into. */
    .comment-tree, .comment-tree table, tr.athing.comtr table {
      border-spacing: 0 !important;
      border-collapse: separate !important;
    }

    /* Comment spacing goes on the content cell inside the nested table, NOT
       the outer row td — padding there sits outside the .ind cell and breaks
       the indent guides into disconnected stubs. */
    tr.athing.comtr td.default { padding-bottom: 6px; }
    /* Left breathing room goes on the tree, not the indent cell, so the
       guide lines aren't offset from the levels they mark. */
    .comment-tree { margin-left: 12px; }
    .comhead { padding-bottom: 2px; display: inline-block; }

    /* ---- Readability tweaks ---- */
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

  // ---- Comment indent width ----
  // HN indents replies with a spacer GIF sized indent*40px, so the step isn't
  // a CSS property we can shrink. Hide the image and drive the cell width off
  // the indent attribute instead.
  const INDENT_STEP = 26; // px per nesting level (HN's default is 40)
  let indentCss = 'td.ind img { display: none !important; }\n';

  for (let i = 0; i <= 60; i++) {
    indentCss += `td.ind[indent="${i}"] { width: ${i * INDENT_STEP}px !important; min-width: ${i * INDENT_STEP}px !important; }\n`;
  }

  const style = css + indentCss;

  // Inject immediately so there's no white flash before the page paints.
  if (typeof GM_addStyle === 'function') {
    GM_addStyle(style);
  } else {
    const el = document.createElement('style');
    el.textContent = style;
    (document.head || document.documentElement).appendChild(el);
  }

  // Tell the browser the page is dark so native widgets match.
  const meta = document.createElement('meta');
  meta.name = 'color-scheme';
  meta.content = 'dark';
  (document.head || document.documentElement).appendChild(meta);
})();
