---
name: engineer-brain
description: Use before designing or implementing any nontrivial feature, module, service, or refactor — whenever you're about to choose an architecture, decide between patterns (layered, hexagonal/ports-and-adapters, event-driven, CQRS, pipeline, state machine, strategy/plugin, repository, saga), or judge how much structure and abstraction a problem actually needs. Also use when a design feels shaky or overbuilt, when you're unsure whether something is over-engineered or under-engineered, when the user asks for a "clean," "scalable," "maintainable," or "well-architected" solution, or before a refactor whose shape isn't obvious yet. Load this before writing code, not after — it's cheap to change a plan, expensive to unwind a wrong structure.
---

# Engineer Brain — design judgment before code

This skill packages the judgment experienced engineers apply *before* touching
the keyboard: which structure a problem actually calls for, and how much of it
is worth building. The goal is code that comes out low-waste on the first
pass — not a pattern encyclopedia to browse for its own sake.

## Core stance

Structure is a cost you pay to buy future flexibility. Every pattern below
trades implementation effort and indirection for some specific property
(testability, replaceability, decoupling, auditability...). If the problem
doesn't need that property yet, the pattern is pure overhead — it will not
make the code more correct, only harder to read. Good design is choosing the
*cheapest structure that satisfies the actual constraints*, not the most
impressive one.

## Before writing any nontrivial code, ask these in order

1. **What actually varies, and how often?** Identify the axis of change (new
   data sources? new output formats? new business rules? new scale?). Structure
   should be built around *that* axis, not around axes that are stable.
   Read `references/heuristics.md` § "Find the volatility axis" for how to do
   this concretely.
2. **What's the blast radius of getting it wrong?** A script run once a
   quarter and a payment-processing core have wildly different tolerances for
   under-structuring. Scale investment to consequence, not to the problem's
   surface-level size.
3. **Is there already a pattern that fits the shape of this problem?** Don't
   invent a new structure if a well-known one matches. Open
   `references/patterns.md` and match the problem's *symptoms* (not its
   domain name) to a pattern's trigger conditions.
4. **What's the simplest thing that could work?** Default to it. Only add
   structure when you can name the specific future change it protects
   against, and that change is plausible, not merely imaginable. See
   `references/heuristics.md` § "Over-engineering traps" before adding any
   abstraction layer, interface, or plugin point.
5. **Sanity-check against under-engineering too.** Structure isn't only a
   cost — its absence has failure modes as well (god objects, untestable I/O
   entanglement, hidden global state). See `references/heuristics.md` §
   "Under-engineering traps."

## When to open the reference files

- **`references/patterns.md`** — a catalog of proven architecture/design
  patterns, each keyed to the *problem shapes and symptoms* that call for it
  (not to buzzwords). Open it once step 3 above tells you a known pattern
  might apply, and read only the entry that matches — not the whole file.
- **`references/heuristics.md`** — the decision logic for *how much* and
  *when*: weighing cost against actual complexity, the volatility axis,
  and the concrete over-engineering / under-engineering traps to check
  yourself against. Open it whenever you're unsure if you're about to
  over-build or under-build.

## After deciding

State the decision and the *reason* in one or two sentences before
implementing (either to the user or as your own working note) — e.g. "This
needs a ports-and-adapters seam because we'll swap the storage backend in
phase 2 and want to unit-test the domain logic without a database." If you
can't articulate the reason that crisply, you probably haven't found the
right structure yet — go back to question 1.

## Roadmap (not yet built — later phases)

This skill covers architecture/pattern judgment (deciding the structure
*before* coding). The family grows in phases:

- **Phase 2 — self-verification loop (BUILT):** the `engineer-brain-verify`
  skill runs *after* implementing to check the code honored the decision made
  here (did the justified structure materialize? are the seams real? did
  tests land at them?), reports any drift, and auto-fixes the clear/small
  gaps. Reach for it once you've written the structural code this skill's
  decision shaped.
- **Phase 3 — meta/automation layer (not yet built):** knowledge about
  automating the engineering process itself (reducing how much a human needs
  to specify at all), layered on top of phases 1 and 2. This file keeps
  pointing at it so the skill can grow into it without a restructure.
