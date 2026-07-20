---
name: delegate-work
description: Use on any nontrivial coding task while the session is driven by a capable, expensive model (Opus, Fable 5, or any model whose budget you want to conserve) to decide, per chunk of work, whether to delegate it to a cheaper subagent tier — and to route it there. Trigger whenever you're about to do bounded, well-specified execution work yourself (implementing an already-decided design, boilerplate, repetitive multi-file edits, writing tests, locating code, running tests/builds, mechanical refactors/renames/formatting) so the driver spends its budget only on judgment. Match each chunk to the cheapest model that can do it well — Haiku for trivial mechanical work, Sonnet for well-specified implementation, Opus for a hard but self-contained chunk. Especially reach for it when the driver's budget is running low, or at the start of a multi-step task to plan which parts go where.
---

# Delegate work — send each chunk to the cheapest model that can do it well

The goal is token economy without quality loss: the session's driver model
(whatever capable model is steering — Opus, Fable 5, ...) keeps only the work
that needs its judgment, and hands bounded, well-specified work to cheaper
subagents. The refinement over "always delegate to Sonnet" is **tiering**:
different chunks need different amounts of capability, so route each to the
*cheapest tier that will do it well* rather than one fixed target.

## What this can and can't do

Claude Code can't auto-switch the *main session* model by task — only the user
(`/model`, or the model picker at session start) sets which model drives, and a
model can't switch itself. So "automatic switching" here means **delegation**:
the driver stays put and routes delegatable work to subagents, choosing the
model tier per chunk. Spawn the `worker` agent with its model set to the tier
you chose (the Agent tool's model override wins over the agent's default), or
spawn any subagent with an explicit model. Once this convention is in place the
routing happens every task without the human re-deciding — that's the
automation.

## Pick the tier: cheapest model that does the chunk well

Default to the cheapest tier and step up only when the cheaper one would
likely produce something wrong or low-quality that needs redoing.

### Haiku — trivial, fully mechanical, low-ambiguity
- Formatting, simple find/replace renames, moving files.
- Running a build/test/linter and reporting the output.
- Tiny, fully-specified edits with no reasoning required.

### Sonnet — bounded and well-specified, needs solid but not deep reasoning
- Implementing to an already-decided design/spec (only the typing-out remains).
- Boilerplate, scaffolding, repetitive edits across files.
- Writing straightforward tests for behavior that's already defined.
- Locating code / exploration ("where is X", "which files touch Y").
- Moderate mechanical refactors and codemods.

### Opus — hard but self-contained, needs strong reasoning off the driver
- A tricky isolated algorithm or a gnarly-but-well-scoped bug with a clear
  repro, where a mid-tier model would likely get it subtly wrong.
- A self-contained design *within* an already-decided architecture.
- Use this mainly when the driver itself is a cheaper model (e.g. a Fable 5 or
  Sonnet driver low on budget) and one chunk genuinely needs top-tier
  reasoning — delegate that chunk "up" to Opus while the cheap driver keeps
  steering. When the driver is already Opus, delegating to an Opus worker is
  worth it only to isolate a hard, self-contained problem in its own context
  window, not for cost.

### Keep on the driver — do NOT delegate to any tier
- Architecture and design decisions (that's `engineer-brain` territory).
- Ambiguous or underspecified work where the spec has to be *invented* — if
  you can't write a precise brief, no worker can execute it; decide first.
- The routing decisions themselves (which tier, whether to delegate at all).
- Anything touching money, security, privacy, auth, or irreversible data ops.
- Cross-cutting reasoning, tradeoff calls, and final review of what comes back.

## The break-even check

Delegation has a fixed cost: writing a precise, self-contained brief (the
subagent starts cold) plus reviewing the result. If that costs more than just
doing the chunk yourself — because it's tiny, or so entangled with your
current context that specifying it is most of the work — do it yourself.
Delegate chunks big or repetitive enough that the handoff pays for itself. This
matters more for the Haiku tier: a task small enough for Haiku is often small
enough that briefing it costs more than doing it — delegate the *volume* of
mechanical work (many similar edits), not a single trivial one.

## How to delegate

1. **Decide the design first if it isn't settled.** Workers execute; they
   don't design. If the structure is open, make the call yourself (use
   `engineer-brain`) before handing off — otherwise you're delegating a
   decision, not a task.
2. **Pick the tier** using the guide above — cheapest that will do it well.
3. **Write a precise, self-contained brief.** Include: the exact task, the
   files/paths, the decided design/pattern, the expected output, how to verify
   it (the test/command), and the scope boundary (what NOT to touch). Vague
   briefs are the main way delegation goes wrong; a lower tier needs a tighter
   brief.
4. **Spawn the `worker` agent with the chosen model** (or any subagent with an
   explicit model). Batch independent chunks into parallel workers — and note
   they can run at different tiers.
5. **Review the result on the driver.** Check it against the brief and the
   design intent — the judgment step that justifies keeping the driver on the
   capable model. `engineer-brain-verify` is the natural tool for reviewing
   delegated structural code. Fix, re-delegate, or escalate a tier as needed.

## "Driver budget is low — delegate everything you can"

When the driver's remaining budget is nearly spent and you're told to offload
aggressively: route *every* delegatable chunk to its cheapest capable tier and
keep only the irreducible judgment (routing, review, the genuinely ambiguous
calls) on the driver. Note that the driver can't reliably see its own remaining
budget, so treat "budget is low" as a signal *from the user* to shift into
aggressive-delegation mode, not something to detect on your own.

## Traps

- **Delegating a decision.** Handing a worker something underspecified so *it*
  makes the design/product call. Decide first, then delegate execution.
- **Wrong tier.** Sending deep-reasoning work to Haiku (it ships something
  subtly wrong) or trivial work to Opus (you overpay). Match difficulty to
  tier.
- **Briefs too thin to execute.** The cold-start worker needs the context in
  your head. Under-specifying wastes the whole round-trip — worse at lower
  tiers.
- **Skipping review.** The savings are real only if the driver still owns
  correctness. Don't rubber-stamp — verify what comes back.
