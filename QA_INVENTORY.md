# Spatial Tasks — QA Codebase Inventory

> Internal working document used to drive the QA testing guide.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React + TypeScript | 18.2 / 5.2 |
| Canvas | ReactFlow | 11.11.4 |
| State | Zustand + Zundo (undo/redo) | 5.0.10 / 2.3.0 |
| Backend/Auth | Supabase | 2.99.1 |
| Styling | Tailwind CSS | 3.4.3 |
| Build | Vite | 5.2.0 |
| AI | Gemini 2.5 Flash API | External |
| Icons | Lucide React | 0.562.0 |
| Testing | Playwright (installed, no tests) | 1.52.0 |
| Deploy | Vercel | SPA rewrite |

## Major Pages / Routes

No URL router — single-page app with in-memory navigation stack.

| View | Trigger | Component |
|------|---------|-----------|
| Auth (Login/Signup) | No session | `AuthScreen.tsx`, `AuthGate.tsx` |
| Password Reset | Recovery token | `ResetPasswordScreen.tsx` |
| Graph View (Canvas) | Default, viewMode='graph' | `CanvasArea.tsx` |
| List View | viewMode='list'; subtask interaction via graphId-aware store methods | `ListView.tsx` + `workspaceStore.ts` |
| Focus View | viewMode='focus'; one task at a time with image, notes, status; auto-advances on done | `FocusView.tsx` + `ParallelChooser.tsx` |
| Execution Mode | executionMode toggle | `CanvasArea.tsx` + `StepDetailPanel.tsx` |

## Components (24 total)

### Canvas & Nodes
| Component | File | Purpose |
|-----------|------|---------|
| CanvasArea | `src/components/Canvas/CanvasArea.tsx` | ReactFlow canvas, pan/zoom, shortcuts, touch gestures, edge create/rewire flow |
| BlockedSpotlight | `src/components/Canvas/BlockedSpotlight.tsx` | Predecessor-trace overlay: pulse rings on blockers + chip bar / bottom sheet |
| LayoutMenu | `src/components/Canvas/LayoutMenu.tsx` | Toolbar popover for Auto-Organize: picks Tidy or Grid + Top-down/Left-right orientation toggle, optional selection-only scope, remembers last used strategy + orientation |
| ActionNode | `src/components/Nodes/ActionNode.tsx` | Task node: status cycle, inline edit, resize, notes, images, interactive blocked badge |
| ContainerNode | `src/components/Nodes/ContainerNode.tsx` | Folder node: progress ring, magic expand, enter subgraph, images, interactive blocked badge |
| NotesEditor | `src/components/Nodes/NotesEditor.tsx` | Notes popover/modal for nodes |
| ImagesEditor | `src/components/Nodes/ImagesEditor.tsx` | Visual References panel: inline thumbnail grid, upload, remove, with persisted open/closed state |
| ImageLightbox | `src/components/Nodes/ImageLightbox.tsx` | Fullscreen image viewer with keyboard/arrow navigation |

### Layout
| Component | File | Purpose |
|-----------|------|---------|
| TopBar | `src/components/Layout/TopBar.tsx` | Breadcrumbs, undo/redo, view toggle, execution toggle |
| Sidebar | `src/components/Layout/Sidebar.tsx` | Projects, **project folders (create/rename/delete, collapse/expand, drag-and-drop on desktop, mobile move-to action sheet)**, settings, API key, sign out |

### UI Widgets
| Component | File | Purpose |
|-----------|------|---------|
| Toast | `src/components/UI/Toast.tsx` | Notifications (error/success/info) |
| ContextMenu | `src/components/UI/ContextMenu.tsx` | Desktop right-click menus |
| ActionSheet | `src/components/UI/ActionSheet.tsx` | Mobile bottom-sheet menus |
| ConfirmModal | `src/components/UI/ConfirmModal.tsx` | Destructive action confirmation |
| FolderDeleteModal | `src/components/UI/FolderDeleteModal.tsx` | Three-button modal for deleting a non-empty project folder (Cancel / Keep projects / Delete projects too) |
| FloatingActionButton | `src/components/UI/FloatingActionButton.tsx` | Mobile FAB + bottom-sheet input |
| SaveIndicator | `src/components/UI/SaveIndicator.tsx` | Save status (Saving.../Saved) |
| ErrorBoundary | `src/components/UI/ErrorBoundary.tsx` | React error boundary |
| LoadingScreen | `src/components/UI/LoadingScreen.tsx` | Initial load spinner |

### Views
| Component | File | Purpose |
|-----------|------|---------|
| ListView | `src/components/ListView/ListView.tsx` | Hierarchical list view with topological sort |
| FocusView | `src/components/FocusView/FocusView.tsx` | Single-task view: hero image, scrollable notes, status pill that auto-advances on done; transparently drills into containers; entered from TopBar against the active project's root graph |
| ParallelChooser | `src/components/FocusView/ParallelChooser.tsx` | Condensed list shown by FocusView when a completed task unblocks multiple parallel successors |
| StepDetailPanel | `src/components/ExecutionPanel/StepDetailPanel.tsx` | Execution mode side panel with Tasks / Notes view switcher; markdown-rendered notes with inline editor and detected links; mobile uses dynamic viewport (dvh) + safe-area inset; marks container as done and advances to next task on "Complete Step & Move On" |

### AI / Generation
| Component | File | Purpose |
|-----------|------|---------|
| FlowGenerator | `src/components/FlowGenerator/FlowGenerator.tsx` | AI flow generation orchestrator |
| GenerateFlowModal | `src/components/FlowGenerator/GenerateFlowModal.tsx` | Generation form UI |
| DraftReviewPanel | `src/components/FlowGenerator/DraftReviewPanel.tsx` | Review generated drafts |
| MarkdownImporter | `src/components/FlowGenerator/MarkdownImporter.tsx` | Import markdown plans — 4 tabs (Upload / Paste / Templates / AI Prompt); understands `(parallel)` and `depends_on:` DSL; per-template quick-copy icon on Templates tab |
| Plan templates | `src/utils/planTemplates.ts` | 6 detailed agent-ready starter templates (Coding Agent Process, Project Plan, Learning Path, General Workflow, Bug Fix, Research Spike) + external LLM prompt template. Each template embeds a self-documenting FORMAT LEGEND HTML comment so it doubles as a spec for coding agents. |

### Auth
| Component | File | Purpose |
|-----------|------|---------|
| AuthScreen | `src/components/Auth/AuthScreen.tsx` | Login / signup form |
| AuthGate | `src/components/Auth/AuthGate.tsx` | Auth state wrapper |
| ResetPasswordScreen | `src/components/Auth/ResetPasswordScreen.tsx` | Password reset form |

## State Containers

| Store | File | Scope |
|-------|------|-------|
| workspaceStore | `src/store/workspaceStore.ts` | Projects, graphs, nodes, edges, navigation, settings, undo/redo |
| authStore | `src/store/authStore.ts` | Session, user, loading |
| toastStore | `src/components/UI/Toast.tsx` | Toast notifications |

## Data Entities

| Entity | Key Fields | Notes |
|--------|-----------|-------|
| Workspace | version, projects[], folders[], graphs{}, navStack[], settings | Root data object; `version: 2` since folders introduction |
| Project | id, title, rootGraphId, createdAt, updatedAt, folderId? | Top-level container; `folderId` undefined means project sits at the root of the sidebar |
| Folder | id, title, collapsed, order, createdAt, updatedAt | Sidebar-only grouping for projects; flat (one level); `collapsed` persisted; `order` controls sort |
| Graph | id, projectId, title, nodes[], edges[], viewport? | Canvas content |
| Node | id, graphId, type, title, x, y, status?, childGraphId?, meta? | action or container; `meta.images[]` holds image attachments, `meta.imagesOpen` persists the Visual References toggle |
| ImageAttachment | id, dataUrl, name?, mimeType?, addedAt | Base64-encoded image stored under `node.meta.images[]` (V1) |
| Edge | id, graphId, source, target | Directed connection |
| Viewport | x, y, zoom | Camera position per graph |

## Mutation Flows

| Operation | Store Method | Side Effects |
|-----------|-------------|-------------|
| Create project | `createProject(title, folderId?)` | Creates root graph, sets active; optional `folderId` nests the new project inside a folder |
| Rename project | `renameProject(id, title)` | Updates timestamp |
| Delete project | `deleteProject(id)` | Removes all graphs; blocks if last project |
| Create folder | `createFolder(title)` | Appends a new folder to the workspace; returns new id; expanded by default |
| Rename folder | `renameFolder(id, title)` | Trims title; empty string is a no-op |
| Toggle folder collapsed | `toggleFolderCollapsed(id)` | Flips `collapsed`; persisted across reloads |
| Move project to folder | `moveProjectToFolder(projectId, folderId \| null)` | Updates project's `folderId`; `null` moves to root (Ungrouped); no-op if already in target |
| Delete folder | `deleteFolder(id, { deleteProjects })` | Either moves inner projects to root (Keep) or cascades deletion of projects + descendant graphs (Delete Too); Delete Too is blocked if it would empty the workspace |
| Add node | `addNode(node)` | Adds to active graph; sets `autoEditNodeId` for keyboard/context-menu creation |
| Update node | `updateNode(id, data)` | Partial update |
| Convert action to container | `convertNodeToContainer(id)` | Switches an action node to container presentation in place, clears action status, preserves title/position/metadata/edges |
| Remove node | `removeNode(id)` | Removes edges + child graphs recursively |
| Batch remove | `removeNodes(ids[])` | Batch with cleanup |
| Cycle status | `cycleNodeStatus(id)` | todo → in_progress → done → todo |
| Batch positions | `batchUpdatePositions(updates[])` | Drag optimization; also used to commit Auto-Organize results as a single undo entry |
| Auto-organize canvas | dispatch `{type:'auto-organize', strategy, orientation?, nodeIds?}` → `computeLayout()` → `batchUpdatePositions()` | Two strategies: **Tidy** (dagre Sugiyama; falls back to component-packed grid when subset has no internal edges) and **Grid** (deterministic row-pack sorted by current y/x). TB/LR orientation toggle (Tidy only). Live `width`/`height` from RF passed via `sizeOverrides` so resized containers pack correctly. Anchored to selection bbox or viewport center — no surprise camera jumps; `fitView` only when result spans outside the visible flow rect. Animated via rfInstance.setNodes; nodeIds=[] = selection only; remembers last strategy/orientation in `settings.preferredLayoutStrategy` + `settings.preferredLayoutOrientation`. Legacy values (`cluster`/`hierarchy`/`flow`) migrated on rehydrate. |
| Add edge | `addEdge(edge)` | Connection between nodes |
| Update edge | `updateEdge(id, data, graphId?)` | Rewire an existing dependency without recreating it |
| Remove edge | `removeEdge(id)` | Single edge removal |
| Enter graph | `enterGraph(graphId, nodeId, label)` | Push navStack |
| Navigate back | `navigateBack(steps?)` | Pop navStack |
| JSON import | `jsonImport(json)` | Full workspace replace |
| Hydrate Supabase | `hydrateFromSupabase(data)` | Remote → local sync |

## Persistence Pipeline

1. **localStorage** — Zustand persist middleware, key `spatialtasks-workspace`, current version `2`. A `migrate(persistedState, fromVersion)` hook in the store injects `folders: []` and normalizes `project.folderId` for any v<2 blob.
2. **Supabase** — Debounced (2s) upsert to `workspaces` table on every mutation. Schema is a single JSONB column, so no server migration is needed; `hydrateFromSupabase` self-heals missing `folders` on load.
3. **Gemini keys** — Isolated in localStorage key `spatialtasks-gemini-config`, never sent to Supabase

### Hydration Order
1. Auth check → session exists?
2. Fetch remote workspace from Supabase
3. If remote exists → `hydrateFromSupabase()`
4. If no remote → merge localStorage to Supabase (first-time)
5. Subscribe to mutations → debounced save

## Keyboard Shortcuts

| Shortcut | Action | Guard |
|----------|--------|-------|
| N | Create action node at viewport center (auto-edit) | Skip when typing |
| G | Create container node at viewport center (auto-edit) | Skip when typing |
| Ctrl/Cmd+Z | Undo | Skip when typing |
| Ctrl/Cmd+Shift+Z | Redo | Skip when typing |
| Ctrl/Cmd+Shift+F | Fit view | Skip when typing |
| Ctrl/Cmd+A | Select all nodes | Skip when typing |
| Backspace/Delete | Delete selected (confirms if multi-select or container) | Skip when typing |
| Escape | Layered dismiss: editing → notes → menu → quick-add → connect mode → selection | Per-layer; stops after first match |
| Arrow keys | Navigate between connected/sibling nodes | Skip when typing; single selection |

## Node Editing Behavior

| Interaction | Result | Notes |
|-------------|--------|-------|
| Click unselected node title | Selects node only | Does NOT enter edit mode |
| Click already-selected node title | Enters edit mode | Mirrors OS file-rename pattern |
| Double-click node title | Enters edit mode | Always works regardless of selection |
| Enter edit mode | Text fully selected | User can immediately type replacement |
| Escape while editing | Exits edit, reverts title | Node stays selected (layered Escape) |
| Blocked node status click | No-op, cursor-not-allowed | Visual cursor feedback for disabled state |

## Touch / Mobile Interactions

| Gesture | Action | Details |
|---------|--------|---------|
| Long-press (500ms) | Action sheet | On nodes, edges, pane; vibration feedback |
| Swipe right from left edge | Navigate back | 50px start, 100px threshold |
| Tap node (connect mode) | Start/complete connection | Two-tap flow |
| Tap node (edge edit mode) | Reconnect selected dependency endpoint | Uses highlighted anchor node + TopBar instruction banner |
| Pinch | Zoom | ReactFlow native |
| Pan drag | Pan canvas | ReactFlow native |
| Status tap | Cycle status | With vibration |

## Mobile-Sensitive UI Areas

- Sidebar: drawer mode (80vw, max 320px) with backdrop
- FloatingActionButton: fixed position with safe-area, keyboard offset
- TopBar: overflow menu hides view toggle + undo/redo on small screens
- ActionSheet: replaces ContextMenu on touch devices
- ReactFlow controls: 44px minimum touch targets
- Handles: enlarged to 44px pseudo-element on touch
- Safe-area insets: `--sat`, `--sar`, `--sab`, `--sal`
- StepDetailPanel (Execute Mode): bottom sheet with `100dvh` ceiling, safe-area gutter on footer, lifts above virtual keyboard via `useKeyboardOffset`

## Existing Test Coverage

**None.** Playwright is installed but no test files exist.

## Technical Risk Areas

| Risk | Location | Why |
|------|----------|-----|
| Stale UI after mutation | workspaceStore + all components | Zustand subscriptions may miss nested updates |
| localStorage ↔ Supabase race | useWorkspaceSync.ts | Hydration order matters; first-time merge could overwrite |
| Recursive graph deletion | removeNode/removeNodes | Child graphs removed recursively — risk of orphans |
| Undo/redo with complex ops | Zundo temporal middleware | 50-state limit; batch operations may not undo atomically |
| Coordinate math | CanvasArea.tsx screenToFlowPosition | Double-click → position conversion could drift with zoom |
| Connect mode conflicts | CanvasArea.tsx | Disables drag; mode may stick if error occurs |
| Debounced save data loss | workspaceSync.ts | 2s window where crash loses data |
| Large canvas performance | ReactFlow with many nodes | No virtualization beyond ReactFlow defaults |
| Touch gesture conflicts | Long-press vs pan vs scroll | 500ms timer may conflict with scroll intent |
| View mode consistency | graph ↔ list ↔ focus | Changes in one view must reflect in other |
| Focus auto-advance timing | `FocusView.tsx` | 450ms delay after status hits 'done'; rapid clicks must not double-cycle |
| Focus container drill | `logic.ts` `getActionableLeafTasks` | Walks actionable container's child graph; returns leaf tasks only |
| Focus parallel chooser fallback | `logic.ts` `getNextFocusTasks` | Falls back to global actionable list when direct successors are still blocked |
| Container deletion UX | ConfirmModal | Deleting container with children is destructive |
| AI generation errors | gemini.ts | Parse failures, quota limits, network errors |
| JSON import validation | jsonImport | Partial validation; malformed data could corrupt state |
| Viewport persistence | graph.viewport | May not save/restore correctly across navigations |
| Image base64 bloat in Supabase JSONB | `workspaceSync.ts`, `ImagesEditor.tsx` | Attachments are stored inline in the workspace blob; many/large images inflate sync payload and localStorage. V1 enforces 5 MB/image; move to Supabase Storage in V2. |

## Audit Fix Inventory (April 2026)

| Fix | Files Changed | Testable Area |
|-----|---------------|---------------|
| Container completion derived, not persisted | `logic.ts`, `StepDetailPanel.tsx`, `ActionNode.tsx`, `ContainerNode.tsx`, `ListView.tsx`, `CanvasArea.tsx` | Container progress, blocking logic, execution mode completion |
| SaveIndicator driven by sync pipeline | `SaveIndicator.tsx`, `workspaceStore.ts`, `workspaceSync.ts`, `useWorkspaceSync.ts` | Save indicator accuracy, sync error visibility |
| Typed canvas actions replace DOM events | `workspaceStore.ts`, `CanvasArea.tsx`, `TopBar.tsx`, `ActionNode.tsx`, `StepDetailPanel.tsx` | Delete-selected, fit-view, advance-next, auto-organize |
| Auto-Organize Canvas feature (dagre rewrite) | `src/layout/*`, `src/components/Canvas/LayoutMenu.tsx`, `CanvasArea.tsx`, `TopBar.tsx`, `workspaceStore.ts`, `types/index.ts`, `package.json` | Replaced custom 4-strategy engine (cluster/grid/hierarchy/flow + sweep-line overlap resolver + centroid preservation) with **Tidy** (powered by `@dagrejs/dagre`) and **Grid** (mental-map preserving row-pack). Removed `bboxUtils.ts`, `preserveMap.ts`, `clusterLayout.ts`, `hierarchyLayout.ts`, `flowLayout.ts`. New `sizeMap.ts` reads live measured dimensions from `reactFlowInstance.getNodes()` so resized containers pack correctly. New `anchor.ts` keeps results inside the selection's bbox (or previous canvas anchor) and only triggers `fitView` when the result spans outside the visible flow rect. Toolbar popover (desktop) + overflow-menu entries (touch) + pane context-menu submenu now expose two strategies + a TB/LR orientation toggle. Undo unchanged via `batchUpdatePositions` single commit. Persisted preferences include `preferredLayoutStrategy` (`tidy`/`grid`) and `preferredLayoutOrientation` (`top-down`/`left-right`); legacy values migrated on rehydrate and Supabase hydration. |
| Code splitting / lazy loading | `App.tsx`, `vite.config.ts` | Bundle size, lazy modal loading, chunk splitting |
| Focus View mode | `workspaceStore.ts`, `logic.ts`, `TopBar.tsx`, `App.tsx`, `FocusView.tsx`, `ParallelChooser.tsx` | Single-task focus mode with image/notes/status, auto-advance, parallel chooser, container drill-in, edit modal; top-bar entry should preserve the active project when entering focus mode |
| Project Folders (grouping) | `types/index.ts`, `workspaceStore.ts`, `utils/generator.ts`, `components/Layout/Sidebar.tsx`, `components/UI/FolderDeleteModal.tsx` | Flat (one-level) folders for grouping projects in the sidebar. Covers folder CRUD, collapse/expand persisted state, HTML5 drag-and-drop of projects onto folder headers on desktop, touch fallback (tap ⋯ → "Move to folder…" action sheet), three-button delete modal (Cancel / Keep projects / Delete projects too), v1→v2 migration, zundo tracking of `folders`, and self-healing of Supabase v1 blobs. |

## Related Documents

| Document | Purpose |
|----------|---------|
| `SPATIAL_TASKS_QA_GUIDE.md` | Step-by-step QA test cases and expected results |
| `EXPECTED_UI_BEHAVIORS.md` | Comprehensive specification of expected UI behaviors across all interactions (node editing, escape key, selection, navigation, etc.) |
