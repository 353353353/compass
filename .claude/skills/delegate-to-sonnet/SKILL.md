---
name: delegate-to-sonnet
description: Use on any nontrivial coding task while running on an expensive model (Opus) to decide, per chunk of work, whether it can be delegated to a cheaper Sonnet subagent to save tokens — and to actually route it there. Trigger this whenever you're about to do bounded, well-specified execution work yourself (implementing an already-decided design, boilerplate, repetitive multi-file edits, writing straightforward tests, locating code, running tests/builds, mechanical refactors/renames/formatting) so that the expensive model spends its budget only on judgment (architecture, ambiguous debugging, tradeoffs, review). Especially reach for it at the start of a multi-step task to plan which parts go to Sonnet, and before starting any large mechanical edit. Keep the driver on Opus; push the "volume" work down.
---

# Delegate to Sonnet — spend the expensive model only on judgment

The goal is token economy without quality loss: keep the expensive driver
model (Opus) for the parts that actually need its judgment, and hand the
bounded, well-specified "volume" work to a Sonnet subagent, which costs far
less per token. Applied consistently, most of the keystrokes in a task run on
the cheap model while the hard thinking stays on the capable one.

## What this can and can't do

Claude Code has no way to auto-switch the *main session* model by task — only
the user (`/model`) or config can set it, and a model can't switch itself. So
"automatic switching" here means **delegation**: the driver stays on Opus and
routes delegatable work to a Sonnet subagent (the `sonnet-worker` agent, or
any subagent spawned with the model set to `sonnet`). Once this convention is
in place, that routing happens every task without the human re-deciding — that
is the automation.

## The routing decision

For each chunk of work, ask: **does this need Opus-level judgment, or is it
bounded execution against decisions already made?**

### Delegate to Sonnet when the work is well-specified and bounded
- Implementing to an already-decided design/spec (the pattern, layout, and
  behavior are settled — only the typing-it-out remains).
- Boilerplate, scaffolding, config, repetitive edits repeated across files.
- Writing straightforward tests for behavior that's already defined.
- Locating code / exploration ("where is X", "which files touch Y").
- Running tests, builds, linters and reporting results.
- Mechanical refactors, renames, formatting, codemods.
- Formatting a document from content you've already written.

### Keep on Opus (the driver) — do NOT delegate
- Architecture and design decisions (that's `engineer-brain` territory).
- Ambiguous or underspecified work where the spec has to be *invented* — if
  you can't write a precise brief, Sonnet can't execute it; decide first.
- Hard debugging with an unclear root cause.
- Anything touching money, security, privacy, auth, or irreversible data ops,
  where a subtle wrong call is expensive.
- Tradeoff calls and cross-cutting reasoning.
- Reviewing/verifying the delegated result for subtle correctness — the
  driver owns the final judgment, including deciding whether to delegate at
  all.

### The break-even check
Delegation has a fixed cost: you must write a precise, self-contained brief
(the subagent starts cold with none of your context) and then review what
comes back. If that brief-plus-review costs more than just doing the chunk
yourself — because it's tiny, or so entangled with your current context that
specifying it is most of the work — **do it yourself**. Delegate the chunks
big or repetitive enough that the handoff pays for itself.

## How to delegate

1. **Decide the design first if it isn't settled.** Sonnet executes; it
   doesn't design. If the structure is still open, make the call yourself
   (use `engineer-brain`) before handing off — otherwise you're delegating a
   decision, not a task.
2. **Write a precise, self-contained brief.** The subagent has none of your
   conversation. Include: the exact task, the files/paths, the decided
   design/pattern, the expected output, how to verify it (the test/command),
   and the scope boundary (what NOT to touch). Vague briefs are the main way
   delegation goes wrong.
3. **Spawn the `sonnet-worker` subagent** (or a subagent with the model set to
   `sonnet`) with that brief. Batch independent chunks into parallel
   subagents when they don't depend on each other.
4. **Review the result on the driver.** Check it against the brief and the
   design intent — this is the judgment step that justifies keeping the
   driver on Opus. `engineer-brain-verify` is the natural tool for reviewing
   delegated structural code. Fix or re-delegate as needed.

## Traps

- **Delegating a decision.** Handing Sonnet something still underspecified so
  *it* makes the design/product call. Decide first, then delegate the
  execution.
- **Briefs too thin to execute.** The cold-start subagent needs the context
  you have in your head. Under-specifying wastes the whole round-trip.
- **Delegating past the break-even.** Splitting off chunks so small the
  brief+review costs more than doing them. Delegate volume, not trivia.
- **Skipping review.** The savings are real only if the driver still owns
  correctness. Don't rubber-stamp — verify what comes back.
