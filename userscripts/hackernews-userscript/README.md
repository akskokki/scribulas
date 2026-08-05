# hackernews-userscript

Warm, low-contrast dark theme for Hacker News. CSS only.

Palette is a block of `--hn-*` variables at the top of the stylesheet.

Runs at `document-start` via `GM_addStyle` (falling back to a `<style>` element)
so there's no white flash, and sets `color-scheme: dark` so native widgets match.
