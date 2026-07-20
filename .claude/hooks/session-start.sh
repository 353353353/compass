#!/bin/bash
# SessionStart hook: re-materialize the engineer-brain skill family and the
# Sonnet-delegation tooling from this repo (the durable git source) into the
# user-level ~/.claude directory, so they're available user-wide within the
# session, not only when this repo is the active context.
#
# The Claude Code web environment is ephemeral: ~/.claude is wiped when the
# container is reclaimed, so this hook rebuilds it from the repo every session.
# Idempotent (safe to run repeatedly), touches only the paths it owns, and
# fails soft so a copy problem never blocks the session from starting.

set -uo pipefail

SRC="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}/.claude"
DST="${HOME}/.claude"

# Skills to publish user-wide, and the single delegation agent.
SKILLS=(
  "engineer-brain"
  "engineer-brain-verify"
  "engineer-brain-orchestrate"
  "delegate-work"
)
AGENTS=(
  "worker.md"
)

mkdir -p "${DST}/skills" "${DST}/agents" 2>/dev/null || true

for skill in "${SKILLS[@]}"; do
  if [ -d "${SRC}/skills/${skill}" ]; then
    # Refresh this skill's own directory from the repo copy (source of truth),
    # without disturbing any other user skill.
    rm -rf "${DST}/skills/${skill}" 2>/dev/null || true
    cp -r "${SRC}/skills/${skill}" "${DST}/skills/" 2>/dev/null \
      && echo "session-start: published skill ${skill}" \
      || echo "session-start: WARN could not publish skill ${skill}" >&2
  fi
done

for agent in "${AGENTS[@]}"; do
  if [ -f "${SRC}/agents/${agent}" ]; then
    cp -f "${SRC}/agents/${agent}" "${DST}/agents/${agent}" 2>/dev/null \
      && echo "session-start: published agent ${agent}" \
      || echo "session-start: WARN could not publish agent ${agent}" >&2
  fi
done

# Never fail the session on a publishing hiccup.
exit 0
