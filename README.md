# SpatialTasks

A spatial, node-based task management system. Organize projects as connected nodes on a canvas, open nodes into nested subflows, and navigate through work visually.

<img width="1278" height="675" alt="image" src="https://github.com/user-attachments/assets/b4e87a2c-55ae-4232-a7b8-fa8d17750edf" />

<img width="442" height="369" alt="image" src="https://github.com/user-attachments/assets/e222543e-8adb-4872-b452-8944cb40b8c9" />


## Features

### Core

- **Spatial Canvas** — Drag-and-drop nodes on an infinite canvas with pan and zoom
- **Nested Subflows** — Open container nodes to dive into nested workspaces with breadcrumb navigation
- **Dependency Tracking** — Edges between nodes enforce task ordering; blocked nodes are visually indicated
- **Visual Progress** — Track completion with progress rings, status indicators, and progress bars on containers
- **Execution Mode** — Highlights actionable next steps, dims completed/blocked work, and provides a "Next" button to advance through your flow
- **Resizable Nodes** — Drag the right edge of any node to resize it
- **List View** — Toggle between spatial graph view and a flat list view for quick scanning
- **Node Notes** — Attach notes to any node with copy-to-clipboard and full-screen expand support
- **Undo / Redo** — Full undo/redo history (Ctrl+Z / Ctrl+Shift+Z)
- **Persistent State** — All work is saved locally in the browser with a live save indicator

### Markdown Plan Import

- **Import Implementation Plans** — Upload a `.md` / `.txt` file or paste markdown to auto-generate a project graph from your plan
- **Smart Parsing** — `## Headings` become steps (container nodes), bullet lists become substeps (action nodes), and `### Verification` sections are preserved
- **Description & Notes** — Step descriptions from the markdown are stored in each node's notes for reference during execution
- **Review Before Creating** — Parsed plans open in the interactive draft review panel where you can rename, reorder, indent/outdent, and add/remove steps before committing to canvas
- **File Drop Zone** — Drag-and-drop file upload with paste-markdown fallback tab

### Enhanced Execution Mode

- **Step Detail Panel** — When executing inside a step's subgraph, a floating panel shows the step description, substep checklist, and verification criteria
- **Inline Substep Checklist** — Click any substep in the panel to cycle its status (todo → in progress → done) without leaving the panel
- **Verification Criteria** — Collapsible verification section (parsed from `### Verification` in the imported markdown) displayed in an amber-accented box
- **Complete & Move On** — One-click button to mark all remaining substeps as done, navigate back to the parent graph, and auto-advance to the next step
- **Collapsible Panel** — Panel can be collapsed to a slim tab on the right edge; responsive bottom-sheet layout on mobile

### AI Features

- **Magic Expand** — Use your own Gemini API key to auto-decompose container nodes into subtask subflows with dependencies
- **AI Starter Flows** — Generate a complete project flow from a description using AI when starting a new project

### Project Management

- **Multiple Projects** — Create, switch between, and delete projects from the sidebar
- **New Project Button** — Quick-create projects from the sidebar

### iPhone & Mobile

- **Touch-Optimized** — 44pt minimum touch targets, long-press context menus, floating action button for quick task creation
- **Tap-to-Connect** — Create edges between nodes by tapping source then target in connect mode
- **Tap-to-Zoom** — Tapping a node auto-zooms to show it and its immediate successors
- **View Full Flow** — Floating button to zoom out and see the entire diagram at once
- **Swipe-to-Navigate** — Swipe right from the left edge to go back up the breadcrumb
- **Responsive Header** — View toggle and secondary actions collapse into an overflow menu on small screens
- **Haptic Feedback** — Subtle vibration on status changes and navigation
- **iOS Safe Areas** — Proper insets for notch, home indicator, and virtual keyboard
- **Slide-Over Sidebar** — Sidebar renders as a drawer overlay on mobile
- **Pinch-to-Zoom Preferred** — Canvas zoom controls are hidden on mobile in favor of native gestures

## Tech Stack

- React 18 + TypeScript
- ReactFlow (node-flow canvas)
- Zustand (state management with localStorage persistence + undo/redo via zundo)
- Tailwind CSS
- Vite

## Getting Started

```bash
npm install
npm run dev
```

## Gemini AI Setup (Optional)

SpatialTasks supports optional AI features that use Google's Gemini 2.5 Flash. This is a bring-your-own-key (BYOK) feature — no API key is required for core functionality.

### Step 1: Get a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click **Create API Key**
4. Select or create a Google Cloud project when prompted
5. Copy the generated API key

> Google offers a free tier for Gemini API usage. Limits vary by model and tier — check [Google's pricing page](https://ai.google.dev/pricing) for current details.

### Step 2: Add the Key to SpatialTasks

1. Open SpatialTasks in your browser
2. Click the **gear icon** in the top-left sidebar header
3. Paste your API key into the input field
4. Click **Save Key**
5. The status indicator will turn green showing "Key configured"

### Step 3: Use Magic Expand

1. Navigate to any project with container nodes (the purple nodes with a layer icon)
2. A **sparkle icon** will now appear on each container node next to the enter arrow
3. Click the sparkle icon on a container node
4. Gemini will generate 3–7 subtasks with dependencies and wire them into a nested subflow
5. The app automatically navigates into the new subgraph

### Troubleshooting

| Issue | Solution |
|-------|----------|
| No sparkle button visible | Open Settings and verify your key is saved (green status dot) |
| "Invalid API key" error | Double-check the key in Settings; regenerate it in AI Studio if needed |
| "Quota exceeded" error | You've hit your Gemini free-tier limit — wait or upgrade your plan |
| "Network error" | Check your internet connection and try again |

### Removing or Replacing Your Key

Open Settings (gear icon) and click **Remove** to delete your key, or paste a new one and click **Save Key** to replace it. Your key is stored locally in your browser's localStorage and is only sent to Google's Gemini API endpoint.

## QA Verification Checklist

This section documents the manual QA verifications needed after the audit-fix changes. Tests are grouped by the fix they validate. Use Chrome DevTools device emulation (iPhone 14 Pro, 393×852) for mobile tests, and a real iPhone with Safari for iOS-specific items.

### Phase 1 — Critical Fixes

#### 1.1 Undo/Redo text input guard

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | Double-click a node title on the canvas to enter edit mode | Inline textarea appears |
| 2 | Type some text, then press Cmd+Z (or Ctrl+Z) | Browser undoes your typing (removes last typed characters), NOT the last workspace action |
| 3 | Press Cmd+Shift+Z while still in the textarea | Browser redoes your typing, NOT the workspace redo |
| 4 | Click away to exit edit mode, then press Cmd+Z on the canvas (no input focused) | Workspace undo fires (e.g., reverts the title change) |
| 5 | Repeat with the quick-add input (double-click canvas) — Cmd+Z should undo typing, not workspace state | Typing undo only |
| 6 | Repeat in ListView inline edit and in the NotesEditor textarea | Same: browser undo while typing |

#### 1.2 Magic Expand orphan graph cleanup

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | Create a container node, enter it, and add 3 subtasks manually | Subtasks visible in subgraph |
| 2 | Navigate back to the parent graph | Container shows progress |
| 3 | Open browser DevTools → Console, run: `JSON.stringify(Object.keys(useWorkspaceStore.getState().graphs))` | Note the graph IDs |
| 4 | Click Magic Expand (sparkle icon) on the same container, confirm "Replace" | AI generates new subtasks |
| 5 | Run the same console command again | The OLD child graph ID should be gone — graph count should not increase (old graph tree removed) |
| 6 | Repeat from ListView (expand a container that already has children via the sparkle button in list view) | Same: old graph removed before new one created |

#### 1.3 Delete confirmation preserves edges

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | Create a container node and two action nodes. Connect them with edges | Edges visible |
| 2 | Select the container node + an edge (hold Shift to multi-select) | Both highlighted |
| 3 | Press Delete/Backspace | Confirmation dialog appears ("Delete N node(s)?") |
| 4 | Click **Cancel** | Dialog closes. Both the container node AND the edge are still present — nothing was deleted |
| 5 | Press Delete again, this time click **Delete** | Both node and edge are removed |
| 6 | Verify undo (Cmd+Z) restores them | Nodes and edges restored |

#### 1.4 Error boundary

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | In DevTools Console, run: `document.querySelector('#root')._reactRootContainer` or trigger a render error via React DevTools by corrupting a component's state | Error boundary catches the crash |
| 2 | Observe the screen | Shows "Something went wrong" message with error text and a purple "Reload App" button — NOT a white screen |
| 3 | Click "Reload App" | Page reloads normally |

---

### Phase 2 — Mobile Usability

#### 2.1 NotesEditor on mobile

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | On mobile viewport (or real phone), select a node on the canvas | Node selected with purple border |
| 2 | Tap the sticky-note icon (bottom-right of node) | Full-screen modal opens (NOT the small 256px popover) |
| 3 | Type notes, tap Save | Notes saved, modal closes |
| 4 | On desktop, repeat the same | Small popover appears (desktop keeps the popover, with expand button) |

#### 2.2 Delete in ListView

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | Switch to List View (toggle in top bar) | List of tasks visible |
| 2 | Locate an action task — verify a trash icon is visible on the right side of the row | Trash icon present |
| 3 | Click/tap the trash icon on an action task | Task is immediately deleted |
| 4 | Locate a container task — click its trash icon | Confirmation dialog: "Delete [name] and all its children?" |
| 5 | Click Cancel | Container stays |
| 6 | Click Delete | Container and its children removed |
| 7 | On mobile, verify trash buttons have adequate touch targets (44×44pt) | Easy to tap without accidentally hitting adjacent buttons |

#### 2.3 Project delete visibility on touch

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | On mobile viewport, open the sidebar (hamburger menu) | Sidebar drawer slides in |
| 2 | Look at project list items (must have 2+ projects) | Trash icon is visible (slightly dimmed) on each project — NOT hidden behind a hover state |
| 3 | Tap a project's trash icon | Delete confirmation dialog appears |

#### 2.4 Swipe-back gesture

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | On a real iPhone in Safari, navigate into a container's subgraph (breadcrumb depth ≥ 2) | Inside subgraph |
| 2 | Swipe right from the very left edge of the screen (0–20px) | iOS Safari's native back gesture activates (browser back), NOT app navigation |
| 3 | Swipe right starting from 50–80px from the left edge with a long horizontal swipe (>100px) | App navigates back up the breadcrumb with haptic feedback |
| 4 | Verify a short swipe (<100px) does NOT trigger navigation | No accidental navigation |

#### 2.5 ListView edit button touch targets

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | On mobile viewport in List View, tap the pencil (edit) icon on an action task | Inline edit activates easily — icon has 44×44pt touch target |
| 2 | Tap the pencil icon on a container task | Same — easy to hit |

#### 2.6 Sidebar settings touch targets

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | On mobile, open sidebar → tap gear icon to open Settings | Easy to tap (44×44pt target) |
| 2 | In the API key field, tap the eye icon to toggle visibility | Easy to tap (44×44pt target) |

#### 2.7 FAB/panel overlap

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | On mobile viewport, toggle Execution Mode (lightning bolt button in top bar) | Execution mode activates |
| 2 | Navigate into a container's subgraph | StepDetailPanel appears as a bottom sheet |
| 3 | Verify the FAB (+) button and fit-view button are NOT visible | Both hidden to avoid overlap with the bottom sheet |
| 4 | Navigate back to root graph | FAB and fit-view button reappear |
| 5 | Toggle execution mode OFF | FAB and fit-view button remain visible |

---

### Phase 3 — Architecture / Maintainability

#### 3.1 Advance-next with fresh state

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | Enable Execution Mode | Actionable nodes highlighted |
| 2 | Navigate into a container with multiple subtasks | Step detail panel shows |
| 3 | Click the "Next" button on a highlighted action node | Node marked as done, canvas zooms to the next actionable node |
| 4 | Repeat rapidly for several nodes | Each zoom targets the correct next node (no stale graph data) |

#### 3.2 JSON import validation

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | Open DevTools Console | Console ready |
| 2 | Run: `useWorkspaceStore.getState().jsonImport('{"version":1,"projects":[],"graphs":{}}')` | Imports successfully (empty but valid) |
| 3 | Run: `useWorkspaceStore.getState().jsonImport('{"version":1,"projects":[{"id":"x"}],"graphs":{}}')` | Rejected — console error "Invalid project" (missing title and rootGraphId) |
| 4 | Run: `useWorkspaceStore.getState().jsonImport('not json')` | Rejected — console error "Failed to import" |

#### 3.3 Pending save error recovery

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | Make a change while offline (disable network in DevTools) | Change saved to localStorage |
| 2 | Attempt to close the tab | "Unsaved changes" warning appears (beforeunload) |
| 3 | Wait for the debounce timer (~2s) to fire the failed save | After the failed save, the _pendingSave flag resets |
| 4 | Make another change (this restarts the debounce) | No permanent "unsaved" warning stuck |

#### 3.4 Complete & Move On stale closure

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | In Execution Mode, navigate into a container with incomplete subtasks | Step detail panel visible |
| 2 | Click "Complete Step & Move On" and confirm | All subtasks marked done, navigates back, canvas zooms to next step |
| 3 | Verify the advance-next event targets the correct container node (the one you just completed) | Zoom goes to the right next node, not a random one |

#### 3.5 Context menu / action sheet parity

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | Right-click an action node on desktop | Context menu shows: Set Status (submenu), Delete |
| 2 | Right-click a container node | Context menu shows: Delete (with confirmation) |
| 3 | Right-click the canvas background | Context menu shows: New Action Node, New Container |
| 4 | On mobile viewport, long-press an action node | Action sheet shows the same items as the context menu |
| 5 | Long-press the canvas background | Action sheet shows: New Action Node, New Container |
| 6 | Right-click with multiple nodes selected (Shift-click to multi-select first) | Context menu shows batch status and batch delete options |

#### 3.7 Batch position updates (performance)

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | Select 10+ nodes (use Select Mode or Shift-click) | All selected |
| 2 | Drag the group across the canvas | Movement is smooth — no visible lag or jank |
| 3 | Release — all positions saved | All nodes in correct final positions after release |
| 4 | Undo (Cmd+Z) | All nodes snap back to pre-drag positions in one step |

#### 3.8 TopoSort performance

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | Create a graph with 50+ nodes, some disconnected (no edges) | Large graph |
| 2 | Switch to List View | List renders without noticeable delay |
| 3 | Verify disconnected nodes appear at depth 0 | Correct — they have no dependencies |

---

### Phase 4 — Polish / UX Refinement

#### 4.1 Quick-add input clamping

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | On desktop, double-click near the far right edge of the canvas | Quick-add input appears clamped within the viewport (not clipped off-screen) |
| 2 | Double-click near the bottom edge | Input stays within viewport bounds |

#### 4.4 Confirmation for batch completion

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | In Execution Mode, enter a container with 5 subtasks (3 remaining) | Step detail panel shows 2/5 complete |
| 2 | Click "Complete Step & Move On" | Confirmation dialog: "Mark 3 remaining tasks as done and move on?" |
| 3 | Click Cancel | Nothing happens, stays on same screen |
| 4 | Click "Complete All" | All marked done, navigates back |
| 5 | When all subtasks are already done, click "Step Complete — Move On" | No confirmation needed — navigates immediately |

#### 4.6 Project rename

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | In the sidebar, double-click a project name | Inline input appears with current title |
| 2 | Change the title, press Enter | Title saved, input closes |
| 3 | Double-click again, press Escape | Edit cancelled, original title preserved |
| 4 | Double-click, clear the field, click away (blur) | Original title preserved (empty titles rejected) |
| 5 | Single-click a project | Navigates to that project (NOT edit mode) — single and double click are distinct |

#### 4.7 Fit-view keyboard shortcut

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | On the canvas with nodes, press Ctrl+Shift+F (or Cmd+Shift+F on Mac) | Canvas zooms to fit all nodes with padding |
| 2 | Verify it does NOT fire when typing in an input field | No zoom while editing text |

#### 4.9 Security headers

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | Deploy to Vercel (or check `vercel.json` directly) | Headers section present |
| 2 | After deploy, check response headers in DevTools Network tab | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` all present |

---

### Regression Tests

Run these after all fixes to confirm core functionality is unbroken.

| # | Area | Test | Expected |
|---|------|------|----------|
| 1 | Project CRUD | Create a new project, verify it appears in sidebar | Works |
| 2 | Node creation | Double-click canvas (desktop) to add a task | Task created at click position |
| 3 | Node creation | Use FAB (+) on mobile to add a task | Task created at viewport center |
| 4 | Drag | Drag a single node | Position updates smoothly |
| 5 | Connect | Drag from source handle to target handle to create an edge | Edge created |
| 6 | Connect mode | Enable connect mode, tap source, tap target | Edge created, connect mode exits |
| 7 | Status cycle | Click a task's status icon | Cycles: todo → in_progress → done → todo |
| 8 | Container enter | Click the arrow on a container node | Navigates into subgraph, breadcrumb updates |
| 9 | Breadcrumb | Click a breadcrumb item | Navigates to that graph level |
| 10 | Undo/Redo | Make 3 changes, undo 3 times, redo 2 times | State matches expected |
| 11 | Delete | Select nodes + edges, press Delete | Deleted (with confirmation for containers) |
| 12 | Persistence | Make changes, refresh the page | All changes preserved |
| 13 | Supabase sync | Log in, make changes, log out, log back in | Changes synced from Supabase |
| 14 | View toggle | Switch between Graph and List view | Both render correctly |
| 15 | AI Flow Gen | Generate a flow from the sidebar | Flow created and committed to canvas |
| 16 | Markdown import | Import a markdown plan | Steps parsed into graph structure |
| 17 | Execution mode | Toggle execution mode on/off | Actionable nodes highlighted/unhighlighted |

---

### Test Environment Matrix

| Platform | Browser | Priority |
|----------|---------|----------|
| Desktop macOS | Chrome latest | High |
| Desktop macOS | Safari latest | Medium |
| Desktop Windows | Chrome latest | Medium |
| iPhone 14+ | Safari iOS | High |
| iPhone SE | Safari iOS | Medium (small screen edge cases) |
| iPad | Safari iPadOS | Medium |
| Android phone | Chrome Mobile | Low |

## Deployment

Configured for Vercel. Push to deploy or run:

```bash
npm run build
```
