# Pattern catalog — matched to problem shape, not domain

Each entry: the **symptoms/constraints** that call for the pattern, **why**
it helps, what it **costs**, and when it's a trap. Match on symptoms, not on
"this is a web app" or "this is a CLI" — the same pattern applies across
domains when the underlying shape matches.

## Table of contents
1. Single module / straight-line code (the default)
2. Layered architecture
3. Hexagonal / ports-and-adapters
4. Event-driven / pub-sub
5. CQRS (command-query responsibility segregation)
6. Pipeline / pipes-and-filters
7. State machine
8. Strategy / plugin pattern
9. Repository pattern
10. Saga / orchestration for distributed transactions

---

## 1. Single module / straight-line code

**Symptoms that call for it:** one clear input, one clear output, logic that
a single person can hold in their head, no near-term need to swap parts out.

**Why:** zero indirection tax. The fastest to write, read, and change while
it stays this size.

**Cost:** none — this is the baseline everything else is measured against.

**Trap:** treating "it might grow later" as justification to skip this and
jump straight to a layered/pluggable design. It's cheap to introduce a seam
later, at the point a second variant actually shows up (see
`heuristics.md` § "Rule of three"). Most code never needs to grow past this.

---

## 2. Layered architecture

**Symptoms:** distinct concerns that change at different rates — e.g.
presentation logic churns with every UI tweak, business rules churn with
product changes, data access churns with infra changes — and mixing them
makes each change touch unrelated code.

**Why:** isolates change: a UI tweak shouldn't risk a business-rule bug, and
vice versa. Makes it possible to reason about one layer without loading the
others into your head.

**Cost:** more files/indirection; a change that legitimately spans layers
now touches multiple places.

**Trap:** layering by *technical category* (controllers/services/repos) when
the real volatility axis is something else (e.g. per-tenant behavior). Layers
that don't correspond to an actual difference in change-rate are just
ceremony — see `heuristics.md` § "Find the volatility axis."

---

## 3. Hexagonal / ports-and-adapters

**Symptoms:** core logic needs to be tested without spinning up real
infrastructure (DB, network, filesystem), or the infrastructure itself is
expected to change (swap databases, add a second API provider, support both
CLI and HTTP entry points) while the core rules stay the same.

**Why:** the domain logic depends only on small interfaces ("ports"); real
infrastructure is plugged in behind "adapters." Lets you unit-test business
rules with fakes, and swap an adapter without touching the core.

**Cost:** an interface + at least one extra adapter implementation even when
only one real backend exists yet; more ceremony for simple CRUD.

**Trap:** building this when there is, and will only ever be, exactly one
infrastructure implementation and no testing pain motivating the seam. If
nobody can name the second adapter or the test that needs the fake, this is
speculative generality — skip it until the second case is real.

---

## 4. Event-driven / pub-sub

**Symptoms:** one occurrence needs to trigger multiple, independent,
possibly-growing-in-number reactions (e.g. "order placed" should notify
billing, inventory, and analytics), and the producer shouldn't need to know
or care who's listening, or new listeners get added over time without
touching the producer.

**Why:** decouples producers from consumers; new reactions can be added
without modifying existing code (open/closed).

**Cost:** harder to trace "what happens when X occurs" by reading code alone
— control flow is implicit; needs monitoring/tracing to debug in production;
consistency across listeners requires explicit handling (retries,
ordering, idempotency).

**Trap:** using this for a fixed, small number of steps that always run
together in sequence and are unlikely to grow — that's simpler as a direct
function call chain or a pipeline (#6). Reach for events when the *set of
reactions* is genuinely open-ended, not just because "decoupling" sounds
good.

---

## 5. CQRS (command-query responsibility segregation)

**Symptoms:** read patterns and write patterns have fundamentally different
shapes or scaling needs — e.g. writes are narrow and transactional but reads
need heavily denormalized, differently-indexed, or aggregated views; or the
read load is orders of magnitude higher than write load.

**Why:** lets the read side and write side evolve and scale independently
without forcing one data model to serve both well.

**Cost:** real complexity — often two data models, a sync/projection
mechanism between them, eventual consistency to reason about.

**Trap:** applying this to ordinary CRUD where one model serves both reads
and writes just fine. This is one of the most commonly over-applied patterns
because it sounds architecturally serious; it should be a response to a
demonstrated read/write shape mismatch, not a default.

---

## 6. Pipeline / pipes-and-filters

**Symptoms:** data passes through a fixed sequence of independent
transformation steps (parse → validate → normalize → enrich → persist), and
steps might be reordered, added, removed, or reused across pipelines.

**Why:** each step is small, testable in isolation, and composable; the
sequence itself becomes visible and easy to change.

**Cost:** overhead of defining a stage interface; can obscure control flow
if steps need to short-circuit or branch heavily (pipelines fit linear flow,
not branching logic).

**Trap:** forcing branching, stateful, or bidirectional logic into a
pipeline shape. If step 3 needs to loop back to step 1, this isn't a
pipeline — consider a state machine (#7) instead.

---

## 7. State machine

**Symptoms:** an entity has a small number of well-defined states, and
behavior/valid-transitions depend on *which* state it's in (e.g. order
status: pending → paid → shipped → delivered, with specific illegal
transitions like delivered → pending).

**Why:** makes illegal transitions structurally hard to write, centralizes
"what can happen from here" instead of scattering `if status == X` checks
across the codebase.

**Cost:** upfront modeling effort to enumerate states/transitions; awkward
fit if the "states" are really just independent boolean flags that combine
freely (that's not a state machine, it's a flags problem).

**Trap:** modeling something as a state machine when the states don't share
mutually exclusive transitions, or when the transition logic is trivial
enough that scattered conditionals are actually more readable.

---

## 8. Strategy / plugin pattern

**Symptoms:** the same operation needs multiple interchangeable
implementations selected at runtime (e.g. different pricing rules per
region, different export formats, different auth providers), and the list of
variants is expected to grow.

**Why:** adding a new variant means adding a new implementation, not
modifying a growing if/else or switch statement; keeps each variant's logic
isolated and independently testable.

**Cost:** an interface plus one class/function per variant, even when there
are only one or two variants today.

**Trap:** introducing this for a single implementation "in case" a second
one shows up later — see `heuristics.md` § "Rule of three." Also a trap when
variants don't actually share a common interface shape (forcing a shared
signature that doesn't fit every variant is worse than a straightforward
conditional).

---

## 9. Repository pattern

**Symptoms:** business logic needs to query/persist data, but should not
know or care about the specific storage technology, and/or you want to unit
test business logic against fakes instead of a real database in every test.

**Why:** gives domain code a collection-like interface (`find`, `save`)
instead of query-language details; centralizes data-access logic instead of
scattering queries throughout the codebase.

**Cost:** an abstraction layer between domain code and the ORM/driver, which
can feel redundant if the ORM already provides a clean-enough interface and
there's no plan to swap storage or fake it in tests.

**Trap:** wrapping an ORM that's already a fine abstraction, purely out of
habit ("repositories are best practice"). Justify it by an actual testing or
swappability need, same as hexagonal (#3) — these two patterns often show up
together for that reason.

---

## 10. Saga / orchestration for distributed transactions

**Symptoms:** a single logical operation spans multiple services or data
stores that can't share one atomic transaction (e.g. reserve inventory in
service A, charge payment in service B, create shipment in service C), and
partial failure must be handled explicitly (compensating actions) rather than
rolled back for free.

**Why:** makes the multi-step, multi-service flow and its failure/compensation
paths explicit and centrally reasoned about, instead of implicit and
scattered across services.

**Cost:** real complexity — compensating actions for every step, careful
idempotency, and a coordination mechanism (orchestrator or choreography via
events).

**Trap:** reaching for this inside a single service/database that already
has real ACID transactions available — a saga solves a problem that a normal
transaction already solves for free when everything lives in one place.
