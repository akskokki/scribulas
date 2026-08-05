# github-userscript

On `/<owner>/<repo>/commits`:

- **Tag labels** — tagged commits get a `🏷 v1.2.3` link to that tag's release.
- **Conventional-commit badges** — a leading `feat(api)!:` becomes a coloured
  badge, one colour per type, outlined for breaking changes.

## Token

Tag labels hit the GitHub API from the page: anonymously 60 req/hour, public
repos only. For private repos or 5000/hour, set `TOKEN` to a fine-grained PAT
with **Contents: Read-only**. Such a token only reaches repos on its allowlist —
public repos outside it 403, so allowlist what you browse or leave it empty.

It's stored in plaintext in the extension. Keep it read-only, and don't commit
it back here.

## Configuration

Top of the file.

| | |
|---|---|
| `TOKEN` | PAT, or `''` for anonymous |
| `FEATURES` | `{ tags, conventional }` |
| `MAX_PAGES` | tag pages fetched, 100 tags each |
| `CC_COLORS` | `type: [background, foreground]`; add a type to support it |

Known types: `feat`, `fix`, `refactor`, `test`, `ci`, `build`, `chore`, `docs`,
`perf`, `style`, `lint`, `revert`. Anything else stays plain text.

## Implementation notes

- GitHub is a SPA with no load event to hook. A `MutationObserver` on
  `documentElement` schedules `sync()` per animation frame; `sync()` refetches
  tags when the repo slug changes and clears state off commits pages.
- `decorate()` re-runs every pass and must stay idempotent: badges marked with
  `data-ccDone`, tag labels deduped by SHA (each row links the commit twice).
- Labels anchor off `<relative-time>`, hydrated asynchronously. Rows without one
  are skipped rather than marked handled, so a later pass catches them.
- Only the inlined Octicon uses `innerHTML`; tag names and commit text are text
  nodes.
