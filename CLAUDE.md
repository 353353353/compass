# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`compass` (銀の羅針盤座｜M's 羅針盤) is a single-file, static personal "daily fortune / planner" web page, written in Japanese. The entire application — markup, CSS, and JavaScript — lives in `index.html`. There is no build system, no package manager, no server, and no test suite.

## Development workflow

- Edit `index.html` directly; there is nothing to install or compile.
- To preview, open `index.html` in a browser directly (`file://`) or serve it locally, e.g. `python3 -m http.server` from the repo root and visit `http://localhost:8000/`.
- There is no linter, formatter, or test runner configured — verify changes by opening the page and exercising the UI manually (check today's date rendering, task add/complete/delete/priority toggle, and the checklist state).
- No CI/build pipeline exists in this repo.

## Architecture

Everything is inline in `index.html`, in three parts:

1. **`<style>`** — all CSS, using a small custom-property palette (`--ink`, `--paper`, `--gold`, `--indigo`, etc.) and Japanese serif/mono fonts loaded from Google Fonts.
2. **HTML body** — a fixed set of card sections (`today-card`, `month-card`, `task-card`, `action-card`, `dates-card`, `vision-card`, `lucky-row`) that JS fills in at runtime via `id` lookups (e.g. `#energyTitle`, `#taskList`).
3. **`<script>`** — all logic, split into two independent halves:
   - **Fortune/calendar rendering** (`DATA`, `render()`, `getWeekNumber()`, `toggleCheck()`): `DATA` is a hand-authored object keyed by month number (currently `3`, `4`, `5` for 2026), each containing `title`, `policy`, `weeks`, `actions`, `keyDates`, a `days` map keyed by day-of-month with per-day fortune (`type`: `best`/`good`/`bad`/`normal`, `emoji`, `title`, `sub`, `msg`), and a `defaultDay` fallback. `render()` reads `new Date()`, looks up the current month/day in `DATA`, and populates the page. Outside months 3–5, it shows an "out of range" message instead.
   - **Task manager** (`loadTasks`/`saveTasks`/`addTask`/`toggleTask`/`deleteTask`/`togglePriority`/`renderTasks`): a simple to-do list (max 10 items, each `{id, text, done, priority}`) persisted to `localStorage` under key `mytasks_v1`. `renderTasks()` cross-references today's fortune (`isBestDay`/`isGoodDay`) to surface a suggestion banner promoting priority or undone tasks on favorable days.
   - Checklist state for the month's action items is persisted separately in `localStorage` under `checks-<month>`.

All state is client-side `localStorage`; there is no backend, no network calls other than the Google Fonts `@import`.

## Extending the fortune data

When adding a new month or adjusting an existing one, follow the existing `DATA[<month>]` shape exactly — `weeks` must have 4 entries (one per `getWeekNumber` bucket: days 1–7, 8–15, 16–22, 23–end), `keyDates` and `days` should stay in sync (each day referenced in `keyDates` typically has a matching entry in `days`), and `type` must be one of `best`, `good`, `bad`, or `normal` since that value drives both badge styling (`tag-best`/`tag-good`/`tag-bad`) and the task-suggestion banner logic.

## Repository conventions

- The visible app content (titles, messages, dates) is in Japanese; keep new content consistent with that unless asked otherwise.
- This repo also contains a `.claude/` directory with agent/skill/hook configuration for Claude Code itself (`.claude/agents/`, `.claude/skills/`, `.claude/hooks/session-start.sh`) — that is tooling for AI-assisted development, not part of the deployed app.
