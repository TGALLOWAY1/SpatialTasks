/**
 * Starter templates for the Structured Plan Import feature.
 * Each template exercises the DSL so users can see `(parallel)` and
 * `depends_on:` in action, then edit before committing to the canvas.
 */

export interface PlanTemplate {
    id: string;
    label: string;
    description: string;
    markdown: string;
}

const PROJECT_PLAN = `# Project: Launch New App

## Phase 1: Research
- Task: Market Analysis
- Task: Competitor Review

## Phase 2: Design (parallel)
- Task: Wireframes
- Task: Design System

## Phase 3: Development
- Task: Frontend
- Task: Backend
  depends_on: Frontend

## Phase 4: Launch
- Task: Deploy
  depends_on: Frontend, Backend
- Task: Marketing Campaign
`;

const LEARNING_PATH = `# Learning Path: TypeScript

## Stage 1: Foundations
- Task: Read the TS Handbook intro
- Task: Set up a sandbox project

## Stage 2: Practice (parallel)
- Task: Build a small CLI tool
- Task: Convert a JS project to TS
- Task: Work through type challenges

## Stage 3: Apply
- Task: Ship a real feature in TS
  depends_on: Build a small CLI tool

### Verification
- Project compiles with strict mode on
- No \`any\` types in application code
`;

const GENERAL_WORKFLOW = `# Workflow: New Initiative

## Kickoff
- Task: Define goal
- Task: Identify stakeholders

## Execute (parallel)
- Task: Track A
- Task: Track B

## Review
- Task: Collect feedback
  depends_on: Track A, Track B
- Task: Decide next steps
  depends_on: Collect feedback
`;

export const PLAN_TEMPLATES: PlanTemplate[] = [
    {
        id: 'project-plan',
        label: 'Project Plan',
        description: 'Phased delivery with parallel design and cross-phase dependencies.',
        markdown: PROJECT_PLAN,
    },
    {
        id: 'learning-path',
        label: 'Learning Path',
        description: 'Sequential stages with a parallel practice block.',
        markdown: LEARNING_PATH,
    },
    {
        id: 'general-workflow',
        label: 'General Workflow',
        description: 'Minimal scaffold using each marker — a starting point for any plan.',
        markdown: GENERAL_WORKFLOW,
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
