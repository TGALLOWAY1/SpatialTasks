# Codebase Audit + Refactor Plan

## 1) Repository Map

| Area | Purpose | Entry Points | Key Dependencies | Data Flow | Risk |
|---|---|---|---|---|---|
| `src/main.tsx`, `src/App.tsx` | App bootstrap, global auth/workspace wiring, top-level mode switching | `main.tsx` React root, `App` | React, Zustand stores, Supabase auth/sync hooks | Auth gate -> workspace load/sync -> mode-specific UI (canvas/list/focus) | High (global orchestration) |
| `src/store/workspaceStore.ts` | Core product state: graphs, nodes, edges, folders/projects, mutations, undo/redo | `useWorkspaceStore` selectors/actions | Zustand, zundo, UUID, type models | UI dispatches store actions -> normalized graph updates -> components re-render | High (correctness/integrity) |
| `src/store/authStore.ts`, `src/lib/supabase.ts`, `src/lib/workspaceSync.ts`, `src/hooks/useWorkspaceSync.ts` | Session + cloud persistence | `useAuthStore`, `useWorkspaceSync` | Supabase SDK | Auth state changes trigger workspace fetch/save and status flags | High (data persistence) |
| `src/components/Canvas/*`, `src/components/Nodes/*` | Spatial canvas interaction, node editing, dependency UI | `CanvasArea`, `ActionNode`, `ContainerNode` | ReactFlow, logic utilities, layout engine | Store state -> derived node UI -> user edits -> store updates | High (primary UX) |
| `src/components/ListView/*` | Linear dependency-oriented task view | `ListView` | Store actions, `utils/logic` | Graph -> topo/dependency derivation -> list rendering/actions | Medium |
| `src/components/FocusView/*` | “Next action” sequential execution flow | `FocusView` | `utils/logic` actionable task traversal | Graph + dependency state -> focus candidate list -> completion actions | Medium |
| `src/layout/*` | Auto-layout strategies/anchors | `layoutEngine`, menu trigger from top bar | dagre/grid strategies | Graph nodes/edges -> positions -> store updates | Medium |
| `src/components/FlowGenerator/*`, `src/services/gemini.ts`, `src/utils/markdown*` | AI + markdown import and draft generation | `FlowGenerator`, `MarkdownImporter` | Gemini service + parser/render helpers | Prompt/template -> parse/transform -> node/edge creation | Medium |
| `src/utils/*`, `src/types/*` | Shared domain logic/types/constants | imported throughout UI/store | TypeScript utilities | Cross-cutting pure logic used by render + actions | Medium |

## 2) Critical User Flows

1. **Open app + restore workspace**
   - UI entry: `main.tsx` -> `App`.
   - State/services: `authStore`, `useWorkspaceSync`, `workspaceSync`.
   - API: Supabase auth/session + workspace persistence.
   - Persistence: remote workspace + in-memory Zustand state.
   - Render/update: loading/auth gating -> workspace UI.
   - Error/loading: loading screen, toast/error boundary, save indicator.

2. **Create/edit nodes in canvas**
   - UI entry: `CanvasArea` (add, connect, edit, delete).
   - State/services: `workspaceStore` node/edge mutations.
   - API: eventually persisted by workspace sync.
   - Persistence: graph state in store, then synced.
   - Render/update: ReactFlow nodes/edges + side panels.
   - Error/loading: guarded actions and modal confirmations.

3. **Execute work in focus/list mode**
   - UI entry: `FocusView` and `ListView`.
   - State/services: dependency helpers in `utils/logic`, store status actions.
   - API: none directly; indirect sync.
   - Persistence: status changes saved through store sync.
   - Render/update: actionable/blocked recalculation per state change.
   - Error/loading: disabled/blocked controls; fallback states.

4. **Import/generate plan from markdown/AI**
   - UI entry: `MarkdownImporter`, `GenerateFlowModal`.
   - State/services: parser utilities + `services/gemini`.
   - API: Gemini call (generation path).
   - Persistence: generated nodes written to workspace store.
   - Render/update: review panel -> commit draft to graph.
   - Error/loading: modal-level loading + Gemini error handling.

## 3) Refactor Candidate Inventory

| Priority | Area | Problem | Evidence | Risk | Proposed Fix | Verification |
|---|---|---|---|---|---|---|
| P1 | `utils/logic.ts` | Repeated ad-hoc workspace wrapper + duplicated container-progress access pattern | Multiple sites cast `{ graphs } as Workspace` to call `getContainerProgress` | Low | Add graph-focused helper and reuse in dependency checks; keep external API stable | build + behavior smoke (focus/list blocked states) |
| P2 | `src/components/FocusView/index.ts` | Unused barrel file adds indirection/no callers | No imports reference this barrel; direct imports used instead | Low | Remove orphaned file | build |
| P2 | `workspaceStore.ts` | Large file with mixed concerns (project mgmt, graph edits, UI state) | Single large module with many unrelated responsibilities | Medium | Split later into slices (projects, graph mutations, UI flags) with characterization tests first | future |
| P2 | `CanvasArea.tsx` | Very large component mixes interaction modes/menu/modals | Large component with many local states/handlers | Medium | Extract interaction hooks (`useCanvasShortcuts`, `useCanvasMenus`) in later pass | future |
| P3 | Markdown/AI flow | Import/generation path spread across modal/panel/utils | multiple transform steps and temporary state | Medium | Add contract tests for parser-to-graph conversion before restructuring | future |

## 4) Dead/Unused Code Findings

- `src/components/FocusView/index.ts` appears unused (all current imports target concrete files). Safe removal: no runtime behavior impact, compile should fail if hidden consumer exists.
- Additional potential dead code candidates (not removed in this pass due uncertainty): older audit markdown files and duplicated planning docs at repo root; require owner confirmation because they may be intentional documentation artifacts.

## 5) Complexity Hotspots

- `src/store/workspaceStore.ts`: central and broad; mixes domain + UI + persistence flags. Split should be deferred until characterization tests exist for graph mutation semantics.
- `src/components/Canvas/CanvasArea.tsx`: multi-responsibility (shortcuts, menus, connect mode, blocked spotlight, node operations). Safe strategy: extract pure menu/shortcut hooks without changing props contract.
- `src/components/ListView/ListView.tsx`: dense rendering + mutation behaviors; safe strategy is extracting pure derivation helpers and row subcomponents incrementally.

## 6) Performance / Bottleneck Pass

- Dependency evaluation performs repeated container-progress lookups and temporary workspace object creation in `utils/logic.ts`; small but hot enough across list/focus/canvas blocked checks. Refactor done in this pass to reduce duplication and object churn.
- Potential future optimization: memoize expensive graph derivations in list/focus views with stable selectors; requires profiling and careful stale-data handling.

## 7) Test Coverage / Safety Gaps

- No automated unit/integration test scripts currently wired in `package.json`; safety relies on type/build checks and manual flows.
- High-value missing tests:
  - Dependency/blocking logic contracts (`utils/logic.ts`)
  - Graph mutation invariants in `workspaceStore`
  - Markdown import transformation contracts

## 8) Implementation Plan (Reviewable Chunks)

1. **Safety baseline checks**
   - Files: none
   - Impact: none
   - Verification: `npm run build`, `npm run lint` (document status)
   - Rollback risk: none
2. **Low-risk dead code removal**
   - Files: `src/components/FocusView/index.ts`
   - Impact: none expected (orphan barrel removal)
   - Verification: `npm run build`
   - Rollback risk: very low
3. **Duplicate logic consolidation in dependency utilities**
   - Files: `src/utils/logic.ts`
   - Impact: behavior preserved; internal helper refactor only
   - Verification: `npm run build` + manual reasoning on blocked/actionable logic parity
   - Rollback risk: low
4. **Documentation update**
   - Files: `docs/audits/refactor-summary.md`
   - Impact: none
   - Verification: n/a
   - Rollback risk: none
