# claude-statusline

Single-line Claude Code statusline, trimmed down from
[vfmatzkin/claude-statusline](https://github.com/vfmatzkin/claude-statusline).

```
Opus 5 │ medium │ 5% │ 19% ↓ │ ↻ 21:14 │ cache 98%
```

## Setup

Needs `jq` and `bc`. Linux only — uses GNU `date -d`, so reset/pace times won't
render on macOS.

```bash
cp statusline-command.sh ~/.claude/statusline-command.sh
chmod +x ~/.claude/statusline-command.sh
```

Merge into `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "bash ~/.claude/statusline-command.sh"
  }
}
```

Restart Claude Code, or test directly:

```bash
echo '{"model":{"display_name":"Claude Opus 5"},"effort":{"level":"low"},
"context_window":{"used_percentage":7,"current_usage":
{"cache_read_input_tokens":9800,"cache_creation_input_tokens":200}},
"rate_limits":{"five_hour":{"used_percentage":19,"resets_at":9999999999}}}' \
  | bash ~/.claude/statusline-command.sh
```

## Fields

Left to right, all from the JSON Claude Code pipes in on stdin.

| Field | Notes |
|---|---|
| model | `Claude ` stripped. Amber Opus, cyan Haiku, blue otherwise |
| effort | dim low, cyan medium, orange high, red xhigh/max |
| `agent:<name>` | only while a subagent runs |
| `⏰ 13m57s` | only while a `/loop` wakeup is pending |
| context % | green <10, cyan 10–19, yellow 20–29, orange 30–39, red ≥40 |
| 5h usage % + arrow | number always dim; the arrow carries the signal |
| `↻ HH:MM` | when the 5h window resets |
| `cache NN%` | hit rate, `read / (read + creation)`; dim ≥80%, red below |

`dim` is reserved for structure — separators, labels, the reset clock.

The arrow projects where 5h usage lands at reset (`used% × window / elapsed`),
and is suppressed early in a window when there's too little elapsed time to
project from:

| Projected | Arrow |
|---|---|
| > 130% | ↑ red |
| 110–130% | ↗ orange |
| 90–110% | → yellow, landing at the limit |
| 70–90% | ↘ cyan |
| < 70% | ↓ green |

Cache dips red for a turn after a compaction or long idle gap — that's the
cache rebuilding, not a fault.

## Implementation notes

- Pure stdin → stdout. The only write is deleting a stale
  `~/.claude/next-wakeup`; no state, config, or background jobs.
- Removed from upstream: cost/burn-rate/budget (only renders for API/enterprise
  billing, never on a subscription), the git branch block and its debounced
  background `git fetch`, output lines 2–3, and the
  `budget`/`usage`/`sync`/`fetch-refresh` subcommands (BSD `sed -i ''`, broken
  on Linux anyway).
- Fields are appended with `add`, which handles the `│` separators. File order
  is display order.
