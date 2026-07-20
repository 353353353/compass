---
name: engineer-brain-verify
description: Use right after implementing a nontrivial feature, module, service, or refactor — before considering it done — to check that the code actually honored the design decision that shaped it (the pattern/structure/seam you committed to, e.g. from the engineer-brain skill) and didn't drift during coding into over- or under-engineering. Trigger this when you just finished writing structural code, when a change turned out bigger or messier than the plan, when you added abstractions/interfaces/config while coding, or whenever you're about to say "done" on something whose shape mattered. This checks design conformance (did the intended structure materialize, are the seams real, did tests land at them) — distinct from the built-in `verify` skill (does the code behave correctly) and `code-review` (does it have bugs). Loop: report the drift, auto-fix the clear/small ones, escalate the ambiguous ones.
---

# Engineer Brain — verify the design survived implementation

Phase 1 (the `engineer-brain` skill) decides the structure *before* coding.
This skill runs *after*: implementation is where a clean plan quietly rots —
a port ends up leaking its concrete type, a "state machine" degrades into
scattered `if status ==` checks, an interface with one implementation and no
test sneaks in "while I was there." The plan was justified by a specific
reason; this skill checks the code still earns that reason, and closes the
gap where it doesn't.

This is a *design-conformance* check, not a behavior check. It complements,
and does not replace:
- **`verify`** (built-in) — does the code actually do what it's supposed to?
- **`code-review`** — does the code have correctness bugs?

Run those for behavior and bugs. Run *this* for "did the structure I
committed to actually get built, and is it still the right amount?"

## The loop

### 1. Recover the design intent

Find the one-sentence justification the design rested on — the
`engineer-brain` step "state the decision and the reason" produces exactly
this (e.g. "ports-and-adapters seam here because we'll swap storage in phase
2 and want to unit-test the domain without a DB"). Look for it in the
conversation, a commit message, a design note, or a code comment.

If no such sentence exists, reconstruct it now: given the code as written,
what structure did it commit to, and what property was that structure
supposed to buy? You can't check conformance against an intent you can't
state — so state it first, in one sentence.

### 2. Check the code against the intent

Walk `references/checklist.md` — it has the concrete checks in six groups:
did the justified structure actually materialize; are the seams real or
cosmetic; did tests land where the structure promised them; did coding drift
into over-engineering; did it drift into under-engineering; is the
one-sentence justification still true of the code. Read that file and apply
the groups that fit what you built (skip ones that don't apply — a pure
data-transform has no "seam" to check).

### 3. Report the drift

List what you found, most-significant first, each as: the drift, where it is
(`file:line`), and which way it drifted (over vs under vs pattern-not-
realized). An empty list is a valid, good result — say so plainly rather
than inventing findings to look thorough. Report before touching anything,
so the reasoning is visible even for fixes you're about to make yourself.

### 4. Fix or escalate

For each finding, decide:

- **Fix it yourself** when the correction is clear and small, and not
  antithetical to the design intent — e.g. delete a one-implementation
  interface that no test needs, add the missing test at a seam that was the
  whole point of the seam, stop a concrete type leaking through a port. After
  fixing, re-run the relevant checks (step 2) on what you changed — a fix can
  introduce its own drift.
- **Escalate** — ask the human via `AskUserQuestion` — when the fix is large
  (a real refactor), architecturally significant, or ambiguous (the finding
  could be read as "the code is wrong" or "the original decision was wrong,"
  and you can't tell which). Give enough context to answer without scrolling
  back. Reversing a design decision is the human's call, not a silent
  auto-fix.

Stop when the checklist is clean or every remaining finding is escalated.
Then the change is done in the sense this skill cares about: the structure
you paid for is actually there, actually used, and actually the right amount.

## Note on Phase 3

The next planned layer (`engineer-brain`, not yet built) is meta-knowledge
about automating the engineering process itself — reducing how much a human
must specify at all. It would sit on top of Phase 1 (decide) and this Phase 2
(verify). Not in scope here; noted so the family stays coherent.
