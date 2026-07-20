# Engineer Brain — skill family

A three-layer set of Claude Code skills that package the judgment experienced
engineers apply *around* writing code, so nontrivial work comes out low-waste
and verified on the first pass instead of needing rework. Each layer is a
separate skill that loads on demand (progressive disclosure) — Claude Code
pulls in only the layer it needs, when it needs it, so the reasoning is
available without permanently crowding the context.

The name comes from the original idea: give the model a "brain" of proven
engineering know-how — not more raw knowledge (it has plenty), but the
*judgment* about which knowledge to apply, how much, and when.

## The three layers

| Phase | Skill | Job | Fires |
|-------|-------|-----|-------|
| 1 | [`engineer-brain`](./SKILL.md) | **Decide** the structure a problem actually needs | Before implementing |
| 2 | [`engineer-brain-verify`](../engineer-brain-verify/SKILL.md) | **Verify** the code honored that decision | After implementing |
| 3 | [`engineer-brain-orchestrate`](../engineer-brain-orchestrate/SKILL.md) | **Orchestrate**: turn a vague ask into a spec and drive the loop | At the start of a request |

They compose into one loop. `engineer-brain-orchestrate` sits on top: it turns
an underspecified request into a concrete spec, then drives
`engineer-brain` (decide) → implement → `engineer-brain-verify` (verify) →
iterate, checking in with the human only where a decision is genuinely theirs.

```
vague request
   │
   ▼
[3] orchestrate ── infer spec, fill defaults, ask only what truly needs asking
   │
   ▼
[1] engineer-brain ── choose the cheapest structure that meets the constraints
   │
   ▼
    implement
   │
   ▼
[2] engineer-brain-verify ── did the structure materialize? seams real? tests landed?
   │                          report drift → auto-fix small/clear → escalate ambiguous
   ▼
    verify behavior (built-in `verify`) → iterate on failures → done
```

## What each layer contains

### Phase 1 — `engineer-brain` (decide)
- A short decision framework (SKILL.md): what actually varies, blast radius,
  does a known pattern fit, what's the simplest thing that works, and an
  over/under-engineering self-check.
- `references/patterns.md` — 10 proven patterns (single-module baseline,
  layered, hexagonal, event-driven, CQRS, pipeline, state machine,
  strategy/plugin, repository, saga) keyed to the *symptoms* that call for
  each, with its cost and its common misuse trap.
- `references/heuristics.md` — the "how much / when" logic: find the
  volatility axis, the rule of three, weigh cost against blast radius (not
  surface size), testability, and concrete over/under-engineering traps.

### Phase 2 — `engineer-brain-verify` (verify)
- Runs after coding to check design conformance — distinct from the built-in
  `verify` (behavior) and `code-review` (bugs).
- `references/checklist.md` — six check groups: did the structure materialize,
  are the seams real or cosmetic, did tests land where the structure promised
  them, did coding drift into over-engineering, did it drift into
  under-engineering, is the one-sentence justification still true.
- Loop: report drift → auto-fix the clear/small gaps → escalate the ambiguous
  or large ones to the human.

### Phase 3 — `engineer-brain-orchestrate` (orchestrate)
- Turns an underspecified request into a spec by inferring defaults, then
  drives the whole loop with minimal human check-ins.
- `references/ask-or-decide.md` — the ask-or-decide boundary: decide yourself
  when a choice is conventional / reversible / inferable / invisible to the
  user's goal; ask only when it's irreversible, high-stakes (money, security,
  privacy), a genuine product fork, or expensive to get wrong. Includes a
  high-stakes-axis sweep so the drive to minimize questions never skips one
  that actually matters.

## Design philosophy

The family practices what it preaches:

- **Cheapest structure that fits.** Structure is a cost you pay to buy a
  specific future property (testability, replaceability, decoupling). If the
  problem doesn't need that property yet, the structure is overhead. The whole
  point is choosing the least structure that satisfies the real constraints —
  not the most impressive design.
- **Progressive disclosure.** Each SKILL.md stays short and actionable; the
  detailed catalogs live in `references/` and load only when relevant. This is
  the "skill loader" idea — keep the context clean, pull in depth on demand.
- **Extensible by composition.** Each layer is a thin driver over the one
  below it. New layers, if ever added, should follow the same shape: defaults
  inferred over asked, the human consulted only where a decision is theirs.

## Status & validation

All three phases are built and were checked with with-skill vs. without-skill
comparisons, plus one end-to-end integration test (an underspecified "import
vendor CSVs" build, taken from vague request to running, tested code):

- **Phase 1** reliably curbs over-engineering (e.g. declines a formal
  repository/layered design for a one-axis problem) while still reaching for
  the right heavy pattern when the symptoms are present (e.g. saga for
  multi-service compensation).
- **Phase 2** caught a design drift the no-skill baseline missed (a
  one-implementation interface with no test motivating it) and produced a
  fix/escalate triage.
- **Phase 3** cut clarifying questions to the few that matter (1 vs. 3 in
  tests) while flagging its filled-in assumptions for cheap correction.
- **Integration**: the three chained cleanly. Both skill and baseline produced
  correct, extensible code; the decisive difference was verification
  discipline — the skill run landed 10 passing tests on the seams and
  self-caught a naming bug, where the baseline shipped zero tests.

An honest caveat: on a strong underlying model, the baseline is already good,
so the marginal lift on any single well-known problem is modest. The family's
value is *consistency* (forcing the reasoning every time rather than relying on
the model happening to reason well), a shared vocabulary that makes the
reasoning legible, and a larger lift on faster/smaller models.
