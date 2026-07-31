# statusline-command

A single-line Claude Code statusline. Personal config — trimmed down from
[vfmatzkin/claude-statusline](https://github.com/vfmatzkin/claude-statusline).

```
Opus 5 │ medium │ 5% │ 19% ↓ │ ↻ 21:14 │ cache 98%
```

## Setup on a new machine

Requires `jq` and `bc` (`bc` is used only for the pace arrow). Linux — the
script uses GNU `date -d`; it will not produce reset/pace times on macOS.

```bash
cp statusline-command.sh ~/.claude/statusline-command.sh
chmod +x ~/.claude/statusline-command.sh
```

Then add to `~/.claude/settings.json`, merging into the existing object rather
than overwriting the file:

```json
{
  "statusLine": {
    "type": "command",
    "command": "bash ~/.claude/statusline-command.sh"
  }
}
```

Restart Claude Code. To verify without one, pipe it a payload:

```bash
echo '{"model":{"display_name":"Claude Opus 5"},"effort":{"level":"low"},
"context_window":{"used_percentage":7,"current_usage":
{"cache_read_input_tokens":9800,"cache_creation_input_tokens":200}},
"rate_limits":{"five_hour":{"used_percentage":19,"resets_at":9999999999}}}' \
  | bash ~/.claude/statusline-command.sh
```

## Fields

Left to right. Everything reads from the JSON Claude Code pipes in on stdin.

| Field | Notes |
|---|---|
| model | `Claude ` stripped. Amber Opus, cyan Haiku, blue otherwise |
| effort | dim low, cyan medium, orange high, red xhigh/max |
| `agent:<name>` | only while a subagent is running |
| `⏰ 13m57s` | only while a `/loop` wakeup is pending |
| context % | share of the context window used |
| 5h usage % + arrow | rate limit; number always dim, arrow carries the signal |
| `↻ HH:MM` | clock time the 5h window resets |
| `cache NN%` | prompt cache hit rate, `read / (read + creation)` |

Context uses a green→red ramp; `dim` is reserved for structure (separators,
labels, the reset clock).

| Context | Color |
|---|---|
| < 10 | green |
| 10–19 | cyan |
| 20–29 | yellow |
| 30–39 | orange |
| ≥ 40 | red |

The pace arrow projects where 5h usage lands at reset
(`used% × window / elapsed`):

| Projected | Arrow |
|---|---|
| > 130% | ↑ red — blowing through the cap |
| 110–130% | ↗ orange |
| 90–110% | → yellow — landing right at the limit |
| 70–90% | ↘ cyan |
| < 70% | ↓ green — well under |

It is suppressed early in a window, when too little time has elapsed to
project from.

Cache is dim at or above 80%, red below. Expect it to dip red for a turn after
a compaction or a long idle gap — that is the cache being rebuilt, not a fault.

## Notes for an agent editing this

- Pure stdin → stdout. The only filesystem write is deleting a stale
  `~/.claude/next-wakeup`; there is no state, config file, or background job.
- Upstream's cost/burn-rate/budget display was removed — it only renders for
  API/enterprise billing, never on a Pro/Max subscription. So were the git
  branch block and its debounced background `git fetch`, the second and third
  output lines, and the `budget`/`usage`/`sync`/`fetch-refresh` subcommands
  (which used BSD `sed -i ''` and were broken on Linux anyway).
- Fields are appended with `add`, which handles the `│` separators. Order in
  the file is display order.
