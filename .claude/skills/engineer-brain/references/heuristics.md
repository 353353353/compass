# Decision heuristics — how much structure, and when

This is the judgment layer that sits above the pattern catalog: it decides
*whether* to reach for a pattern at all and *how much* of it to build,
before `patterns.md` tells you *which one*.

## Find the volatility axis

Every system has some things that change often and some that almost never
do. Good structure is built around the axis that actually moves — not
around whatever happens to be easiest to see (technical layers, file types,
the org chart).

How to find it in practice:
- Ask "if the product/requirements change six months from now, what's most
  likely to be the thing that changes?" — new data sources? new rule
  variants? new output channels? new scale? That's the axis to protect.
- Ask "what has changed in the last six months, in similar code nearby?"
  Past change-rate is the best predictor of future change-rate you have.
- If nothing obviously varies yet and you're guessing at a future axis,
  that's a signal to under-build now (see "Rule of three" below), not to
  guess architecture into place.

Structure that isolates the *wrong* axis is worse than no structure — it
adds indirection while providing zero actual protection, because the axis it
guards against was never the one that moved.

## Rule of three

Don't build the abstraction for the second case. Write the second case
concretely, duplicated. When a genuine third case shows up, *then*
generalize — by that point you have two real examples to generalize from
instead of one imagined one, and the resulting abstraction fits the actual
shape of variation instead of a guessed one.

Exception: don't apply this rule when the cost of being wrong is very high
(see "Weigh cost against blast radius" below) — in genuinely
high-consequence code, it can be worth designing the seam before the third
case, because retrofitting it later is unusually expensive or risky there.

## Weigh cost against blast radius, not against surface size

A 50-line script and a 50-line function in a payment pipeline deserve
different amounts of design care, even though they're the same size. Ask:
- What breaks if this is wrong, and who notices?
- How expensive is it to change this *after* it's live (is it a private
  internal function, or a public API/schema/contract other teams depend on)?
- Is it exercised constantly (production hot path) or rarely (a one-off
  migration script)?

Scale investment to the answer, not to line count or perceived
"seriousness" of the domain name.

## Weigh testability explicitly

If you can't state a concrete test you want to write against a piece of
logic without also standing up a database/network/filesystem, that's a
specific, real cost — not a vague "best practice" concern. That's when
patterns like hexagonal (#3) or repository (#9) earn their cost. If every
test you'd actually write is fine hitting the real dependency (e.g. it's
fast, deterministic, and already isolated per test), skip the seam.

## Over-engineering traps — check yourself against these before adding structure

- **Speculative generality**: building a plugin point, config option, or
  interface for a variant that doesn't exist yet and nobody has asked for.
  Fix: apply the Rule of three.
- **Pattern-name-first design**: reaching for CQRS, microservices, or event
  sourcing because they sound rigorous, rather than because a specific
  symptom in `patterns.md` is present. Fix: name the symptom before naming
  the pattern.
- **Config-driven everything**: turning what should be a code change (rare,
  reviewed, testable) into a runtime config flag (frequent, unreviewed,
  untested) because it feels more "flexible." Fix: only externalize things
  that truly need to vary without a deploy.
- **Layering by technical category instead of volatility**: controllers/
  services/repositories as a reflex, regardless of whether those categories
  actually change at different rates in this codebase.
- **Interfaces with exactly one implementation and no test motivating them**:
  if there's one real adapter and no fake needed for tests, the interface is
  pure ceremony — inline it.
- **Premature distribution**: splitting something into services/processes
  before a single process has actually hit a limit (scaling, team ownership,
  deployment cadence) that requires it. Distribution is one of the most
  expensive structures to add and remove — don't pay for it speculatively.

## Under-engineering traps — check the absence of structure against these too

Structure isn't only a cost; its absence has failure modes. Don't let "avoid
over-engineering" become an excuse to skip structure a problem genuinely
needs.

- **God objects / god functions**: one unit accumulates every responsibility
  because nobody drew a seam. Symptom: you can't describe what it does in
  one sentence.
- **I/O entangled with logic**: business rules directly call the database/
  network inline, so testing the rule means testing the infrastructure too.
  This is exactly the gap hexagonal/repository close — if you're avoiding
  them purely to "keep it simple," check whether tests are actually painful
  as a result.
- **Hidden global/shared mutable state**: state threaded through
  side-channels (globals, singletons, module-level mutation) instead of
  explicit parameters/return values, making behavior depend on call order in
  ways that aren't visible at the call site.
- **Implicit contracts**: two parts of the system agree on a shape or
  invariant only by convention, never enforced or documented anywhere,
  so it silently breaks when one side changes.
- **No seam at the one axis that actually is volatile**: if you already know
  (from real history, not speculation) that a specific thing changes often,
  and there's still no structure isolating it, that's under-engineering,
  not simplicity.

## Quick self-check before finalizing a design

1. Can you name the specific future change each piece of structure protects
   against, in one sentence?
2. Is that change plausible (has happened before, or is explicitly planned),
   not just imaginable?
3. If you removed this piece of structure, what test or requirement would
   break *today* — not hypothetically?

If you can't answer 1–3 for a given seam, cut it and default to the
simplest shape (`patterns.md` § 1).
