# Design-conformance checklist

Apply the groups that fit what you built. Each check is phrased as a question
with a **drift signal** (what a "no" looks like) and a **typical fix**. For
every real finding, record `file:line`, the drift direction (over-engineered
/ under-engineered / pattern-not-realized), and whether you'll fix or
escalate (SKILL.md step 4).

## Table of contents
A. Did the justified structure actually materialize?
B. Are the seams real, or cosmetic?
C. Did tests land where the structure promised them?
D. Drift into over-engineering during coding
E. Drift into under-engineering during coding
F. Is the one-sentence justification still true?

---

## A. Did the justified structure actually materialize?

The decision named a structure (a pattern, a layer boundary, a seam). Check
it exists in the code, not just in the plan.

- **The chosen pattern is actually implemented, not degraded.** A common
  failure: "we'll use a state machine" ends up as `if status == "paid"`
  checks scattered across three files; "pipeline" ends up as one 200-line
  function. Drift signal: you can't point to the thing the pattern names (the
  transition table, the stage list, the strategy registry) as a single
  locatable construct. Fix: consolidate the scattered logic into the
  construct the pattern actually calls for — or, if it genuinely didn't need
  the pattern, drop the pretense and simplify (that's a group-D finding).
- **Dependencies point the way the structure requires.** If the design was
  ports-and-adapters/layered, the core/domain must depend on the abstraction,
  not on the concrete infra. Drift signal: the domain module imports the
  Stripe SDK / the ORM / the HTTP client directly. Fix: invert the dependency
  through the port that was supposed to be there.

## B. Are the seams real, or cosmetic?

A seam that doesn't actually hide what it claimed to hide is worse than none
— it costs indirection and delivers no isolation.

- **The abstraction hides the concrete detail it promised to.** Drift signal:
  the concrete leaks through — a `PaymentGateway` port whose method returns a
  `Stripe.Charge` or throws `Stripe.CardError`, so every caller is still
  coupled to Stripe. Fix: map to domain-owned types/errors at the adapter
  boundary so the concrete truly stops at the seam.
- **The interface has more than one reason to exist.** A port justified by
  "swap the backend" should express the domain's needs, not mirror one
  vendor's API surface 1:1. Drift signal: the interface is a rename of the
  SDK. Fix: shrink the port to the operations the domain actually calls.

## C. Did tests land where the structure promised them?

Very often the *entire* justification for a seam was "so we can test the core
without infra." If that seam exists but the test doesn't, the work is
unfinished — you paid the indirection cost and didn't collect the benefit.

- **The test the seam was built for actually exists.** Drift signal: there's
  a port and a fake-able boundary, but the domain logic still has no unit test
  exercising it through a fake. Fix: write that test now — it's the reason the
  seam was justified. If, writing it, you find the seam buys no testing
  benefit after all, that's a group-D finding (the seam was speculative).
- **Tests exercise behavior through the structure, not around it.** Drift
  signal: tests bypass the seam and hit the real infra anyway, so the seam is
  never actually used in anger. Fix: route the test through the abstraction.

## D. Drift into over-engineering during coding

Structure that crept in during implementation, beyond what the decision
justified. Check against the same traps `engineer-brain`'s heuristics warn
about, now applied to code that exists.

- **Interfaces/abstractions with exactly one implementation and no test that
  needs the fake.** Drift signal: `interface Foo` + `class FooImpl` + nothing
  else, no second impl planned, no test mocking it. Fix: inline it; reintroduce
  the seam when the second case or the test actually arrives.
- **Speculative parameters, config flags, or hooks added "while I was
  there."** Drift signal: a function grew a `mode`/`strategy`/`options` knob
  with one value ever passed. Fix: remove the unused axis of variation.
- **A pattern applied heavier than the problem needed.** Drift signal: a full
  event bus for two always-sequential steps; CQRS/two models for plain CRUD.
  Fix: collapse to the direct call / single model.

## E. Drift into under-engineering during coding

The opposite failure: the plan called for a seam or separation, and coding
quietly skipped it because inlining was faster in the moment.

- **A boundary the decision required got inlined.** Drift signal: the plan
  said "isolate X behind a port," the code calls X directly. Fix: extract the
  boundary that was actually decided on (don't silently ratify the shortcut —
  it was decided for a reason; if that reason is now void, that's a group-F
  reconciliation, not a silent skip).
- **Business logic re-entangled with I/O.** Drift signal: rules and
  DB/network calls interleaved in one function despite a plan to separate
  them, so the rules can't be tested without the infra. Fix: pull the rule
  out to the pure side of the boundary.
- **A unit accreted into a god function/object during implementation.** Drift
  signal: you can't say what it does in one sentence; it grew three
  responsibilities the plan meant to keep apart. Fix: split along the
  responsibilities the design already named.
- **An invariant left as an implicit convention.** Drift signal: two parts
  agree on a shape only by unenforced habit (the port contract, the state
  transitions) with nothing checking it. Fix: make it explicit — a type, a
  guard, a single validation point.

## F. Is the one-sentence justification still true?

The final reconciliation. Re-read the intent sentence from SKILL.md step 1
against the code as it now stands.

- **The sentence still describes the code.** If it does, and groups A–E are
  clean, you're done. Drift signal: the sentence says one thing, the code does
  another. That means one of two things, and you must decide which:
  - the **code drifted** from a still-valid decision → fix the code
    (groups A–E point at how);
  - the **decision was wrong** and the code found a better shape → the
    justification should be rewritten to match reality. This is a design
    change: **escalate** (SKILL.md step 4). Don't silently rewrite the
    rationale to whatever the code happens to do — that launders a possibly-
    accidental shortcut into an official decision.
