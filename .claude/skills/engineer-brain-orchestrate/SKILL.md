---
name: engineer-brain-orchestrate
description: Use when handling a build/change request that is underspecified or open-ended — the user said what they want at a high level but left most of the details unstated, and you're deciding how much to ask versus how much to just decide and do. Trigger this at the very start of a feature/module/refactor request, before asking a pile of clarifying questions or before diving in blind: it turns a vague ask into a complete spec by inferring sensible defaults, surfaces only the few decisions that genuinely need the human, and then runs the decide→implement→verify loop (engineer-brain → code → engineer-brain-verify) autonomously with minimal check-ins. Especially reach for it when tempted to over-ask ("death by a thousand clarifications") or to guess on something irreversible. This is the top layer of the engineer-brain family: it reduces how much the human has to specify at all.
---

# Engineer Brain — orchestrate: from vague ask to done, minimally supervised

The goal of this skill is to *reduce how much the human has to specify*, without
going off the rails. A vague request is not a blocked request — most of the gaps
have a defensible default, and the human's time should be spent only on the few
decisions that actually change the outcome and that only they can make. Asking
about everything is as much a failure as guessing about the wrong things.

This is the layer above the other two:
- **`engineer-brain`** — decides the structure before coding.
- **`engineer-brain-verify`** — checks the code honored that decision, after.
- **this skill** — turns the underspecified ask into a spec, then drives those
  two (plus implementation and behavior-testing) in a loop with minimal human
  checkpoints.

## The loop

### 1. Infer the spec

Turn the vague ask into a concrete, actionable spec. For each unstated detail,
either fill it with a defensible default or mark it as a real question — using
the ask-or-decide boundary below. Pull defaults from what's already knowable:
the codebase's existing conventions and patterns, the obvious/conventional
choice for this kind of thing, and what the user's stated goal implies. Prefer
inferring from the repo over asking — matching what's already there is almost
always right and needs no human.

### 2. Apply the ask-or-decide boundary

This is the heart of the skill. For each gap, **decide it yourself** by default;
**ask** only when a gap clears the bar. Read `references/ask-or-decide.md` for
the full criteria and examples; the short version:

- **Decide yourself (don't ask)** when the choice has a conventional default,
  is cheap to reverse, is an implementation detail the user has no stake in, or
  can be inferred from existing code. Record the assumption instead of asking —
  a cheap correction later beats a question up front.
- **Ask** when getting it wrong is expensive or irreversible (schema, public
  API/contract, data migration, deletion, money, security, privacy, anything
  that leaves the system or can't be un-done), when it's a genuine product
  preference with material consequence and no right answer, or when guessing
  wrong would waste substantial work.
- If you must ask, **batch every question into one round** — don't drip-feed
  clarifications. And lead with your recommended answer so the human can just
  confirm.

### 3. State the spec back, compactly

Before building, give the human a short spec: what you'll build, and — flagged
clearly — the assumptions you filled in. This is the safety valve that makes
aggressive default-filling safe: the human can veto a wrong default in one line,
far cheaper than you having asked about all of them. Then proceed without
waiting for approval on the assumptions unless one of them actually cleared the
"ask" bar in step 2.

### 4. Drive the decide→build→verify loop

Now run the engineering loop, autonomously:

1. **Decide** — apply `engineer-brain` to choose the structure for the spec.
2. **Implement** — write the code to that decision.
3. **Verify design** — apply `engineer-brain-verify` to check the code honored
   the decision; auto-fix the clear drift, iterate.
4. **Verify behavior** — run the tests / exercise the change (the built-in
   `verify` skill covers this) to confirm it actually works.
5. **Iterate** on failures from 3–4 yourself. A failing test or a design drift
   is a normal loop step, not a reason to stop and ask.

### 5. Checkpoint only where warranted

Stay in the loop autonomously; surface to the human only when a *new* decision
appears mid-flight that clears the step-2 "ask" bar (an irreversible choice you
didn't foresee, a discovery that the spec itself was wrong, scope that balloons
beyond what was inferred). Otherwise finish, then report: what you built, the
assumptions you made, and how you confirmed it works. Guard against the two
runaway modes — looping forever without converging, and silently expanding
scope past the inferred spec; if you hit either, stop and surface it.

## Traps to avoid

- **Over-asking** — a wall of clarifying questions for things with obvious
  defaults. This defeats the entire purpose of the skill. Infer and state
  assumptions instead.
- **Under-asking on what matters** — guessing on the irreversible/high-stakes
  handful. The boundary is not "ask less about everything"; it's "ask about the
  few things that actually need it, and nothing else."
- **Silent scope drift** — building more (or more elaborate) than the inferred
  spec. If you find yourself adding capability nobody asked for, stop; that's
  the over-engineering trap `engineer-brain` warns about, one level up.
- **Runaway autonomy** — iterating without converging. Cap your own loops: if a
  couple of rounds don't close a gap, surface the diagnosis instead of grinding.

## Family status

This completes the planned three-phase engineer-brain family (decide → verify →
orchestrate). Further layers, if any, should compose the same way: a thin
SKILL.md driving the phase below it, defaults inferred over asked, and the human
consulted only where a decision is genuinely theirs to make.
