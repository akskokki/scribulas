# github-userscript

A userscript for GitHub commit lists. Userscripts are small bits of JavaScript
a browser extension injects into pages you visit, letting you add behaviour a
site does not ship itself — here, tag labels and conventional-commit badges.

Two things on any `/<owner>/<repo>/commits` page:

- **Tag labels** — commits that carry a tag get a `🏷 v1.2.3` link at the end of
  their metadata row, pointing at the release for that tag.
- **Conventional-commit badges** — a leading `feat(api)!:` is turned into a
  coloured badge, one colour per type, with an outline for breaking (`!`)
  changes. The rest of the message is left alone.

## Setup

Install a userscript manager — [Violentmonkey](https://violentmonkey.github.io/)
or Tampermonkey — then create a new script and paste in
[`github-userscript.js`](github-userscript.js). Reload GitHub.

Tag labels call the GitHub API from the page. Anonymously that is 60 requests
per hour and public repos only, which is enough for casual browsing. For
private repos, or to raise the limit to 5000/hour, set `TOKEN` near the top of
the script to a fine-grained PAT with **Contents: Read-only**:

```js
const TOKEN = 'github_pat_...';
```

A fine-grained token only reaches repos on its allowlist — public repos outside
it return 403, so either allowlist what you browse or leave `TOKEN` empty.

Storing a token in the script means it lives in the extension's storage in
plaintext. Keep it read-only and scoped.

## Configuration

All at the top of the file.

| | |
|---|---|
| `TOKEN` | GitHub PAT, or `''` for anonymous |
| `FEATURES` | `{ tags, conventional }` — turn either half off |
| `MAX_PAGES` | tag pages fetched, 100 tags each (20 → 2000 tags) |
| `CC_COLORS` | `type: [background, foreground]`; add a type to support it |

Types recognised out of the box: `feat`, `fix`, `refactor`, `test`, `ci`,
`build`, `chore`, `docs`, `perf`, `style`, `lint`, `revert`. A prefix whose
type is not listed is left as plain text.

## Notes for an agent editing this

- GitHub is a SPA, so there is no single load event to hook. A
  `MutationObserver` on `documentElement` schedules a `sync()` per animation
  frame; `sync()` refetches tags when the repo slug changes and clears state
  when you navigate off a commits page.
- `decorate()` is re-run on every pass and must stay idempotent: badges are
  marked with `data-ccDone`, tag labels deduped by SHA (each row links the
  commit twice — message and short SHA).
- Labels anchor off `<relative-time>`, which GitHub hydrates asynchronously. A
  row without one is skipped rather than marked handled, so a later pass picks
  it up.
- Only the inlined Octicon goes in via `innerHTML`; tag names and commit text
  are always set as text nodes.
