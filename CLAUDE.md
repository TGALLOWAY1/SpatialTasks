# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies |
| `npm run dev` | Start Vite dev server (http://localhost:5173) |
| `npm run build` | TypeScript compile + Vite production build |
| `npm run lint` | ESLint with `--max-warnings 0` (strict, no warnings allowed) |
| `npm run preview` | Preview production build locally |

No test runner is configured yet. Playwright is installed as a dev dependency but has no config or test files.

## Architecture

SpatialTasks is a local-first, spatial canvas app for organizing tasks as connected nodes. Built with React 18 + TypeScript + Vite.

### Key Libraries
- **ReactFlow** (xyflow) — Node-based graph canvas with pan/zoom/drag
- **Zustand** — State management with `localStorage` persistence and undo/redo via `zundo`
- **Supabase** — Optional auth and realtime sync (BYOK via env vars)
- **Tailwind CSS** — Styling with a custom `touch` screen breakpoint for hover-less devices
- **Gemini API** — Optional AI features (magic expand, flow generation) via user-provided API key

### Path Alias
`@/*` maps to `src/*` (configured in both `tsconfig.json` and `vite.config.ts`).

### Source Layout

- **`src/store/workspaceStore.ts`** — Central Zustand store (~565 lines). Single source of truth for projects, graphs, nodes, edges, navigation, and settings. All mutations go through this store. Uses `zundo` temporal middleware for undo/redo and Zustand `persist` middleware for localStorage.
- **`src/store/authStore.ts`** — Minimal Supabase auth state (session, user, loading).
- **`src/components/Canvas/CanvasArea.tsx`** — Main ReactFlow canvas setup, node interaction handlers, context menu, edge creation.
- **`src/components/Nodes/`** — `ActionNode` (leaf task) and `ContainerNode` (nested subgraph) are the two node types.
- **`src/components/FlowGenerator/`** — AI flow generation, markdown import, and draft review panel.
- **`src/services/gemini.ts`** — Gemini API integration for AI features.
- **`src/utils/logic.ts`** — Core business logic: `isNodeBlocked()`, `getContainerProgress()`, `isNodeActionable()`.
- **`src/hooks/`** — `useWorkspaceSync` (Supabase sync), `useDeviceDetect` (mobile/touch), `useKeyboardOffset` (virtual keyboard).

### Data Model (Normalized)

Graphs are stored in a flat `Record<id, Graph>` (not nested) for efficient updates and undo/redo:

```
Workspace → projects[] + graphs{} (by ID)
Project → rootGraphId → Graph
Graph → nodes[] + edges[] + viewport
Node → type: 'action' | 'container', status, childGraphId? (containers link to nested Graph)
```

Container nodes reference a `childGraphId` creating a recursive graph-of-graphs structure. Navigation uses a `navStack` (breadcrumb) to track the drill-down path.

### Key Patterns
- **Descendant collection** — Deleting a container recursively collects and removes all child graphs.
- **Batch position updates** — Debounced during multi-node drag for performance.
- **Topological sort** — List view orders tasks by dependency depth.
- **Node memoization** — `React.memo` on node components to avoid re-renders during canvas pan/zoom.

## Deployment

Deployed on Vercel. `vercel.json` configures SPA routing (all routes → `/index.html`) and security headers. Environment variables for Supabase are set via `.env` (see `.env.example`).

## QA Documentation

When making changes to the codebase — bug fixes, enhancements, refactors, new features, or any behavioral changes — update the relevant QA testing documents accordingly:

- **`SPATIAL_TASKS_QA_GUIDE.md`** — Update or add test cases, steps, and expected results that reflect the changed behavior.
- **`QA_INVENTORY.md`** — Update the inventory to track new, modified, or removed testable features/areas.

This includes adding new test scenarios for new functionality, revising existing test steps when behavior changes, and removing outdated test cases for deleted features.

## PR Guidelines

- Always include a description/body when creating pull requests. Use the `--body` flag with `gh pr create` and include a summary of changes, motivation, and any relevant test plan.
