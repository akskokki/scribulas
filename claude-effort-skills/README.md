# claude-effort-skills

Claude Code skills that run a single prompt at a fixed effort level, then go
back to the session's normal level for the next message.

```
/high why does this deadlock?
/low rename foo to bar
```

One skill per level: `low`, `medium`, `high`, `xhigh`, `max`. Each sets
`effort:` in its frontmatter and passes the prompt through as `$ARGUMENTS`.
`disable-model-invocation: true` keeps Claude from triggering them on its own.

## Setup

```bash
cp -r low medium high xhigh max ~/.claude/skills/
```

Restart Claude Code (or start a new session) to pick them up.
