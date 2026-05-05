# Spatial Tasks — Ship-Next Implementation Plan

> Companion to [FEATURE_OPPORTUNITIES.md](FEATURE_OPPORTUNITIES.md). Scope: the **Ship-next** tier only — Feature 1.1 plus Quick Wins #2, #3, #4, #6, #8. Quick Win #1 (blocked-by chip bar) is subsumed by Feature 1.1. Each item below is a self-contained, ticket-sized work unit.
>
> Authored against `origin/main` after merge of the focus-view + image-attachments PRs. Re-verify file paths/line numbers before starting any item — the codebase moves faster than this doc.

## Conventions

- **Definition of done** for every item: ESLint passes (`npm run lint` is `--max-warnings 0`), `npm run build` succeeds, and both [SPATIAL_TASKS_QA_GUIDE.md](SPATIAL_TASKS_QA_GUIDE.md) + [QA_INVENTORY.md](QA_INVENTORY.md) are updated per CLAUDE.md. Updates to [EXPECTED_UI_BEHAVIORS.md](EXPECTED_UI_BEHAVIORS.md) are required where listed.
- **Touch parity**: every interactive surface must satisfy the existing `touch:min-h-[44px]` pattern used in [TopBar.tsx](src/components/Layout/TopBar.tsx).
- **Undo/redo**: any new store mutation that changes graph data must flow through the existing zundo-tracked actions, not bypass them.
- **No ad-hoc shape additions**: prefer adding under `Node.meta` (already typed `[key: string]: any` in [src/types/index.ts:22](src/types/index.ts:22)) or `WorkspaceSettings` rather than top-level fields.
- **Sequencing**: items are listed in recommended build order. Dependencies are called out per-item.

---

## Item 1 — Feature 1.1: Predecessor Trace ("Why is this blocked?")

**Source:** FEATURE_OPPORTUNITIES.md §1.1 (and Quick Win #1, which this supersedes).

### Outcome
A user who taps the lock badge on a blocked node sees exactly which predecessors are blocking it, can jump to any of them in one click/tap, and gets a visual spotlight that highlights the blockers in context.

### Code touchpoints
- **[src/utils/logic.ts](src/utils/logic.ts)** — refactor.
- **[src/components/Nodes/ActionNode.tsx](src/components/Nodes/ActionNode.tsx)** + ContainerNode — lock badge becomes interactive.
- **[src/components/Canvas/CanvasArea.tsx](src/components/Canvas/CanvasArea.tsx)** — spotlight overlay + auto-fit.
- **[src/components/FocusView/FocusView.tsx](src/components/FocusView/FocusView.tsx)** — "Blocked by" section above hero card (Focus View can surface blocked tasks too if user navigates from list/graph).
- New: `src/components/Canvas/BlockedSpotlight.tsx` (presentational overlay).

### Step-by-step

1. **Refactor `isNodeBlocked` → `getBlockingNodes`** in [src/utils/logic.ts](src/utils/logic.ts).
   - New signature: `getBlockingNodes(node, graph, graphs?): { nodeId: string; reason: 'incomplete' | 'partial-container' }[]`. The function already walks `graph.edges.filter(e => e.target === node.id)` (line 26); replace the early `return true` with a push to a results array.
   - Keep `isNodeBlocked` as a one-line wrapper: `getBlockingNodes(...).length > 0`. This preserves all existing call sites including `isNodeActionable` and the focus-view actionable walker.
   - Unit-style smoke test: add a `__tests__` adjacent file or temporary script — the repo has no test runner today (per CLAUDE.md), so verify manually in dev once UI lands.

2. **Surface blocker IDs to the node** by computing them where the node is rendered. The cheapest place is in `ActionNode`/`ContainerNode` via a selector hook reading the current graph and graphs map, so the result is memoized per-render. Avoid storing blocker IDs in the persisted store — they're derived state.

3. **Make the lock badge interactive.**
   - Today the lock is decorative. Add `onClick`/`onKeyDown` (Enter/Space) that calls a new `dispatchCanvasAction({ type: 'spotlight-blockers', nodeId, blockerIds })`.
   - Visual: keep the existing icon, add `cursor-pointer`, add `aria-label="Show blockers"`, and ensure 44×44 hit area on touch.

4. **Spotlight overlay** in `CanvasArea`.
   - Add a `spotlight: { sourceNodeId, blockerIds } | null` to the local component state (not the store — it's transient UI state, like hover).
   - Render a full-canvas `<div>` at `pointer-events: none` with `bg-black/60` between the canvas and the nodes layer. This dim is visual only — don't lower opacity on the nodes themselves (interferes with selection).
   - For each blocker node ID, compute its bounding rect from ReactFlow's `getNode` API and overlay a 2px red ring + a 1.5s pulse animation (Tailwind `animate-pulse` or a small custom keyframe).
   - Auto-pan: call `reactFlowInstance.fitView({ nodes: [{ id: sourceNodeId }, ...blockerIds.map(id => ({ id }))], padding: 0.2, duration: 400 })`. Confirm the API name in the installed `@xyflow/react` version before relying on it.
   - Dismiss on: Esc, click outside, or 4s timeout.

5. **Chip bar** under the source node.
   - Render a small chip row (max width = node width + 80px) with `Blocked by: <Title> · <Title>`.
   - Each chip is a button. On click: clear the spotlight, then call `dispatchCanvasAction({ type: 'select-and-frame', nodeId: blockerId })` (this action also feeds Item 6 / Selection-sync).
   - On mobile (`useDeviceDetect` reports touch + small): render as a bottom sheet instead of an inline chip bar — there isn't enough horizontal space for chips on small viewports.

6. **Focus View parity.**
   - In [FocusView.tsx](src/components/FocusView/FocusView.tsx), the hero card already routes successors via the parallel chooser. Add a sibling `BlockedByCard` that renders only when the *user-selected* task happens to be blocked (Focus View itself filters to actionable tasks, so this only appears if the user navigates here from a list selection). Each row in the card is tap-to-jump back to graph view with that node selected.

7. **Update specs.**
   - [EXPECTED_UI_BEHAVIORS.md](EXPECTED_UI_BEHAVIORS.md): add a "Blocked node interaction" section.
   - QA docs: add scenarios for (a) chain-of-3 blockers, (b) blocker is a partially-complete container, (c) Esc dismisses spotlight, (d) chip click jumps to blocker, (e) focus-view fallback.

### Risks / decisions
- **Container blockers** are subtle — a container blocks downstream when its leaf-progress < 1. The chip should label these as "Container 'X' (3/5 done)" so the user knows it's not a simple boolean.
- **Mobile chip overflow**: enforce the bottom sheet for `screenSize === 'small'`.
- **Animation budget**: cap the pulse at 1.5s × 2 cycles — perpetual pulses are nausea-inducing on dense graphs.

### Estimate
1 engineering day for refactor + canvas overlay; +0.5 day for Focus View parity and QA updates.

---

## Item 2 — Quick Win #4: Node Color / Accent

> Built before Items 3+ because it touches `Node.meta` and creates a precedent the empty-state and shortcuts items will reference.

**Source:** FEATURE_OPPORTUNITIES.md Quick Wins §4.

### Outcome
Each node can be tinted with one of ~6 preset accent colors. The accent shows as a left edge bar on the node card and as a subtle dot in list view. Used purely for at-a-glance categorization — no semantic meaning, no filtering yet.

### Code touchpoints
- **[src/types/index.ts](src/types/index.ts)** — add `color?: AccentColor` to `NodeMeta`.
- **[src/components/Nodes/ActionNode.tsx](src/components/Nodes/ActionNode.tsx)** and **ContainerNode.tsx** — render accent.
- **[src/components/Nodes/](src/components/Nodes/)** — small `ColorPickerPopover.tsx`.
- **[src/store/workspaceStore.ts](src/store/workspaceStore.ts)** — `setNodeColor(nodeId, color)` action (zundo-tracked).
- **[src/components/ListView](src/components/ListView/)** (or wherever list rows render) — accent dot.

### Step-by-step

1. **Define the palette as a closed set.** Add to types:
   ```ts
   export type AccentColor = 'gray' | 'red' | 'amber' | 'green' | 'blue' | 'purple' | 'pink';
   export interface NodeMeta {
     // existing fields…
     color?: AccentColor;
   }
   ```
   Closed enum (vs. arbitrary hex) preserves dark/light theme compatibility (Item 3).

2. **Map to Tailwind classes** centrally. Create `src/utils/accent.ts`:
   ```ts
   export const ACCENT_BAR: Record<AccentColor, string> = {
     gray: 'bg-gray-500', red: 'bg-red-500', /* … */
   };
   export const ACCENT_DOT: Record<AccentColor, string> = { /* same shape */ };
   ```
   This keeps Tailwind's JIT happy (no dynamic class strings).

3. **Render the accent.**
   - Action/Container node: 3px left-edge bar inside the existing card border. Default (no color set) = no bar so existing nodes look identical.
   - List view: 8×8px circle next to the title.

4. **Add the picker.** Triggered from the node's existing context menu (right-click on desktop, long-press on touch). Use the menu pattern already in [CanvasArea.tsx](src/components/Canvas/CanvasArea.tsx). The picker is a 7-swatch row including "no color" (clears `meta.color`).

5. **Store action.** Add `setNodeColor(nodeId, color: AccentColor | null)` to the workspace store. Must be a single discrete action (zundo records one undo step per change).

6. **Update specs.** EXPECTED_UI_BEHAVIORS.md: "Accent colors" section. QA docs: scenarios for set/clear, persistence across reload, undo/redo.

### Risks / decisions
- **Don't add filtering by color in this item.** Tempting, but pulls in scope. Track separately if requested.
- **Theme compatibility**: validate every accent on both dark (current) and light (Item 3) backgrounds — the `bg-amber-500` etc. work for both, but pre-pick the exact shade per theme if any look washed out.

### Estimate
0.5 day.

---

## Item 3 — Quick Win #2: Theme Toggle (Dark / Light)

**Source:** FEATURE_OPPORTUNITIES.md Quick Wins §2.

### Outcome
A switch in the sidebar settings toggles between dark and light themes. Persists via the existing `WorkspaceSettings.theme` field ([src/types/index.ts:100](src/types/index.ts:100)).

### Code touchpoints
- **[src/components/Sidebar/](src/components/Sidebar/)** — settings section gains a switch.
- **[src/store/workspaceStore.ts](src/store/workspaceStore.ts)** — `setTheme(theme)` action; settings already persist via the Zustand `persist` middleware.
- **All components with hardcoded `gray-900`, `gray-800`, etc.** — migrate to a design-token approach.
- **[tailwind.config.js](tailwind.config.js)** — define the token palette.
- **[src/index.css](src/index.css)** (or equivalent global) — CSS variables on `:root` and `[data-theme="light"]`.

### Step-by-step

1. **Audit hardcoded colors.** This is the biggest hidden cost — every `bg-gray-900`, `text-gray-400`, `border-gray-800` in the codebase needs to become a token. Run `grep -rn "gray-9\|gray-8\|gray-7" src/components` and produce a count first; if >150 hits, consider phasing (see "Risks").

2. **Define semantic tokens** as CSS variables, not arbitrary hex. Suggested set: `--bg-canvas`, `--bg-panel`, `--bg-elevated`, `--text-primary`, `--text-secondary`, `--text-muted`, `--border-default`, `--border-strong`, `--accent-primary`. Map each to gray-shades for dark and to a light palette for light.

3. **Wire Tailwind.** Add to `tailwind.config.js`:
   ```js
   theme: { extend: { colors: {
     'bg-canvas': 'var(--bg-canvas)',
     /* … */
   } } }
   ```
   Then `bg-gray-900` becomes `bg-bg-canvas` (or whatever naming you prefer; pick once).

4. **Codemod the components.** Search-and-replace per token. Most components will reduce to <10 lines of churn each.

5. **Mount the theme.** In the root `App.tsx`, `useEffect` reads `settings.theme` from the store and sets `document.documentElement.dataset.theme`. Default to `'dark'` if undefined to preserve current behavior for existing users.

6. **Sidebar toggle.** Two-state switch (Sun / Moon icons from `lucide-react` — already a dep). 44×44 touch hit area.

7. **ReactFlow background**: the dotted background pattern color is configured in `<Background />` props in [CanvasArea.tsx](src/components/Canvas/CanvasArea.tsx). Drive `color` and `gap` from the same CSS vars.

8. **Update specs.** EXPECTED_UI_BEHAVIORS.md: "Theming" section. QA docs: theme persists across reload, all primary surfaces (canvas, sidebar, top bar, modals, focus view) respect both themes.

### Risks / decisions
- **Scope creep risk is real.** If the audit returns >150 hits, ship behind a feature flag (a `'theme-beta'` setting) until the migration is complete. Alternatively, ship dark-only token migration first as a no-op refactor PR, then add the light theme + toggle as a follow-up. Recommended: split into two PRs.
- **Image attachments + accent colors**: validate both render correctly in light mode (Item 2 dependency).

### Estimate
1 day for token migration + 0.5 day for the actual light palette and toggle.

---

## Item 4 — Quick Win #3: Keyboard Shortcuts Cheatsheet

**Source:** FEATURE_OPPORTUNITIES.md Quick Wins §3.

### Outcome
Pressing `?` (Shift+/) anywhere outside an input opens a modal listing every keyboard shortcut, grouped by category.

### Code touchpoints
- **New:** `src/components/UI/ShortcutsModal.tsx`.
- **[src/components/Canvas/CanvasArea.tsx](src/components/Canvas/CanvasArea.tsx)** — register the `?` global keydown.
- **[src/components/Layout/TopBar.tsx](src/components/Layout/TopBar.tsx)** — a small `?` button in the overflow menu / bottom of sidebar so the discoverability isn't keyboard-only.

### Step-by-step

1. **Inventory the shortcuts.** Read [CanvasArea.tsx](src/components/Canvas/CanvasArea.tsx) and grep for `onKeyDown`/`addEventListener('keydown'`. Build the canonical list. Likely includes: Cmd/Ctrl+Z (undo), Cmd/Ctrl+Shift+Z (redo), Backspace/Delete (delete selected), Esc (cancel mode), Space/Enter (focus-view status cycle), arrows (focus-view nav), Cmd/Ctrl+A (select all if implemented), `S` (toggle select mode? confirm).

2. **Source-of-truth list.** Define in `src/utils/shortcuts.ts`:
   ```ts
   export interface Shortcut { keys: string[]; description: string; category: 'Canvas' | 'Selection' | 'Focus View' | 'AI' }
   export const SHORTCUTS: Shortcut[] = [ /* … */ ];
   ```
   Modal renders from this; future code should add entries here as new shortcuts ship.

3. **Modal UI.** Centered, max-w-2xl, grouped sections, two-column key layout. Trap focus, Esc to close, click-outside to close. Reuse modal pattern from existing magic-expand confirm modal.

4. **Global keydown.** In `CanvasArea`, add a top-level effect listening for `?` (only when no `input`/`textarea` is focused — check `document.activeElement.tagName`). Skip in `connectMode` and during draft review where modals are already open.

5. **Discoverability hook.** In TopBar overflow menu (mobile) and at the bottom of the sidebar (desktop), a "Keyboard shortcuts" link opens the modal. Touch users won't discover `?` themselves.

6. **Update specs.** EXPECTED_UI_BEHAVIORS.md: "Keyboard shortcuts" section listing the canonical shortcuts. QA docs: scenarios for opening, closing, focus trap, "doesn't open while typing in a textarea."

### Risks / decisions
- **Shortcut list drift** is the failure mode. Lint won't catch new shortcuts that aren't added to the list. Add a CONTRIBUTING note (or a comment at the top of `src/utils/shortcuts.ts`) requiring updates when new shortcuts are added.

### Estimate
0.5 day.

---

## Item 5 — Quick Win #6: Empty-State Onboarding

**Source:** FEATURE_OPPORTUNITIES.md Quick Wins §6.

### Outcome
A brand-new user landing on an empty canvas sees ghost nodes with example text and a hint arrow pointing at the FAB / canvas double-click area.

### Code touchpoints
- **[src/components/Canvas/CanvasArea.tsx](src/components/Canvas/CanvasArea.tsx)** — render an overlay when `graph.nodes.length === 0`.
- **New:** `src/components/Canvas/EmptyCanvasOverlay.tsx`.
- **[src/store/workspaceStore.ts](src/store/workspaceStore.ts)** — `settings.hasSeenOnboarding?: boolean` so we don't re-show after the user dismisses or adds a node.

### Step-by-step

1. **Detect the condition.** Show the overlay when:
   - The active graph is empty AND
   - `settings.hasSeenOnboarding !== true` AND
   - The active graph is the *root* graph of the project (don't show in empty containers — that's a different UX).

2. **Render ghost nodes.** Three or four pre-positioned semi-transparent (`opacity-40`) node-shaped divs with placeholder text like "Double-click here to add your first task" and a fake arrow connecting them. Pure CSS — no ReactFlow nodes, no store mutation. Render in the same coordinate space as the canvas so they align with the FAB.

3. **Hint affordance.**
   - Touch: arrow + label pointing at the FAB, animated bounce (`animate-bounce` once or twice then static).
   - Desktop: text "Double-click anywhere to start. Press ? for shortcuts." (cross-promotes Item 4.)

4. **Dismissal.**
   - Adding any node sets `settings.hasSeenOnboarding = true` and removes the overlay.
   - "Skip" link in the corner sets the same flag.

5. **Don't break empty deeper graphs.** Containers with empty child graphs need their own (much subtler) hint, but that's out of scope here. For now, just don't show the onboarding overlay in non-root graphs.

6. **Update specs.** EXPECTED_UI_BEHAVIORS.md: "Empty-state onboarding" section. QA docs: scenarios for first-load, dismissal persists across reload, doesn't appear after adding then deleting all nodes (the flag has been set).

### Risks / decisions
- **Don't gate features on this.** It's a hint, not a tutorial. No forced steps, no "next" button.
- **Coordinate placement.** ReactFlow's coordinate space ≠ DOM space at non-1.0 zoom. Render the overlay outside ReactFlow (sibling of the canvas div) so zoom doesn't deform it.

### Estimate
0.5 day.

---

## Item 6 — Quick Win #8: Selection Sync Across Views

**Source:** FEATURE_OPPORTUNITIES.md Quick Wins §8.

### Outcome
Selecting a node in graph view and switching to list or focus view pre-selects (or scrolls to) that node. Same in reverse: selecting a row in list view and switching to graph centers on that node.

### Code touchpoints
- **[src/store/workspaceStore.ts](src/store/workspaceStore.ts)** — promote selection from view-local state to a workspace-level `selectedNodeIds: string[]` (or single `focusedNodeId: string | null` if simpler).
- **[src/components/Canvas/CanvasArea.tsx](src/components/Canvas/CanvasArea.tsx)** — push ReactFlow's selection into the store; on mount, frame the stored selection.
- **[src/components/ListView](src/components/ListView/)** — read `focusedNodeId` to highlight + scrollIntoView; write back on row click.
- **[src/components/FocusView/FocusView.tsx](src/components/FocusView/FocusView.tsx)** — if the focused node is actionable, jump straight to it.

### Step-by-step

1. **Decide single vs. multi.** The doc says "selecting *a* node" (singular). Recommend `focusedNodeId: string | null` for now and keep multi-select view-local. If multi-select-sync is needed later, generalize then.

2. **Add to store.** New action: `setFocusedNode(nodeId: string | null)`. NOT zundo-tracked (selection is UI state, not graph data).

3. **Wire graph view.**
   - On ReactFlow's `onSelectionChange`, write to the store *only* if exactly one node is selected. Multi-select doesn't update the focused node (preserves current behavior).
   - On view-mode change *into* graph view, if `focusedNodeId` is set and the node exists in the active graph, call `reactFlowInstance.setNodes(nodes => nodes.map(n => ({ ...n, selected: n.id === focusedNodeId })))` and `fitView({ nodes: [{ id: focusedNodeId }], padding: 0.4, duration: 300 })`.

4. **Wire list view.**
   - Highlight the row whose ID matches `focusedNodeId` (e.g., a left border + bg tint).
   - On view-mode change into list, `scrollIntoView({ block: 'center', behavior: 'smooth' })` the matching row.
   - On row click, `setFocusedNode(node.id)`.

5. **Wire focus view.**
   - If `focusedNodeId` matches an actionable task in the current project, the focus-view session opens with that task as the hero.
   - If it's a non-actionable task (blocked or done), fall back to current behavior + show a small "Note: 'X' is blocked, see graph view" hint.
   - On task completion in focus view, update `focusedNodeId` to the next task so re-entering graph view centers on it.

6. **Cross-graph selections.** If `focusedNodeId` lives in a different graph than the active one (user navigated away), do nothing — don't auto-navigate. Selection is best-effort.

7. **Persistence.** Don't persist `focusedNodeId` across reloads — it's transient.

8. **Update specs.** EXPECTED_UI_BEHAVIORS.md: "Selection sync" section. QA docs: graph→list, list→graph, graph→focus, focus→graph, cross-graph no-op.

### Risks / decisions
- **Re-selecting can fight the user.** If user is on graph view, selects nothing, switches to list, and we *re-select* something stale, that's surprising. Solution: clear `focusedNodeId` when the user explicitly clicks empty canvas/list area (treat as "deselect").
- **Performance**: `setNodes` on selection update is fine for ≤ ~500 nodes; if perf regresses, switch to ReactFlow's `setCenter` + selection via separate API.

### Estimate
0.5 day.

---

## Build order summary

| # | Item | Est. | Depends on |
|---|------|------|------------|
| 1 | Predecessor Trace (1.1) | 1.5d | — |
| 2 | Node Color Accent (QW4) | 0.5d | — |
| 3 | Theme Toggle (QW2) | 1.5d | Item 2 (validate accents in light mode) |
| 4 | Shortcuts Cheatsheet (QW3) | 0.5d | — |
| 5 | Empty-State Onboarding (QW6) | 0.5d | Item 4 (cross-promote `?`) |
| 6 | Selection Sync (QW8) | 0.5d | — |

**Total: ~5 engineering days.** Items 1, 2, 4, 6 can ship in any order; Items 3 and 5 should ship after their listed dependencies.

## PR strategy

Per CLAUDE.md, every PR includes a description, motivation, and test plan. Recommend one PR per item (six PRs total), so each can be reverted independently. Theme toggle (Item 3) is the only candidate for splitting further — see its "Risks" section.

## Out of scope (explicitly)

- Anything in FEATURE_OPPORTUNITIES.md "Next quarter" tier (Regions, Smart Layout, Rich Notes, Bulk Ops). Plan these separately when prioritized.
- Quick Wins #5 (Export) and #7 (Stream AI) — not in the Ship-next slice per the prioritization summary. Both are independently easy to add later.
- Any feature in §5 ("What NOT to Build").

## Re-audit trigger

This plan was written against the codebase after the focus-view + image-attachments PRs. Re-verify:
- `isNodeBlocked` signature and call sites (Item 1) — refactors here will affect Focus View.
- Hardcoded color audit count (Item 3) — if the codebase has churned, the token migration could be larger or smaller.
- Existing keyboard shortcut list (Item 4) — must reflect the actual code, not this doc.
