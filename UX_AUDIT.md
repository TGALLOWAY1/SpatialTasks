# SpatialTasks — Full UI/UX Audit and Improvement Plan

**Date:** 2026-03-13
**Scope:** Comprehensive audit of UI/UX for public release readiness

---

## Part 1 — Product Understanding

### What the application is trying to accomplish

SpatialTasks is a visual, spatial task planning tool where users organize projects as connected nodes on an infinite canvas. It differentiates itself from list-based task managers through:

- **Recursive subgraphs**: Container nodes can be "entered" to reveal nested canvases, enabling fractal-depth task decomposition.
- **Dependency tracking**: Edges between nodes enforce task ordering, with blocked/actionable states computed automatically.
- **Execution mode**: A toggle that highlights the next actionable tasks and dims completed/blocked work.
- **AI expansion**: Optional Gemini integration to auto-decompose containers into subtask subflows.

### Core interaction model

The UI asks users to adopt a **graph/canvas mental model** — tasks are spatial objects with positions, connections represent dependencies, and hierarchy is expressed through nested graphs rather than indentation. Navigation is primarily spatial (pan/zoom) with a breadcrumb trail for subgraph depth.

### Primary task users are trying to accomplish

1. **Create** projects with tasks and subtask groups
2. **Organize** tasks spatially and define dependencies
3. **Track progress** through status cycling and progress roll-ups
4. **Navigate** between levels of task decomposition
5. **Identify** what to work on next via execution mode

### Is the UI aligned with that goal?

**Mostly yes, with important caveats.** The spatial canvas + subgraph model is sound and novel. However, the current implementation has gaps in discoverability, onboarding, and several interaction patterns that could confuse new users. The dual-mode approach (graph view + list view) is smart but needs tighter integration. Key concerns are detailed below.

---

## Part 2 — UI/UX Audit

### 1. Navigation and Orientation

**Strengths:**
- Breadcrumb navigation in the TopBar provides clear depth tracking (`src/components/Layout/TopBar.tsx:38-50`)
- Home icon on the root breadcrumb is intuitive
- `fitView` on ReactFlow ensures nodes are visible on load (`CanvasArea.tsx:581`)

**Issues found:**

| Issue | Severity | Location |
|-------|----------|----------|
| **No minimap for large graphs** — Users lose spatial orientation once they pan away from the main cluster. ReactFlow has a built-in `<MiniMap>` component that is not used. | High | `CanvasArea.tsx:562-586` |
| **No "fit to view" button exposed** — While ReactFlow Controls include zoom buttons, there is no explicit "reset view" or "fit all nodes" button in the TopBar. Users who get lost have to find the small ReactFlow controls. | Medium | `CanvasArea.tsx:585` |
| **Breadcrumb truncation too aggressive** — Max width of 100px (60px on touch) means even short labels like "Breakfast" get truncated. | Medium | `TopBar.tsx:47` |
| **No visual indication of subgraph depth** — When deep in nested graphs, there's no visual cue (color shift, depth counter) to communicate how deep the user is. | Low | `TopBar.tsx:38-50` |
| **No transition animation when entering/exiting subgraphs** — The canvas abruptly changes content. A zoom-in or fade transition would reinforce the "drilling in" metaphor. | Low | `workspaceStore.ts:132-139` |

### 2. Node Interaction Model

**Strengths:**
- Two clear node types with distinct visual treatments (dark slate for actions, indigo for containers)
- Status cycling on click is efficient for single-node updates
- Touch-aware: floating "Edit" button appears on selection, enlarged handles, FAB for quick-add
- Connect mode (tap-source-then-tap-target) is a smart mobile alternative to drag-to-connect
- Resize handles on nodes with min/max constraints

**Issues found:**

| Issue | Severity | Location |
|-------|----------|----------|
| **Double-click to edit title is undiscoverable** — There is no visible affordance that titles are editable. On desktop, users must double-click. On touch, they must select then tap the floating "Edit" button. Neither is obvious to new users. | High | `ActionNode.tsx:60-64`, `ContainerNode.tsx:70-74` |
| **No way to create container nodes from double-click quick-add** — The double-click quick-add input (`CanvasArea.tsx:602-628`) always creates action nodes. Users must use the context menu to create containers. | Medium | `CanvasArea.tsx:608-622` |
| **Quick-add input positioned at click point can overflow viewport** — The `position: fixed` input at `(screenX, screenY)` has no bounds checking and can appear partially off-screen. | Medium | `CanvasArea.tsx:603` |
| **Container node creation doesn't auto-create child graph** — When a container is created via context menu, `childGraphId` is undefined. The child graph is created lazily on "Enter" click. This means the progress ring shows 0% with no indication the container is empty vs. has incomplete tasks. | Medium | `ContainerNode.tsx:82-100` |
| **No visual feedback during connect mode** — When connect mode is active and a source is selected, the source node pulses purple, but there's no instruction text telling the user to "tap a target node" or a way to cancel without tapping the pane. | Medium | `CanvasArea.tsx:219-241` |
| **Status icon click target is tiny on desktop** — The status icon is 16x16px. The `touch:min-h-[44px]` class only applies on touch devices; on desktop, the click target remains small. | Medium | `ActionNode.tsx:109-118` |
| **Keyboard focus not trapped in edit textareas** — When editing a node title, Tab key is not intercepted. Pressing Tab while editing moves focus out of the node unpredictably. | Low | `ActionNode.tsx:119-133` |
| **No node duplication** — There is no way to duplicate an existing node (common in canvas tools). | Low | N/A |

### 3. Information Hierarchy

**Strengths:**
- Container nodes are visually distinct from action nodes (indigo vs. slate, layer icon, progress ring)
- Execution mode effectively highlights actionable items (amber ring + "Next" badge + "Dive In" badge)
- Blocked nodes show a red "Blocked" badge and are dimmed
- Done tasks have line-through and reduced opacity

**Issues found:**

| Issue | Severity | Location |
|-------|----------|----------|
| **Execution mode button label is confusing** — The button shows "Plan" when execution mode is OFF and "Run" when it's ON. "Plan Mode" / "Execution Mode" would be clearer. The icon also toggles between PlayCircle and StopCircle, which implies media playback. | High | `TopBar.tsx:148-159` |
| **No visual priority/importance differentiation between nodes** — All action nodes at the same status level look identical. There's no way to mark a task as high-priority. | Medium | N/A |
| **Edge styling is uniform** — All dependency edges look the same (gray, animated). There's no visual differentiation between critical path edges and optional dependencies. | Low | `CanvasArea.tsx:92-102` |
| **"Regenerate Data" is a destructive action hidden at sidebar bottom** — This wipes the entire workspace. It has no confirmation dialog and sits alongside the benign "Sign Out" button. | High | `Sidebar.tsx:296-299` |

### 4. Responsiveness and Mobile UX

**Strengths (significant mobile work already done):**
- `useDeviceDetect` hook with `isTouchDevice`, `isMobile`, `isIOS` detection (`useDeviceDetect.ts`)
- Touch-specific CSS: enlarged handles (44px hit area), active states instead of hover, safe area insets
- Mobile sidebar as drawer overlay with backdrop (`Sidebar.tsx:315-329`)
- Hamburger menu in TopBar for mobile
- FAB for quick-add on touch devices (`FloatingActionButton.tsx`)
- Long-press action sheets instead of context menus (`ActionSheet.tsx`)
- `useKeyboardOffset` for iOS virtual keyboard avoidance
- Disabled edge animations on touch for performance
- `requestAnimationFrame` throttling for node position updates on touch
- Select mode and Connect mode toggles exposed in TopBar on touch

**Issues found:**

| Issue | Severity | Location |
|-------|----------|----------|
| **TopBar overflows on small screens** — The right-side toolbar has 7+ buttons on mobile (view toggle, undo, redo, delete, select, link, plan/run). At ~375px width, these don't fit. | Critical | `TopBar.tsx:53-159` |
| **No `touch:` variant actually works in production** — The Tailwind config defines `touch` as `(hover: none)` screen, but classes like `touch:min-h-[44px]` are used extensively. This custom screen variant may not generate utility classes for all properties without explicit `screens` setup in Tailwind's JIT. Needs verification. | High | `tailwind.config.js:10-11` |
| **List view quick-add input and button lack touch sizing** — The "Add" button in list view has `touch:min-h-[44px]` but the input does not meet 44pt minimum. | Medium | `ListView.tsx:345-362` |
| **Sidebar drawer has no swipe-to-close** — The drawer slides in from left but can only be closed by tapping the backdrop or navigating. Swipe gesture would be expected. | Medium | `Sidebar.tsx:315-329` |
| **Context menu submenus overlap on narrow viewports** — The `SubMenu` component positions at `left: 180px` (hardcoded) which will overflow on mobile. While touch devices use ActionSheet instead, the fallback isn't guaranteed. | Medium | `ContextMenu.tsx:25, 121` |
| **`will-change: transform` on nodes/edges could hurt memory on older devices** — GPU promotion for all nodes is aggressive. | Low | `index.css:100-103` |

### 5. Interaction Consistency

**Issues found:**

| Issue | Severity | Location |
|-------|----------|----------|
| **Title editing differs between node types** — ContainerNode uses a `<textarea rows={2}>` while the quick-add input and list view use `<input>`. The editing experience should be consistent. | Medium | `ContainerNode.tsx:232-245`, `ActionNode.tsx:119-133` |
| **List view uses single-click edit button + double-click on title; canvas only uses double-click** — In list view, there's always a visible Pencil icon to enter edit mode. On the canvas, there's no such affordance (desktop). Inconsistent discoverability. | Medium | `ListView.tsx:94-101` vs `ActionNode.tsx:60-64` |
| **Adding tasks in list view places them at random coordinates** — `x: Math.random() * 400, y: Math.random() * 300` means switching to graph view shows randomly scattered nodes. | High | `ListView.tsx:299-300` |
| **Magic Expand logic is duplicated** — The Gemini expand flow is copy-pasted between `ContainerNode.tsx:103-177` and `ListView.tsx:150-190`. Bug fixes must be applied in two places. | Medium | Both files |
| **Delete behavior differs** — Context menu delete on a single container shows a confirmation modal. Keyboard delete (Backspace/Delete) on a selected container also shows confirmation. But there's no confirmation for deleting action nodes, even in bulk. | Low | `CanvasArea.tsx:141-162` |

### 6. Performance UX

**Strengths:**
- Loading screen shown during Supabase hydration (`LoadingScreen.tsx`)
- Toast notifications for success/error feedback
- Edge animations disabled on touch devices
- RAF throttling for mobile drag updates

**Issues found:**

| Issue | Severity | Location |
|-------|----------|----------|
| **No save indicator** — Data is persisted to localStorage via Zustand persist, but there's no visual confirmation that changes are saved. Users may not trust that their work persists. | High | `workspaceStore.ts:438-452` |
| **No optimistic UI feedback for Magic Expand** — The spinner is shown on the button, but there's no progress indication for what can be a multi-second API call. A skeletal loading state or progress bar would help. | Medium | `ContainerNode.tsx:103-177` |
| **Undo/redo has no feedback** — Pressing Ctrl+Z or tapping the Undo button changes state silently. A brief toast or visual flash would confirm the action. | Low | `CanvasArea.tsx:170-183` |
| **`onNodesChange` fires per-change, updating store synchronously on desktop** — Each individual node position change triggers a full Zustand update + persistence write. For large graphs with many nodes being dragged, this could cause jank. | Medium | `CanvasArea.tsx:104-119` |
| **JSON import has no validation feedback** — `jsonImport` silently catches errors with `console.error`. Users get no indication if import fails. | Medium | `workspaceStore.ts:396-409` |

---

## Part 3 — Must-Have Fixes Before Release

### 1. TopBar toolbar overflow on mobile

- **Severity:** Critical
- **Description:** The TopBar right section contains 7+ interactive elements (view toggle pair, undo, redo, delete, select mode, connect mode, execution mode). On a 375px-wide iPhone, these elements exceed available width, causing either overflow or unusable compression.
- **Why it harms usability:** Users cannot access core features on mobile. Buttons become un-tappable or hidden off-screen.
- **Recommended fix:** Group secondary actions (select mode, connect mode) into an overflow menu or a collapsible toolbar. Alternatively, move undo/redo into a long-press or swipe gesture and keep only the most critical 4 buttons visible.

### 2. "Regenerate Data" destroys workspace without confirmation

- **Severity:** Critical
- **Description:** The "Regenerate Data" button in the sidebar footer (`Sidebar.tsx:296-299`) calls `resetWorkspace(Math.random().toString())` which completely wipes all projects, graphs, and nodes, replacing them with seed-generated demo data.
- **Why it harms usability:** A single accidental click destroys all user work. The button sits next to "Sign Out" and has no confirmation dialog. The label "Regenerate Data" doesn't clearly communicate the destructive nature.
- **Recommended fix:** Add a `ConfirmModal` with an explicit warning: "This will delete all your projects and replace them with sample data. This cannot be undone." Consider renaming to "Reset to Demo Data" and moving it into Settings.

### 3. No save/sync status indicator

- **Severity:** High
- **Description:** Changes are auto-saved to localStorage and synced to Supabase, but there is no visible indicator of save state anywhere in the UI.
- **Why it harms usability:** Users cannot trust that their changes persist. After editing tasks, they may fear data loss on refresh, especially since there's no explicit "Save" action.
- **Recommended fix:** Add a subtle indicator in the TopBar (e.g., small dot or "Saved" text) that briefly shows after changes are persisted. Show "Syncing..." during Supabase writes and "Offline" if the connection is lost.

### 4. Execution mode label is misleading

- **Severity:** High
- **Description:** The execution mode toggle shows "Plan" when execution mode is OFF (i.e., "click to enter Plan Mode") and "Run" when ON. This is backwards from user expectation — "Plan Mode" should describe the current state when in plan mode, not the action. The Play/Stop icons further confuse this with media playback.
- **Why it harms usability:** New users won't understand what the button does or which mode they're currently in. The label reads as the current mode name but is actually the mode you'd switch TO.
- **Recommended fix:** Use a clear label pattern: show the current mode name with an active/inactive visual state. For example: always label "Plan Mode" and toggle its visual state (active = amber glow, inactive = gray). Or use two distinct labels: "Planning" (gray) vs "Executing" (amber).

### 5. Title editing is undiscoverable

- **Severity:** High
- **Description:** On desktop, the only way to rename a node is to double-click its title text. There is no tooltip, cursor change, or icon indicating this is possible. On mobile, users must first tap to select, then notice and tap the floating "Edit" pill that appears above the node.
- **Why it harms usability:** New users will not know they can rename nodes. They may assume titles are fixed after creation, leading to workarounds like deleting and recreating nodes.
- **Recommended fix:** (a) Add a pencil icon that appears on hover (desktop) or always (touch) next to the title, consistent with how list view works. (b) Change cursor to `text` on hover over titles. (c) Add a tooltip "Double-click to edit" on first hover.

### 6. List view task placement is random

- **Severity:** High
- **Description:** Tasks added from list view are placed at random canvas coordinates (`x: Math.random() * 400, y: Math.random() * 300`). Switching to graph view reveals a chaotic layout.
- **Why it harms usability:** Users who primarily use list view will have an unusable graph view. The spatial layout — the app's core differentiator — becomes meaningless noise.
- **Recommended fix:** When adding tasks from list view, use an intelligent placement algorithm: (a) find the rightmost node and place the new node to its right with standard padding, or (b) place new nodes below the last-added node in a vertical list, or (c) auto-layout all unpositioned nodes.

### 7. Verify `touch:` Tailwind variant generates all needed utilities

- **Severity:** High
- **Description:** The custom `touch` screen variant (`tailwind.config.js:10-11`) is used extensively throughout the codebase with classes like `touch:min-h-[44px]`, `touch:min-w-[44px]`, `touch:flex`, `touch:py-3`, etc. Custom screen variants in Tailwind v3 should work with JIT, but this needs verification that all arbitrary value combinations generate correctly.
- **Why it harms usability:** If any `touch:` utility fails to generate, mobile users will have undersized tap targets, broken layouts, or missing styles.
- **Recommended fix:** Build the project and inspect the generated CSS to verify all `touch:` utilities are present. Consider adding a Tailwind plugin test or fallback media query styles in `index.css`.

---

## Part 4 — UX Enhancements

### 1. Add a MiniMap

- **User benefit:** Provides spatial orientation on large graphs. Users can see the full graph structure at a glance and click to navigate.
- **Suggested implementation:** ReactFlow's built-in `<MiniMap>` component. Add it inside the `<ReactFlow>` tag in `CanvasArea.tsx` with dark theme colors matching the existing palette.

### 2. Keyboard navigation improvements

- **User benefit:** Power users can manage tasks without reaching for the mouse.
- **Suggested implementation:**
  - `Tab` / `Shift+Tab` to cycle through nodes
  - `Enter` to edit selected node title
  - `Space` to cycle selected node status
  - `E` to enter a selected container
  - `Escape` to navigate back one level
  - Arrow keys to pan canvas (when no node is selected)
  - Display a keyboard shortcut cheat sheet (triggered by `?`)

### 3. Onboarding / empty state guidance

- **User benefit:** New users understand how to use the app without external documentation.
- **Suggested implementation:**
  - When a project graph is empty, show a centered prompt: "Double-click to add a task, or right-click for more options"
  - On first launch, show a brief 3-step tooltip tour: (1) "Create tasks on the canvas", (2) "Connect them to define dependencies", (3) "Enter containers to organize subtasks"
  - Add placeholder text in the empty canvas state

### 4. Auto-layout / snap-to-grid

- **User benefit:** Keeps the canvas organized. Especially valuable after AI-generated subtask creation or manual editing.
- **Suggested implementation:**
  - "Auto Layout" button in the TopBar that applies a Dagre or ELK algorithm to arrange nodes in a clean DAG layout
  - Optional snap-to-grid during drag (with Grid already displayed via `<Background>`)

### 5. Task filtering and search

- **User benefit:** Quickly find specific tasks in large projects.
- **Suggested implementation:**
  - Search input in TopBar that highlights matching nodes and dims others
  - Filter by status (todo/in_progress/done) in list view
  - Filter by type (action/container) in list view

### 6. Edge visualization improvements

- **User benefit:** Better understanding of task dependencies and critical path.
- **Suggested implementation:**
  - Color edges based on source node status (green for done, blue for in-progress, gray for todo)
  - In execution mode, highlight the critical path in amber
  - Show edge labels for dependency type if extended

### 7. Project management improvements

- **User benefit:** Better project organization and housekeeping.
- **Suggested implementation:**
  - Project rename (currently no way to rename a project)
  - Project delete with confirmation
  - Project reordering (drag-and-drop in sidebar)
  - Project creation date / last modified display

### 8. Node notes/description panel

- **User benefit:** Tasks often need more context than a title provides.
- **Suggested implementation:**
  - The `NodeMeta` type already has a `notes` field (`types/index.ts:5`)
  - Add a detail panel that slides in from the right when a node is selected
  - Include a textarea for notes, tag management, and status controls
  - This also solves the title-editing discoverability problem

### 9. Connection visualization during connect mode

- **User benefit:** Clear feedback about what's happening during the two-tap connect flow.
- **Suggested implementation:**
  - When connect mode is active with a source selected, show a pulsing line from the source to the cursor/finger position
  - Show instruction text in the TopBar: "Tap a node to connect" / "Tap canvas to cancel"
  - Dim the source node's outgoing handle to indicate direction

### 10. Dark/light theme support

- **User benefit:** Accommodates user preference and environment conditions.
- **Suggested implementation:**
  - The `WorkspaceSettings` type already has a `theme` field (`types/index.ts:68`)
  - Add a theme toggle in Settings
  - Define light theme Tailwind classes or use CSS variables

---

## Part 5 — QA Verification Checklist

### Canvas Navigation

| # | Test Step | Expected Result |
|---|-----------|-----------------|
| 1 | Open a project with multiple nodes | Canvas displays all nodes with `fitView` centering them |
| 2 | Scroll mouse wheel up on the canvas | Canvas zooms in, centered on cursor position |
| 3 | Scroll mouse wheel down on the canvas | Canvas zooms out, centered on cursor position |
| 4 | Click and drag on empty canvas area (desktop) | Canvas pans smoothly in the drag direction |
| 5 | Pinch-zoom on touch device | Canvas zooms in/out at the pinch center point |
| 6 | Single-finger drag on empty area (touch, pan mode) | Canvas pans smoothly |
| 7 | Click the ReactFlow zoom-in control (+) | Canvas zooms in one step |
| 8 | Click the ReactFlow zoom-out control (-) | Canvas zooms out one step |
| 9 | Click the ReactFlow fit-view control | All nodes are visible and centered |

### Node Creation

| # | Test Step | Expected Result |
|---|-----------|-----------------|
| 10 | Double-click empty canvas area (desktop) | Quick-add input appears at click position |
| 11 | Type a task name in quick-add and press Enter | New action node appears at that position with the typed title and "todo" status |
| 12 | Press Escape in quick-add input | Input closes without creating a node |
| 13 | Click away from quick-add input | Input closes without creating a node |
| 14 | Right-click empty canvas area | Context menu appears with "New Action Node" and "New Container" options |
| 15 | Select "New Action Node" from context menu | Action node created at right-click position with title "New Task" |
| 16 | Select "New Container" from context menu | Container node created at right-click position with title "New Group" |
| 17 | Tap FAB (+) button on touch device | Bottom sheet input appears for task name |
| 18 | Enter task name in FAB sheet and tap "Add" | New action node created at viewport center |
| 19 | Long-press empty canvas on touch device | Action sheet appears with "New Action Node" and "New Container" options |

### Node Editing

| # | Test Step | Expected Result |
|---|-----------|-----------------|
| 20 | Double-click an action node title (desktop) | Inline textarea appears with current title, auto-focused |
| 21 | Edit text and press Enter | Title updates, edit mode closes |
| 22 | Edit text and press Escape | Title reverts to original, edit mode closes |
| 23 | Edit text and click away (blur) | Title saves if changed, edit mode closes |
| 24 | Double-click a container node title (desktop) | Inline textarea appears for editing |
| 25 | Select a node on touch, tap floating "Edit" button | Inline edit mode activates |
| 26 | Click the status icon on an action node (todo) | Status cycles to "in_progress" (blue clock icon) |
| 27 | Click the status icon on an "in_progress" node | Status cycles to "done" (green checkmark, line-through) |
| 28 | Click the status icon on a "done" node | Status cycles back to "todo" (gray circle) |
| 29 | Click the status icon on a blocked node | Nothing happens (status change is prevented) |

### Node Movement and Resize

| # | Test Step | Expected Result |
|---|-----------|-----------------|
| 30 | Click and drag a node (desktop) | Node moves smoothly, position persists after release |
| 31 | Touch and drag a node (mobile) | Node moves, position updates (with RAF throttling) |
| 32 | Drag the right-edge resize handle on a selected node | Node width changes, respecting min (140/160px) and max (500px) |
| 33 | Move a node that has connections | Connected edges follow the node in real-time |

### Node Deletion

| # | Test Step | Expected Result |
|---|-----------|-----------------|
| 34 | Select an action node and press Delete/Backspace | Node is removed along with its connected edges |
| 35 | Select a container node and press Delete/Backspace | Confirmation modal appears warning about child deletion |
| 36 | Confirm container deletion | Container, its child graphs, and all descendant nodes are removed |
| 37 | Cancel container deletion | Nothing is deleted, modal closes |
| 38 | Right-click a node and select "Delete" | Node is deleted (with confirmation for containers) |
| 39 | Select multiple nodes (Shift+click), press Delete | All selected nodes and their edges are removed |

### Node Relationships (Edges)

| # | Test Step | Expected Result |
|---|-----------|-----------------|
| 40 | Drag from a source handle to a target handle (desktop) | Edge is created connecting the two nodes |
| 41 | Attempt to create a self-loop (drag handle back to same node) | No edge is created |
| 42 | Attempt to create a duplicate edge | No duplicate edge is created |
| 43 | Activate Connect Mode on touch, tap source node, tap target node | Edge is created between the two nodes |
| 44 | Right-click an edge and select "Remove Dependency" | Edge is deleted |
| 45 | Long-press an edge on touch, select "Remove Dependency" from action sheet | Edge is deleted |
| 46 | Create an edge A→B where A is "todo" | Node B shows "Blocked" badge |
| 47 | Mark node A as "done" | Node B is no longer blocked |

### Container / Subgraph Navigation

| # | Test Step | Expected Result |
|---|-----------|-----------------|
| 48 | Click the arrow (enter) button on a container node | Canvas navigates into the child graph; breadcrumb updates |
| 49 | Click a breadcrumb item to navigate back | Canvas returns to the selected graph level |
| 50 | Click the Home breadcrumb | Canvas returns to root graph |
| 51 | Enter an empty container (no child graph yet) | Child graph is auto-created; canvas shows empty graph |
| 52 | Verify progress ring on a container with 2/4 subtasks done | Progress ring shows "50%" |
| 53 | Complete all subtasks in a container | Progress ring shows "100%" |

### Execution Mode

| # | Test Step | Expected Result |
|---|-----------|-----------------|
| 54 | Toggle execution mode ON | Actionable nodes glow amber with "Next" badge; blocked/done nodes are dimmed and blurred |
| 55 | Toggle execution mode OFF | All nodes return to normal appearance |
| 56 | In execution mode, complete an actionable node | The next unblocked node becomes highlighted |

### Undo / Redo

| # | Test Step | Expected Result |
|---|-----------|-----------------|
| 57 | Create a node, then press Ctrl+Z | Node is removed (undo) |
| 58 | Press Ctrl+Shift+Z after undo | Node reappears (redo) |
| 59 | Tap Undo button in TopBar (touch) | Last action is undone |
| 60 | Undo button disabled when no history | Button is grayed out, not clickable |

### View Mode Toggle

| # | Test Step | Expected Result |
|---|-----------|-----------------|
| 61 | Click "List" view mode toggle | Interface switches to list view showing tasks and containers |
| 62 | Click "Graph" view mode toggle | Interface switches back to canvas view |
| 63 | Add a task in list view, switch to graph view | Task appears on the canvas (verify position is reasonable) |
| 64 | Change a task status in list view, switch to graph view | Status change is reflected on the canvas node |

### Sidebar and Projects

| # | Test Step | Expected Result |
|---|-----------|-----------------|
| 65 | Click a project name in the sidebar | Project loads, canvas shows its root graph |
| 66 | Click the "+" button next to "Projects" header | Inline input appears for project name |
| 67 | Type a name and submit (Enter) | New project is created and loaded |
| 68 | Press Escape during project creation | Input closes, no project created |
| 69 | Click the gear icon in sidebar header | Settings panel appears with Gemini API key input |
| 70 | Click "Back to projects" in settings | Returns to project list |

### Persistence

| # | Test Step | Expected Result |
|---|-----------|-----------------|
| 71 | Create nodes and edges, refresh the page | All data persists exactly as left |
| 72 | Change node positions, refresh the page | Positions are preserved |
| 73 | Switch projects, refresh the page | Active project selection persists |
| 74 | Enter a subgraph, refresh the page | Navigation state (breadcrumb depth) persists |

### Settings / Gemini Integration

| # | Test Step | Expected Result |
|---|-----------|-----------------|
| 75 | Paste a valid Gemini API key and click "Save Key" | Toast shows "Gemini API key saved." Status dot turns green. |
| 76 | Click "Remove" on a saved key | Key is cleared, toast shows "API key removed." |
| 77 | With a key configured, verify sparkle icon on container nodes | Sparkle button visible on containers in both graph and list view |
| 78 | Click sparkle on a container | Loading spinner appears; after completion, subgraph is generated and navigated into |

### Edge Cases

| # | Test Step | Expected Result |
|---|-----------|-----------------|
| 79 | Create 20+ nodes on a single graph | Canvas remains responsive during pan/zoom |
| 80 | Drag two nodes to overlap | Both nodes remain selectable and interactive |
| 81 | Rapidly create 5 nodes in quick succession | All 5 nodes are created without errors |
| 82 | Create a deeply nested subgraph (3+ levels) | Breadcrumb navigation works correctly at all levels |
| 83 | Use the app with browser DevTools mobile emulation (iPhone SE) | All touch features work, layout doesn't break |
| 84 | Click "Regenerate Data" | Workspace resets to demo data (NEEDS CONFIRMATION DIALOG) |
| 85 | With Supabase connection lost, make changes | Changes persist to localStorage; no error spam |

---

## Part 6 — Final UX Summary

### Is the current UI fundamentally sound?

**Yes.** The core concept — spatial task management with nested subgraphs — is well-executed. The data model is clean, the ReactFlow integration works, and the mobile adaptations show thoughtful engineering. The dual graph/list view provides flexibility. The execution mode is a genuinely useful feature for identifying actionable work.

### What are the biggest usability risks?

1. **Discoverability gap** — Critical features (title editing, container creation, node connection) rely on non-obvious gestures (double-click, right-click, handle drag). New users will not discover these without guidance.
2. **Destructive actions without safety nets** — "Regenerate Data" can wipe all work with one click. No save indicator means users don't trust persistence.
3. **Mobile toolbar overflow** — The TopBar is the primary control surface, and it breaks on small screens, making the app partially unusable on mobile.

### Top 3 changes that would most improve the product

1. **Add onboarding + edit affordances** — Show tooltips for first-time users. Add visible edit icons on node hover (desktop) and always on touch. Add a pencil cursor on title hover. This single change would make the app dramatically more approachable.

2. **Add confirmation dialogs for destructive actions + save indicator** — Protect "Regenerate Data" behind a confirmation modal. Add a subtle "Saved" indicator in the TopBar. These changes build user trust that their work is safe.

3. **Fix mobile TopBar overflow + add MiniMap** — Restructure the toolbar with an overflow menu for secondary actions. Add ReactFlow's `<MiniMap>` to solve spatial orientation. These changes make the app reliably usable across all screen sizes and graph complexities.
