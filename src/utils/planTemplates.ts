/**
 * Starter templates for the Structured Plan Import feature.
 *
 * Each template is designed to do double duty:
 *   1. A user can edit it directly and create a project on the canvas.
 *   2. A user can paste it into a coding agent (Claude Code, Cursor, ChatGPT)
 *      as a *format spec* — the agent can fill in their own idea while keeping
 *      the structure that the markdown parser understands.
 *
 * Every template exercises the full DSL so the format is self-documenting:
 *   - `# Title`                  → project title
 *   - `## Phase`                 → top-level container
 *   - `## Phase (parallel)`      → parallel phase (no sequential edges between children)
 *   - `- Task: Name`             → child action node
 *   - `  depends_on: A, B`       → cross-task dependency edges
 *   - paragraph under `##`       → phase description / notes
 *   - `### Verification`         → acceptance criteria pinned to the phase
 */

export interface PlanTemplate {
    id: string;
    label: string;
    description: string;
    markdown: string;
}

const FORMAT_LEGEND = `<!--
  FORMAT LEGEND — keep this comment or delete it; the parser ignores HTML comments.
  - "# Title"                       → project title (use exactly one)
  - "## Phase"                      → a phase / container node
  - "## Phase (parallel)"           → siblings inside run in parallel (no sequential chain)
  - "- Task: Name"                  → an action node inside the current phase
  - "  depends_on: A, B"            → 2-space indent under a task; comma-separated labels
  - text under a "##" heading       → becomes the phase's description / notes
  - "### Verification"              → bullet list becomes the phase's acceptance criteria
  Tips for coding agents:
  - Keep task labels short (2-6 words). Put detail in description paragraphs.
  - Reference dependencies by exact task label (case-insensitive).
  - Prefer 3-7 phases; split work into containers when a phase grows past ~8 tasks.
-->
`;

const CODING_AGENT_PROCESS = `${FORMAT_LEGEND}# Feature: <Replace with the feature or process you are building>

A one-paragraph description of the goal, the user it serves, and the success
criteria. The coding agent should rewrite this section based on the idea you
provide. Keep it under ~5 sentences so it fits well on a node card.

## Discovery
Understand the problem space before writing code. The agent should map out
existing patterns, constraints, and prior art so later phases reuse code
instead of reinventing it.

- Task: Read related modules
- Task: List affected files
- Task: Identify reusable utilities
- Task: Note open questions
  depends_on: Read related modules

### Verification
- Every affected file path is listed with a one-line reason
- Open questions have a proposed default answer

## Design
Decide the shape of the change before touching production code.

- Task: Sketch data model
- Task: Define public API
  depends_on: Sketch data model
- Task: List edge cases
- Task: Pick a rollout plan
  depends_on: Define public API

### Verification
- Data model diagram or type definitions exist
- Edge cases are written down with expected behavior

## Build (parallel)
Independent tracks that can progress in parallel. Mark this phase
\`(parallel)\` so the parser does not chain the tasks sequentially.

- Task: Implement core logic
- Task: Wire UI surface
- Task: Add types & schemas
- Task: Write unit tests
  depends_on: Implement core logic

## Integrate
Bring the parallel tracks together and prove they work end-to-end.

- Task: Connect UI to logic
  depends_on: Implement core logic, Wire UI surface
- Task: Run full test suite
  depends_on: Connect UI to logic, Write unit tests
- Task: Manual smoke test

### Verification
- Lint, typecheck, and tests pass
- Feature works in dev build via the documented golden path
- No regressions in adjacent features

## Ship
Make the change visible to users with a safety net.

- Task: Update docs / changelog
- Task: Open pull request
  depends_on: Run full test suite, Update docs / changelog
- Task: Address review feedback
  depends_on: Open pull request
- Task: Merge & monitor
  depends_on: Address review feedback

### Verification
- PR description summarizes the change and test plan
- Post-merge dashboards / logs show no new errors for 24h
`;

const PROJECT_PLAN = `${FORMAT_LEGEND}# Project: <Replace with project name>

A short framing paragraph: what success looks like, who the customer is, and
the rough timeline. The coding agent should keep this under ~5 sentences.

## Phase 1: Research
Gather everything we need to make informed design decisions.

- Task: Market Analysis
- Task: Competitor Review
- Task: User Interviews
- Task: Synthesize findings
  depends_on: Market Analysis, Competitor Review, User Interviews

### Verification
- Findings written up in a single shareable doc
- Top 3 risks called out explicitly

## Phase 2: Design (parallel)
Visual and system design happen in parallel — they only converge in Phase 3.

- Task: Wireframes
- Task: Design System
- Task: Information Architecture
- Task: Interaction Prototypes
  depends_on: Wireframes

## Phase 3: Development
Build the product on top of the agreed design.

- Task: Frontend
  depends_on: Wireframes, Design System
- Task: Backend
- Task: Integrate Frontend & Backend
  depends_on: Frontend, Backend
- Task: Internal QA
  depends_on: Integrate Frontend & Backend

### Verification
- All P0 stories pass acceptance criteria
- Performance budget met on the slowest target device

## Phase 4: Launch
Coordinated release with a rollback plan.

- Task: Final QA pass
  depends_on: Internal QA
- Task: Marketing Campaign
- Task: Deploy to production
  depends_on: Final QA pass
- Task: Monitor & respond
  depends_on: Deploy to production, Marketing Campaign

### Verification
- Rollback runbook tested in staging
- On-call coverage scheduled for the first 72h
`;

const LEARNING_PATH = `${FORMAT_LEGEND}# Learning Path: <Replace with topic, e.g. TypeScript / Rust / Linear Algebra>

A one-paragraph statement of why you want to learn this and what "done" looks
like — a portfolio piece, a job-ready skill, a passing exam, etc.

## Stage 1: Foundations
Build a mental model before practicing. Skim wide, then read deep on the
parts that map to your goal.

- Task: Read the official intro / handbook
- Task: Set up a sandbox project
- Task: Note 5 confusing concepts
  depends_on: Read the official intro / handbook

### Verification
- Sandbox runs the language's "hello world" or equivalent
- Confusing-concepts list has a draft definition for each item

## Stage 2: Practice (parallel)
Three independent tracks reinforce the same fundamentals from different
angles. Do them in any order.

- Task: Build a small CLI tool
- Task: Convert an existing project
- Task: Work through type / problem challenges
- Task: Read one well-known open-source repo

## Stage 3: Apply
Use the skill on something that matters to you.

- Task: Pick a real project
- Task: Ship a feature in the new language
  depends_on: Build a small CLI tool, Pick a real project
- Task: Get code review from a practitioner
  depends_on: Ship a feature in the new language

### Verification
- Project compiles / runs in strict / idiomatic mode
- No "any" / unsafe escape hatches in your application code
- Review feedback is captured and addressed or scheduled

## Stage 4: Teach
Teaching exposes the gaps in your understanding.

- Task: Write a short blog post
  depends_on: Get code review from a practitioner
- Task: Pair with someone newer than you
- Task: Identify the next learning goal
  depends_on: Write a short blog post

### Verification
- Blog post explains one concept that confused you in Stage 1
- Next goal is written down with a target date
`;

const GENERAL_WORKFLOW = `${FORMAT_LEGEND}# Workflow: <Replace with initiative name>

A short paragraph of context: why this initiative exists, who owns it, and
what "done" looks like. Coding agents should rewrite this in 2-4 sentences.

## Kickoff
Align on the goal and the people involved before any work starts.

- Task: Define goal
- Task: Identify stakeholders
- Task: Set success metric
  depends_on: Define goal

### Verification
- Goal fits in one sentence
- Success metric is measurable, not a vibe

## Plan
Translate the goal into work that can actually be executed.

- Task: Break work into tracks
  depends_on: Set success metric
- Task: Estimate effort per track
  depends_on: Break work into tracks
- Task: Identify blockers & dependencies
  depends_on: Break work into tracks

## Execute (parallel)
Independent tracks. Mark the heading \`(parallel)\` so they do not chain.

- Task: Track A
- Task: Track B
- Task: Track C

## Review
Bring the tracks back together and decide what to do next.

- Task: Collect feedback
  depends_on: Track A, Track B, Track C
- Task: Compare against success metric
  depends_on: Collect feedback
- Task: Decide next steps
  depends_on: Compare against success metric

### Verification
- Feedback captured from every stakeholder identified in Kickoff
- Next-steps decision is written down with an owner per item
`;

const BUG_FIX = `${FORMAT_LEGEND}# Bug Fix: <Replace with one-line bug summary>

A short paragraph: the user-visible symptom, the suspected impact (how many
users / how often), and a link to the bug report. Coding agents should keep
this tight — the meat is in Reproduce / Diagnose.

## Reproduce
Pin down exact steps before you change anything. A bug you cannot reproduce
is a bug you cannot prove fixed.

- Task: Capture exact steps
- Task: Note environment & versions
- Task: Record a failing test or screen capture
  depends_on: Capture exact steps

### Verification
- Steps reproduce the bug at least 2 times in a row
- Failing test runs locally and in CI

## Diagnose
Understand the root cause, not just the symptom.

- Task: Bisect to a suspect commit
  depends_on: Record a failing test or screen capture
- Task: Read the relevant code path
- Task: Form a root-cause hypothesis
  depends_on: Bisect to a suspect commit, Read the relevant code path
- Task: Confirm hypothesis with a print / debugger
  depends_on: Form a root-cause hypothesis

## Fix
Smallest change that resolves the root cause. Resist the urge to refactor.

- Task: Implement the fix
  depends_on: Confirm hypothesis with a print / debugger
- Task: Failing test now passes
  depends_on: Implement the fix
- Task: Audit nearby code for the same mistake
  depends_on: Implement the fix

### Verification
- The original repro steps no longer trigger the bug
- New regression test fails on the previous commit and passes on this one
- Lint, typecheck, and full test suite pass

## Ship
Get the fix to users without breaking anything else.

- Task: Open PR with before/after notes
  depends_on: Audit nearby code for the same mistake
- Task: Address review feedback
  depends_on: Open PR with before/after notes
- Task: Merge & verify in production
  depends_on: Address review feedback
`;

const RESEARCH_SPIKE = `${FORMAT_LEGEND}# Research Spike: <Replace with question, e.g. "Should we adopt X?">

A 2-3 sentence statement of the question, why it matters now, and the
decision that depends on the answer. Time-box the spike up front.

## Frame
Lock the scope before reading anything — spikes love to sprawl.

- Task: Write the decision question
- Task: List options to evaluate
- Task: Define evaluation criteria
  depends_on: Write the decision question
- Task: Set a time budget
  depends_on: Write the decision question

### Verification
- Decision question fits in one sentence
- Each option has 3-5 evaluation criteria

## Investigate (parallel)
One track per option so comparisons are apples-to-apples.

- Task: Option A — read docs & build a toy
- Task: Option B — read docs & build a toy
- Task: Option C — read docs & build a toy
- Task: Talk to someone who has used each option

## Synthesize
Turn raw notes into a decision-grade comparison.

- Task: Score each option against criteria
  depends_on: Option A — read docs & build a toy, Option B — read docs & build a toy, Option C — read docs & build a toy
- Task: Identify the dominant option (or "no decision yet")
  depends_on: Score each option against criteria
- Task: Write the recommendation memo
  depends_on: Identify the dominant option (or "no decision yet")

### Verification
- Memo states the recommendation and the reasoning in <500 words
- Memo lists the conditions under which the decision should be revisited

## Decide
Stop researching and pick.

- Task: Review memo with decision-maker
  depends_on: Write the recommendation memo
- Task: Record the decision
  depends_on: Review memo with decision-maker
- Task: File follow-up tasks
  depends_on: Record the decision
`;

export const PLAN_TEMPLATES: PlanTemplate[] = [
    {
        id: 'coding-agent-process',
        label: 'Coding Agent Process',
        description: 'Detailed Discovery → Design → Build → Integrate → Ship template — paste into Claude Code / Cursor / ChatGPT and let the agent fill in the specifics for any feature.',
        markdown: CODING_AGENT_PROCESS,
    },
    {
        id: 'project-plan',
        label: 'Project Plan',
        description: 'Phased delivery with parallel design, cross-phase dependencies, and verification gates per phase.',
        markdown: PROJECT_PLAN,
    },
    {
        id: 'learning-path',
        label: 'Learning Path',
        description: 'Foundations → Practice (parallel) → Apply → Teach. Strong scaffold for picking up any new skill.',
        markdown: LEARNING_PATH,
    },
    {
        id: 'general-workflow',
        label: 'General Workflow',
        description: 'Kickoff → Plan → Execute (parallel) → Review. Minimal scaffold for any initiative.',
        markdown: GENERAL_WORKFLOW,
    },
    {
        id: 'bug-fix',
        label: 'Bug Fix',
        description: 'Reproduce → Diagnose → Fix → Ship. Forces a real root cause before code changes.',
        markdown: BUG_FIX,
    },
    {
        id: 'research-spike',
        label: 'Research Spike',
        description: 'Frame → Investigate (parallel) → Synthesize → Decide. Time-boxed evaluation of multiple options.',
        markdown: RESEARCH_SPIKE,
    },
];

/**
 * The external LLM prompt template. The `[USER GOAL]` placeholder is
 * substituted with the user's goal before copying to clipboard.
 */
export const AI_PROMPT_TEMPLATE = `You are generating a structured workflow for a spatial task planning tool.
Output using this format:
- Use headings (#, ##) for hierarchy
- Use "- Task:" for each node
- Use indentation for subtasks
- Use "(parallel)" after a ## heading to mark tasks that can run in parallel
- Use "depends_on: <Task Label>" indented under a task to declare a dependency

Generate a plan for:
[USER GOAL]

Ensure:
- Clear hierarchy
- Logical dependencies
- Parallel steps where appropriate
- Only respond with the markdown plan — no commentary before or after`;
