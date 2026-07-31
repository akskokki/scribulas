#!/usr/bin/env bash
# Claude Code status line
#
# model │ effort │ agent │ wakeup │ context% │ 5h rate limit + pace │
# reset clock │ cache

set -f

input=$(cat)
[ -z "$input" ] && printf "Claude" && exit 0

# ===== Colors =====
blue='\033[38;2;97;175;239m'
amber='\033[38;2;229;192;123m'
cyan='\033[38;2;86;182;194m'
green='\033[38;2;80;200;120m'
orange='\033[38;2;255;176;85m'
yellow='\033[38;2;230;200;0m'
red='\033[38;2;235;87;87m'
dim='\033[2m'
reset='\033[0m'

sep=" ${dim}│${reset} "

# ===== Helpers =====

# epoch seconds → local clock time (HH:MM)
fmt_clock() {
    local ts="$1"
    [ -z "$ts" ] && return
    date -d "@$ts" +%H:%M 2>/dev/null
}

# projected% = used% × duration / elapsed — where usage lands at reset.
# ↑ >130 blows through | ↗ 110-130 over | → 90-110 on pace |
# ↘ 70-90 under | ↓ <70 well under
pace_arrow() {
    local used_pct="$1" resets_at="$2" duration="$3" now="$4"
    [ -z "$used_pct" ] || [ -z "$resets_at" ] && return
    local elapsed=$(( now - (resets_at - duration) ))
    [ "$elapsed" -le $(( duration / 50 )) ] && return
    local projected
    projected=$(echo "$used_pct * $duration / $elapsed" | bc 2>/dev/null)
    [ -z "$projected" ] && return

    if   [ "$projected" -gt 130 ]; then printf '%s' "${red}↑${reset}"
    elif [ "$projected" -gt 110 ]; then printf '%s' "${orange}↗${reset}"
    elif [ "$projected" -gt 90  ]; then printf '%s' "${yellow}→${reset}"
    elif [ "$projected" -gt 70  ]; then printf '%s' "${cyan}↘${reset}"
    else                                 printf '%s' "${green}↓${reset}"
    fi
}

add() { [ -z "$out" ] && out+="$1" || out+="${sep}$1"; }

# ===== Extract data =====
now=$(date +%s)

model=$(echo "$input"        | jq -r '.model.display_name // empty')
used=$(echo "$input"         | jq -r '.context_window.used_percentage // empty')
effort_level=$(echo "$input" | jq -r '.effort.level // empty')
agent_name=$(echo "$input"   | jq -r '.agent.name // empty')
rl_five=$(echo "$input"      | jq -r '.rate_limits.five_hour.used_percentage // empty')
rl_resets_5h=$(echo "$input" | jq -r '.rate_limits.five_hour.resets_at // empty')
cache_read=$(echo "$input"   | jq -r '.context_window.current_usage.cache_read_input_tokens // empty')
cache_create=$(echo "$input" | jq -r '.context_window.current_usage.cache_creation_input_tokens // empty')

# "Claude Opus 4.6 (1M context)" → "Opus 4.6 (1M)"
model="${model#Claude }"
model="${model/ context/}"

# ===== Assemble =====
out=""

# Model — amber for Opus, cyan for Haiku, blue otherwise
if [ -n "$model" ]; then
    model_color="$blue"
    case "$model" in *Opus*)  model_color="$amber" ;; *Haiku*) model_color="$cyan" ;; esac
    add "${model_color}${model}${reset}"
fi

# Effort level
if [ -n "$effort_level" ]; then
    case "$effort_level" in
        medium) effort_color="$cyan" ;;
        high)   effort_color="$orange" ;;
        xhigh|max) effort_color="$red" ;;
        *)      effort_color="$dim" ;;
    esac
    add "${effort_color}${effort_level}${reset}"
fi

# Agent name
[ -n "$agent_name" ] && add "${dim}agent:${reset}${cyan}${agent_name}${reset}"

# Pending ScheduleWakeup countdown (/loop)
wakeup_file="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/next-wakeup"
if [ -f "$wakeup_file" ]; then
    wakeup_ts=$(head -n1 "$wakeup_file" 2>/dev/null)
    wakeup_ts="${wakeup_ts%%	*}"
    if [ -n "$wakeup_ts" ] && [ "$wakeup_ts" -gt "$now" ] 2>/dev/null; then
        secs_left=$(( wakeup_ts - now ))
        if   [ "$secs_left" -lt 60 ];   then wake_fmt="${secs_left}s"
        elif [ "$secs_left" -lt 3600 ]; then wake_fmt="$((secs_left/60))m$((secs_left%60))s"
        else wake_fmt="$((secs_left/3600))h$(( (secs_left%3600)/60 ))m"
        fi
        add "${yellow}⏰ ${wake_fmt}${reset}"
    else
        rm -f "$wakeup_file" 2>/dev/null
    fi
fi

# Context window %
if [ -n "$used" ]; then
    ctx_pct=$(printf "%.0f" "$used")
    if   [ "$ctx_pct" -ge 40 ]; then ctx_color="$red"
    elif [ "$ctx_pct" -ge 30 ]; then ctx_color="$orange"
    elif [ "$ctx_pct" -ge 20 ]; then ctx_color="$yellow"
    elif [ "$ctx_pct" -ge 10 ]; then ctx_color="$cyan"
    else ctx_color="$green"; fi
    add "${ctx_color}${ctx_pct}%${reset}"
fi

# 5h rate limit + pace — the number stays dim; the arrow carries the meaning.
if [ -n "$rl_five" ]; then
    f=$(printf "%.0f" "$rl_five")
    arrow5=$(pace_arrow "$rl_five" "$rl_resets_5h" 18000 "$now")
    [ -n "$arrow5" ] && arrow5=" $arrow5"
    add "${dim}${f}%${reset}${arrow5}"
fi

# Next 5h reset, as a clock time
[ -n "$rl_resets_5h" ] && [ "$rl_resets_5h" -gt "$now" ] 2>/dev/null && \
    add "${dim}↻ $(fmt_clock "$rl_resets_5h")${reset}"

# Cache hit rate — pinned to the end. Dim while healthy, red below 80%.
cache_total=$(( ${cache_read:-0} + ${cache_create:-0} ))
if [ "$cache_total" -gt 0 ] 2>/dev/null; then
    hit_pct=$(( cache_read * 100 / cache_total ))
    [ "$hit_pct" -lt 80 ] && cache_color="$red" || cache_color="$dim"
    add "${dim}cache${reset} ${cache_color}${hit_pct}%${reset}"
fi

printf "%b\n" "$out"
