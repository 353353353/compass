# The ask-or-decide boundary

The single most important judgment in this skill: for each unstated detail,
do you fill it with a default and move on, or stop and ask the human? Getting
this boundary right is what separates "reduces how much the human specifies"
from both failure modes — burying them in questions, and guessing wrong on
the things that actually matter.

Default posture: **decide, don't ask.** Asking is the exception, justified by
a specific property of the decision — not a reflex when you feel unsure. Being
unsure is normal and usually resolves to a defensible default plus a recorded
assumption, not a question.

## Decide it yourself when ANY of these holds

- **There's a conventional default.** The ecosystem/framework/codebase has an
  obvious "the way it's done." Follow it. (Naming conventions, file layout,
  standard library choices, error-handling idioms, test framework.)
- **It's cheap to reverse.** If getting it wrong costs a small edit later,
  the expected cost of guessing is lower than the cost of interrupting the
  human. Guess, and note the assumption.
- **The user has no real stake.** Implementation details invisible to the
  user's goal (internal variable names, private helper structure, which of two
  equivalent libraries) are not worth a question.
- **The codebase already answers it.** Existing patterns, neighboring modules,
  lint/format config, established conventions. Matching what's there is almost
  always correct and needs no human — inferring from the repo beats asking.
- **The stated goal implies it.** If the user's objective only makes sense one
  way, that way is the answer; don't ask them to restate it.

For all of these: **record the assumption** in your spec-back (loop step 3) so
the human can veto it in one line. A cheap, visible default that's easy to
correct beats a question every time.

## Ask when ANY of these holds

- **Expensive or irreversible to unwind.** Anything that's costly to change
  after the fact or can't be undone: database schema, a public API or contract
  other code/teams depend on, data migrations, deletions, anything that sends
  data or side effects *out* of the system (emails, payments, external API
  writes, posts). Guessing here can destroy work or leak/act in the world.
- **Money, security, or privacy is involved.** Auth model, what data is stored
  or exposed, spending, permissions. The downside of a wrong guess is severe
  and asymmetric — always confirm.
- **Genuine product preference with material consequence.** A real fork in
  *what the thing does* (not how it's built) where reasonable people would
  choose differently and it visibly affects the user's outcome. There's no
  "correct" default to infer, and the cost of building the wrong one is high.
- **Guessing wrong wastes substantial work.** If a detail sits at the base of
  a large build and the wrong choice means redoing most of it, the interruption
  is cheaper than the rework. (Contrast a leaf detail, which is cheap to fix —
  decide that one.)

## Before concluding "no questions": sweep the high-stakes axes

The drive to minimize questions has a specific failure mode — narrowing so
hard onto the one obvious fork that you skip a *second* high-stakes axis the
request quietly touches. Minimizing questions means asking few, not missing
the ones that matter. So before you decide a request needs zero (or only one)
questions, explicitly sweep these axes and check whether the feature touches
any — each is "expensive/irreversible" or "money/security/privacy," so a live
one belongs on the ask side:

- **Money / billing** — does this interact with subscriptions, payments,
  refunds, credits, or paid entitlements? (Account deletion, plan changes,
  and data export all commonly do, and it's easy to tunnel past.)
- **Auth / access** — does it change who can log in, what they can reach, or
  session/token validity?
- **Data retention / legal** — does it delete, expose, export, or retain
  personal data in a way that has compliance or audit implications?
- **External side effects** — does it send anything out of the system
  (email, webhooks, third-party API writes, public posts)?
- **Irreversible data operations** — schema changes, migrations, bulk
  updates, hard deletes.

This is a checklist against *tunnel vision*, not a license to ask about all
five every time — most requests touch none, and you note that and move on.
But when the headline ask is itself high-stakes (deleting an account, changing
a plan, exporting data), assume it drags a second axis with it and check.

## How to ask, when you do ask

- **Batch into one round.** Gather every question the task needs and ask them
  together. Drip-feeding clarifications one at a time is its own failure mode —
  it's slow and it reads as not having thought the task through.
- **Lead with a recommendation.** Phrase each question so the human can confirm
  rather than compose: "I'll use X (it matches the existing Y and needs no
  migration) — say so if you'd rather Z." This keeps even the necessary
  questions cheap to answer.
- **Only ask what still matters after inference.** Before asking, re-check: can
  the repo, the convention, or the goal answer this? Ask only the residue that
  genuinely can't be inferred and genuinely clears the bar above.

## Worked examples

**Vague ask: "add a CSV export to the reports page."**
- Decide (default + record): file naming, column order following the on-screen
  table, streaming vs buffered (pick by data size), UTF-8 encoding, where the
  button goes (match existing actions). None need the human.
- Ask: only if there's a real fork with consequence — e.g. "should the export
  respect the current filters, or export everything?" changes *what the user
  gets* and both are reasonable. That one's worth confirming; the rest aren't.

**Vague ask: "let users delete their account."**
- Ask: hard-delete vs soft-delete/anonymize, and what happens to their content
  — irreversible, privacy-laden, legally consequential, no safe default.
- Decide: the button's placement, the confirmation-dialog copy, the internal
  function names. Leaf details, cheap to change.

**Vague ask: "make the importer faster."**
- Decide/measure: profile first (the goal implies finding the bottleneck), then
  apply the standard fix for whatever it is. Don't ask "how fast?" unless a
  target actually changes the approach.
- Ask: only if the fastest path requires a tradeoff the user has a stake in —
  e.g. "I can 10x it by switching to eventual consistency on the import status;
  acceptable, or must it stay strongly consistent?" That's a real product fork.

## The through-line

Every "decide" above shares a shape: conventional, reversible, inferable, or
invisible to the user's goal. Every "ask" shares the opposite: irreversible,
high-stakes, a genuine preference fork, or expensive to get wrong. When a case
is unclear, ask *which side it's on* — that's usually easier to answer than the
detail itself, and it tells you whether to spend a question on it.
