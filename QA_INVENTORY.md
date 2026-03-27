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
| Execution Mode | executionMode toggle | `CanvasArea.tsx` + `StepDetailPanel.tsx` |

## Components (23 total)

### Canvas & Nodes
| Component | File | Purpose |
|-----------|------|---------|
| CanvasArea | `src/components/Canvas/CanvasArea.tsx` | ReactFlow canvas, pan/zoom, shortcuts, touch gestures |
| ActionNode | `src/components/Nodes/ActionNode.tsx` | Task node: status cycle, inline edit, resize, notes |
| ContainerNode | `src/components/Nodes/ContainerNode.tsx` | Folder node: progress ring, magic expand, enter subgraph |
| NotesEditor | `src/components/Nodes/NotesEditor.tsx` | Notes popover/modal for nodes |

### Layout
| Component | File | Purpose |
|-----------|------|---------|
| TopBar | `src/components/Layout/TopBar.tsx` | Breadcrumbs, undo/redo, view toggle, execution toggle |
| Sidebar | `src/components/Layout/Sidebar.tsx` | Projects, settings, API key, sign out |

### UI Widgets
| Component | File | Purpose |
|-----------|------|---------|
| Toast | `src/components/UI/Toast.tsx` | Notifications (error/success/info) |
| ContextMenu | `src/components/UI/ContextMenu.tsx` | Desktop right-click menus |
| ActionSheet | `src/components/UI/ActionSheet.tsx` | Mobile bottom-sheet menus |
| ConfirmModal | `src/components/UI/ConfirmModal.tsx` | Destructive action confirmation |
| FloatingActionButton | `src/components/UI/FloatingActionButton.tsx` | Mobile FAB + bottom-sheet input |
| SaveIndicator | `src/components/UI/SaveIndicator.tsx` | Save status (Saving.../Saved) |
| ErrorBoundary | `src/components/UI/ErrorBoundary.tsx` | React error boundary |
| LoadingScreen | `src/components/UI/LoadingScreen.tsx` | Initial load spinner |

### Views
| Component | File | Purpose |
|-----------|------|---------|
| ListView | `src/components/ListView/ListView.tsx` | Hierarchical list view with topological sort |
| StepDetailPanel | `src/components/ExecutionPanel/StepDetailPanel.tsx` | Execution mode side panel; marks container as done and advances to next task on "Complete Step & Move On" |

### AI / Generation
| Component | File | Purpose |
|-----------|------|---------|
| FlowGenerator | `src/components/FlowGenerator/FlowGenerator.tsx` | AI flow generation orchestrator |
| GenerateFlowModal | `src/components/FlowGenerator/GenerateFlowModal.tsx` | Generation form UI |
| DraftReviewPanel | `src/components/FlowGenerator/DraftReviewPanel.tsx` | Review generated drafts |
| MarkdownImporter | `src/components/FlowGenerator/MarkdownImporter.tsx` | Import markdown plans |

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
| Workspace | version, projects[], graphs{}, navStack[], settings | Root data object |
| Project | id, title, rootGraphId, createdAt, updatedAt | Top-level container |
| Graph | id, projectId, title, nodes[], edges[], viewport? | Canvas content |
| Node | id, graphId, type, title, x, y, status?, childGraphId?, meta? | action or container |
| Edge | id, graphId, source, target | Directed connection |
| Viewport | x, y, zoom | Camera position per graph |

## Mutation Flows

| Operation | Store Method | Side Effects |
|-----------|-------------|-------------|
| Create project | `createProject(title)` | Creates root graph, sets active |
| Rename project | `renameProject(id, title)` | Updates timestamp |
| Delete project | `deleteProject(id)` | Removes all graphs; blocks if last project |
| Add node | `addNode(node)` | Adds to active graph |
| Update node | `updateNode(id, data)` | Partial update |
| Remove node | `removeNode(id)` | Removes edges + child graphs recursively |
| Batch remove | `removeNodes(ids[])` | Batch with cleanup |
| Cycle status | `cycleNodeStatus(id)` | todo → in_progress → done → todo |
| Batch positions | `batchUpdatePositions(updates[])` | Drag optimization |
| Add edge | `addEdge(edge)` | Connection between nodes |
| Remove edge | `removeEdge(id)` | Single edge removal |
| Enter graph | `enterGraph(graphId, nodeId, label)` | Push navStack |
| Navigate back | `navigateBack(steps?)` | Pop navStack |
| JSON import | `jsonImport(json)` | Full workspace replace |
| Hydrate Supabase | `hydrateFromSupabase(data)` | Remote → local sync |

## Persistence Pipeline

1. **localStorage** — Zustand persist middleware, key `spatialtasks-workspace`
2. **Supabase** — Debounced (2s) upsert to `workspaces` table on every mutation
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
| Ctrl/Cmd+Z | Undo | Skip when typing |
| Ctrl/Cmd+Shift+Z | Redo | Skip when typing |
| Ctrl/Cmd+Shift+F | Fit view | Skip when typing |
| Backspace/Delete | Delete selected | Skip when typing |
| Escape | Close modals / cancel | Global |

## Touch / Mobile Interactions

| Gesture | Action | Details |
|---------|--------|---------|
| Long-press (500ms) | Action sheet | On nodes, edges, pane; vibration feedback |
| Swipe right from left edge | Navigate back | 50px start, 100px threshold |
| Tap node (connect mode) | Start/complete connection | Two-tap flow |
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
| View mode consistency | graph ↔ list | Changes in one view must reflect in other |
| Container deletion UX | ConfirmModal | Deleting container with children is destructive |
| AI generation errors | gemini.ts | Parse failures, quota limits, network errors |
| JSON import validation | jsonImport | Partial validation; malformed data could corrupt state |
| Viewport persistence | graph.viewport | May not save/restore correctly across navigations |
