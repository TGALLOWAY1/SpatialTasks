# Refactor Summary

## What Changed
- Created a full audit + prioritized refactor plan at `docs/audits/codebase-audit-refactor-plan.md`.
- Removed an unused FocusView barrel export file (`src/components/FocusView/index.ts`).
- Consolidated repeated container-progress access patterns in `src/utils/logic.ts` via an internal helper used by dependency checks.

## Why It Changed
- Reduce dead code and unnecessary indirection.
- Improve maintainability/readability in dependency evaluation paths used by canvas/list/focus flows.
- Keep refactor small, safe, and behavior-preserving.

## Files Modified
- `docs/audits/codebase-audit-refactor-plan.md`
- `docs/audits/refactor-summary.md`
- `src/utils/logic.ts`
- Deleted: `src/components/FocusView/index.ts`

## Behavior Preserved
- No public API, route, persistence shape, or UI contract was intentionally changed.
- `utils/logic.ts` changes are internal helper consolidation only.

## Bugs Fixed, If Any
- None explicitly targeted.

## Tests Added or Updated
- No new tests added (repo currently lacks test scripts).

## Verification Results
- `npm run build` passed before and after changes.
- `npm run lint` fails due missing ESLint flat config (`eslint.config.*`), appears pre-existing toolchain/config issue.

## Remaining Recommendations
- Add characterization tests for dependency/blocking logic and workspace graph mutations before larger modularization.
- Split oversized modules (`workspaceStore.ts`, `CanvasArea.tsx`) in follow-up, test-protected passes.

## Follow-Up Refactor Backlog
1. ~~Add unit tests for `utils/logic.ts` contracts.~~ ✅ done in PR after #60.
2. Extract workspace store slices (projects, graph ops, UI mode state).
3. Decompose `CanvasArea` interaction concerns into hooks.
4. Add parser/import contract tests.

---

## Addendum — Foundation + Low-Risk Wins (PR after #60)

This PR picks up the backlog above by building the safety net the original audit called for and clearing the highest-leverage items that were safe to land without further preparation.

### What Changed
- **Tooling foundation**
  - Added an ESLint flat config (`eslint.config.js`) plus the missing devDeps (`eslint`, `@eslint/js`, `@typescript-eslint/*`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`). `npm run lint` now actually runs and exits clean.
  - Added Vitest (`vitest.config.ts` reusing the `@/*` alias) plus `test` / `test:watch` scripts.
- **Type/API hardening in `src/utils/logic.ts`**
  - Changed `getContainerProgress(containerNode, workspace)` to `getContainerProgress(containerNode, graphs: Record<string, Graph>)`, matching the second-argument shape used by the rest of the module (`isNodeBlocked`, `getBlockingNodes`, `isNodeActionable`, `getActionableLeafTasks`, `getNextFocusTasks`).
  - Removed the internal `getContainerProgressFromGraphs` helper that only existed to localize a `{ graphs } as Workspace` cast.
  - Updated all five external call sites — `src/components/Nodes/ContainerNode.tsx:71`, `src/components/ListView/ListView.tsx:227,448,545` — to pass `graphs` directly. No more `as any` workspace wrappers in this code path.
- **Pure-logic extraction**
  - Lifted `topoSortWithDepth` out of `src/components/ListView/ListView.tsx` (lines 41–96 of the pre-PR file) into a new `src/utils/graphTraversal.ts`. ListView now imports it.
- **Tests**
  - `src/utils/__tests__/logic.test.ts` — 27 cases locking the contracts of `getContainerProgress`, `getBlockingNodes`, `isNodeBlocked`, `isNodeActionable`, `getActionableLeafTasks`, `getNextFocusTasks` (including container-rollup shallowness, partial-container blocker reporting, and the global-fallback path in `getNextFocusTasks`).
  - `src/utils/__tests__/graphTraversal.test.ts` — 9 cases covering linear chains, parallel siblings, diamonds, mixed-length paths, disconnected nodes, full cycles, dangling edges, and empty graphs.

### Verification Results
- `npm run build` — clean (`tsc` + Vite production build).
- `npm run lint` — clean (was previously a hard failure: no config and `eslint` not even installed).
- `npm test` — 36/36 passing across both new test files.

### Behavior Preserved
- Public action APIs of `useWorkspaceStore` are untouched.
- `topoSortWithDepth` was moved verbatim — the tests double as a regression baseline before any future ListView decomposition.
- No persistence shape, route, or render output was intentionally changed.

### Notes for Reviewers
- ESLint config disables `@typescript-eslint/no-explicit-any` and `react-refresh/only-export-components` because both flag pre-existing patterns the audit explicitly tracks for follow-up. The intent is to make lint runnable, not to demand a codebase-wide cleanup PR.
- A single `// eslint-disable-next-line react-hooks/exhaustive-deps` was added at `src/components/Canvas/CanvasArea.tsx:597` for the well-known false positive when omitting a stable Zustand action setter from a dep array. This is the only behavioral edit to a deferred file.

### Updated Backlog
1. Tighten `NodeMeta` (`src/types/index.ts:22`) — currently `[key: string]: any`.
2. Slice `workspaceStore.ts` (829 lines) — UI / project+folder / graph / sync slices behind the same `useWorkspaceStore` API. Cascade-delete invariants need tests first.
3. Decompose `CanvasArea.tsx` (1176 lines) into `useCanvasKeyboard`, `useCanvasContextMenu`, `useCanvasConnectMode`, `useCanvasLongPress`, `useCanvasCommands`.
4. Markdown / AI import contract tests; consider extracting `MarkdownImporter` modal state into a reducer.
5. Re-enable `@typescript-eslint/no-explicit-any` once the `as any` sites in the store and ReactFlow interop layer are removed.
