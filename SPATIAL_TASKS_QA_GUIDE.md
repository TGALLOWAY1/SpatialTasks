# Spatial Tasks — User Verification and QA Testing Guide

> Generated from codebase analysis on 2026-03-27. Based on actual source code, not a generic template.

---

## 1. Product Understanding

### What Spatial Tasks Is

Spatial Tasks is a **canvas-based task management application** that lets users organize tasks as nodes on a 2D graph. Unlike traditional list-based task managers, it emphasizes spatial relationships — users can position, connect, and group tasks visually on an infinite canvas.

### Architecture Summary

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript, built with Vite |
| Canvas | ReactFlow 11 (nodes, edges, pan, zoom, drag-and-drop) |
| State Management | Zustand with Zundo middleware (undo/redo, 50-state history) |
| Persistence | localStorage (instant) + Supabase PostgreSQL (debounced 2s sync) |
| Authentication | Supabase Auth (email/password) |
| AI Features | Gemini 2.5 Flash API (flow generation, task decomposition) |
| Styling | Tailwind CSS with custom `touch` media breakpoint |
| Deployment | Vercel (SPA rewrite) |

### Key Concepts

- **Workspace**: The root data object containing all projects, graphs, and settings for a user.
- **Project**: A named collection of graphs. Each project has a root graph.
- **Graph**: A canvas containing nodes (tasks) and edges (connections). Graphs can be nested — container nodes link to child graphs.
- **Node**: Either an **action** (a leaf task with status: todo/in_progress/done) or a **container** (a folder that holds a child graph).
- **Edge**: A directed connection between two nodes (dependency/flow).
- **Navigation Stack**: An in-memory breadcrumb stack for drilling into nested container graphs.
- **Execution Mode**: A guided walkthrough mode that highlights the next actionable task.

### View Modes

1. **Graph View** (default) — Interactive ReactFlow canvas with nodes, edges, pan/zoom.
2. **List View** — Hierarchical table with topological sorting and dependency nesting.
3. **Execution Mode** — Overlay on graph view with a step-detail panel, focusing on one task at a time.

### Data Flow

```
User Action → Zustand Store Mutation → localStorage (immediate)
                                     → Supabase (debounced 2s)
                                     → React re-render (subscriptions)
```

### What's NOT in the App

- No URL-based routing (single page, in-memory nav stack)
- No real-time collaboration / multi-user
- No offline mode indicator (relies on Supabase being reachable)
- No search or filter functionality
- No drag-and-drop between projects
- No export functionality (beyond JSON import)
- No test coverage (Playwright installed but zero tests)

---

## 2. Core User Flows to Verify

### Flow 1: Authentication

**What the user is doing**: Signing up, logging in, or resetting password.

**Happy path**:
1. User opens app → sees AuthScreen (login/signup tabs)
2. Signs up with email/password → account created → workspace initialized
3. On subsequent visits, session persists → goes straight to canvas

**What could go wrong**:
- Sign-up with existing email shows unhelpful error
- Session expiry leaves user on a blank screen instead of redirecting to login
- Password reset email link doesn't work or token expires silently
- `VITE_SKIP_AUTH=true` accidentally left on in production

**Why it matters**: Gate to the entire app. Broken auth = zero users.

---

### Flow 2: First-Use Experience (Empty Board)

**What the user is doing**: Seeing the app for the first time after login.

**Happy path**:
1. New user logs in → empty canvas with helpful empty state
2. Empty state shows: "Double-click to add a task" (desktop) / "Tap the + button" (mobile)
3. CTA button: "Generate Flow with AI"
4. User creates first task or generates a flow

**What could go wrong**:
- Empty state message not visible (canvas viewport off-center)
- Default workspace generation fails silently
- First-time localStorage → Supabase merge corrupts data
- "Generate Flow with AI" fails without API key and doesn't explain why

**Why it matters**: First impression determines if user continues.

---

### Flow 3: Creating a Task/Node

**What the user is doing**: Adding a new task to the canvas.

**Happy path (desktop)**:
1. Double-click on empty canvas area → quick-add dialog appears at click position
2. Type task title → press Enter
3. New action node appears at the clicked position

**Happy path (mobile)**:
1. Tap FloatingActionButton (+) → bottom sheet input appears
2. Type task title → tap Add
3. New node appears on canvas

**What could go wrong**:
- Double-click position doesn't match where node appears (coordinate transform bug at high zoom)
- Quick-add dialog opens behind an existing node
- Empty title creates an unnamed node
- Node appears off-screen if viewport is zoomed/panned far

**Why it matters**: Most frequent action in the app.

---

### Flow 4: Editing a Task

**What the user is doing**: Changing a task's title, status, or notes.

**Happy path**:
1. Double-click node → inline textarea activates → edit title → click away to save
2. Click status icon → cycles: todo → in_progress → done
3. Click notes button → NotesEditor opens → type notes → save

**What could go wrong**:
- Double-click triggers both inline edit AND canvas zoom (event propagation)
- Inline edit loses focus unexpectedly, discarding changes
- Status cycle doesn't persist after refresh
- Notes editor on mobile covers the node being edited
- Pressing Enter in notes saves instead of creating a newline

**Why it matters**: Core task management interaction.

---

### Flow 5: Dragging and Repositioning Nodes

**What the user is doing**: Moving tasks around the canvas to organize spatially.

**Happy path**:
1. Click and hold node → drag to new position → release
2. Position updates in store via `batchUpdatePositions`
3. Position persists after refresh

**What could go wrong**:
- Drag feels laggy with many nodes (performance)
- Node snaps back to old position (failed position save)
- Dragging disabled unexpectedly (connect mode stuck active)
- Touch drag conflicts with canvas pan
- Position doesn't persist to Supabase (debounce window + close tab)

**Why it matters**: Spatial positioning is the core differentiator of this app.

---

### Flow 6: Connecting Nodes (Edge Creation)

**What the user is doing**: Creating dependency/flow links between tasks.

**Happy path (desktop)**:
1. Drag from source handle to target handle → edge appears
2. OR: Enable connect mode → click source → click target → edge created

**Happy path (mobile/connect mode)**:
1. Tap connect mode toggle in TopBar
2. Tap source node → instruction banner updates to "Now tap target"
3. Tap target node → edge created → connect mode exits

**What could go wrong**:
- Self-connection allowed (source = target)
- Duplicate edges created between same pair
- Connect mode doesn't exit after creating edge
- Connect mode disables drag but user doesn't realize why dragging stopped working
- Edge renders on wrong nodes after deletion/recreation

**Why it matters**: Connections define task dependencies and blocking logic.

---

### Flow 7: Navigating Nested Graphs (Container Drill-Down)

**What the user is doing**: Entering a container node to see its child graph.

**Happy path**:
1. Click "Enter" button on container node → pushes to navStack
2. Breadcrumbs in TopBar update with new level
3. Child graph loads with its own nodes/edges
4. Click breadcrumb or swipe back → returns to parent graph

**What could go wrong**:
- NavStack gets corrupted — breadcrumbs show wrong labels
- Viewport doesn't restore when navigating back
- Swipe-back gesture triggers unintentionally during canvas pan
- Deeply nested graphs (5+ levels) cause performance issues
- Deleting a container from parent view orphans its child graph

**Why it matters**: Hierarchical organization is a key feature for complex projects.

---

### Flow 8: Deleting Tasks

**What the user is doing**: Removing nodes from the canvas.

**Happy path**:
1. Select node → press Backspace/Delete → node removed
2. Right-click node → "Delete" from context menu → node removed
3. Deleting container → ConfirmModal warns about child content → confirm → removed

**What could go wrong**:
- Backspace deletes node while user is typing in an input field
- Container deletion doesn't clean up child graphs (orphaned data)
- Undo after deletion doesn't restore edges connected to the deleted node
- Multi-select delete partially fails — some nodes deleted, others not
- No undo available (undo history full at 50 states)

**Why it matters**: Destructive action — data loss risk.

---

### Flow 9: Undo/Redo

**What the user is doing**: Reverting or re-applying recent changes.

**Happy path**:
1. Ctrl+Z → undoes last action
2. Ctrl+Shift+Z → redoes undone action
3. Undo/redo buttons in TopBar (desktop)

**What could go wrong**:
- Undo reverts more than one action (batch operations counted as one)
- Undo after position drag reverts to wrong position
- Undo not available after page refresh (history is in-memory only)
- Undo conflicts with Supabase save — undone state gets saved to remote
- 50-state limit silently drops old history

**Why it matters**: Safety net for accidental changes.

---

### Flow 10: Pan and Zoom

**What the user is doing**: Navigating around the canvas.

**Happy path**:
1. Mouse drag on empty canvas → pans
2. Scroll wheel → zooms in/out
3. Pinch gesture on touch → zooms
4. Ctrl+Shift+F → fits all nodes in view
5. MiniMap shows current viewport position

**What could go wrong**:
- Zoom level makes nodes too small to interact with
- Pan + drag conflict on mobile (touching a node pans instead of moving it)
- Fit-view doesn't account for all nodes (empty graph edge case)
- Viewport position doesn't persist when switching between graphs
- MiniMap click doesn't navigate to the clicked area

**Why it matters**: Canvas navigation is used constantly.

---

### Flow 11: AI Flow Generation

**What the user is doing**: Using Gemini AI to auto-generate a task flow.

**Happy path**:
1. Click "Generate Flow" → GenerateFlowModal opens
2. Enter prompt + select complexity → submit
3. AI generates draft → DraftReviewPanel shows preview
4. Accept draft → new project created with nodes and edges

**What could go wrong**:
- No API key configured → unclear error
- API quota exceeded → user doesn't understand why it fails
- Generated JSON is malformed → parse error toast, no recovery
- Generated flow has unreasonable number of nodes → performance issue
- Draft acceptance creates project but graph is empty
- Network timeout with no retry

**Why it matters**: Key onboarding and power-user feature.

---

### Flow 12: Saving and Reloading

**What the user is doing**: Expecting their work to persist across sessions.

**Happy path**:
1. Make changes → SaveIndicator shows "Saving..." → "Saved"
2. Close tab → reopen → all data restored from Supabase
3. Clear browser data → re-login → data restored from Supabase

**What could go wrong**:
- Close tab during 2s debounce window → last changes lost
- Supabase down → saves fail silently, user thinks data is saved
- localStorage and Supabase diverge → stale data loaded on next session
- Large workspace exceeds Supabase row size limit
- beforeunload warning doesn't trigger in all browsers

**Why it matters**: Data loss is the worst possible user experience.

---

### Flow 13: Project Management

**What the user is doing**: Creating, switching, renaming, or deleting projects.

**Happy path**:
1. Click "+" in sidebar → new project created → canvas switches to it
2. Double-click project name → inline rename → click away to save
3. Click project in sidebar → switches to that project's root graph
4. Delete project → confirm → project removed

**What could go wrong**:
- Deleting last project blocked but error message unclear
- Switching projects doesn't save current graph viewport
- New project has same default name as existing one (no uniqueness check)
- Rapid project switching causes race condition in save pipeline

**Why it matters**: Multi-project management is a core organizational feature.

---

### Flow 14: View Mode Switching (Graph ↔ List)

**What the user is doing**: Toggling between canvas and list views.

**Happy path**:
1. Click list icon in TopBar → switches to ListView
2. Changes made in list view reflect in graph view and vice versa
3. Status changes, node additions all consistent across views

**What could go wrong**:
- Node created in list view appears at (0,0) on canvas (no position context)
- Status change in list view doesn't update graph node color
- List view sorting doesn't match visual graph layout
- View toggle hidden on small screens — user can't switch back

**Why it matters**: Consistency between views prevents confusion and data issues.

---

### Flow 15: Mobile Touch Interactions

**What the user is doing**: Using the app on a phone or tablet.

**Happy path**:
1. Tap FAB → create task via bottom sheet
2. Tap node → select it
3. Long-press node → action sheet with edit/delete/connect options
4. Pinch to zoom, drag to pan
5. Swipe from left edge → navigate back in breadcrumbs

**What could go wrong**:
- Long-press (500ms) conflicts with scroll/pan intent
- FAB covers an important node in the corner
- Bottom sheet keyboard pushes content off screen
- Action sheet items too small on small phones
- Swipe-back triggers when user is just panning left
- iOS safe area cuts off bottom controls

**Why it matters**: Mobile usability determines if the app works outside a desktop.

---

## 3. Manual QA Test Plan

> 90 test cases organized by feature area. Priority levels: P0 (Critical), P1 (High), P2 (Medium).

### Group A: Canvas & Nodes (35 cases)

| Test ID | Area | Scenario | Preconditions | Steps | Expected Result | Watch For | Priority |
|---------|------|----------|---------------|-------|----------------|-----------|----------|
| QA-A001 | Task Creation | Create task via double-click on empty canvas | Canvas is open with no nodes | 1. Double-click on an empty area of the canvas | Quick-add dialog appears at the click position with title input focused | Dialog should appear at the correct position (screen→flow coordinate conversion), not offset or clipped by viewport edges | P0 |
| QA-A002 | Task Creation | Submit quick-add dialog with valid title | Quick-add dialog is open | 1. Type "Buy groceries" in the title field 2. Press Enter | A new ActionNode appears at the double-click position with title "Buy groceries" and status "todo" | Node should not appear at (0,0) or a default position; it must match the original click location | P0 |
| QA-A003 | Task Creation | Dismiss quick-add dialog without creating task | Quick-add dialog is open | 1. Press Escape or click outside the dialog | Dialog closes, no new node is created on the canvas | No phantom/empty nodes left behind on canvas | P1 |
| QA-A004 | Task Creation | Submit quick-add dialog with empty title | Quick-add dialog is open | 1. Leave title field blank 2. Press Enter | Dialog either prevents submission or closes without creating a node; no empty-titled node appears | Check that no invisible or zero-width node is rendered on canvas | P1 |
| QA-A005 | Task Creation | Double-click to create at extreme zoom out | Canvas is zoomed out to minimum level | 1. Zoom out to the minimum allowed level 2. Double-click on an empty area 3. Type a title and press Enter | Quick-add dialog appears correctly; node is placed at the correct flow coordinates despite the zoom level | Coordinate conversion accuracy at extreme zoom; dialog not rendered off-screen | P2 |
| QA-A006 | Task Creation | Double-click to create at extreme zoom in | Canvas is zoomed in to maximum level | 1. Zoom in to the maximum allowed level 2. Double-click on an empty area 3. Type a title and press Enter | Quick-add dialog appears correctly; node is placed at the correct flow coordinates | Dialog should not overflow viewport; node placement should be precise | P2 |
| QA-A007 | Task Creation | Rapid double-clicks on canvas | Canvas is open | 1. Double-click on canvas rapidly 3+ times in different spots within 1 second | Only one quick-add dialog opens; no duplicate dialogs or duplicate nodes created | Race conditions causing multiple dialogs or ghost nodes | P1 |
| QA-A008 | Task Creation | Create task via FloatingActionButton on mobile | App is open on a mobile/touch device | 1. Tap the FloatingActionButton 2. Enter "Mobile task" in the bottom-sheet input 3. Submit | A new node is created on the canvas with title "Mobile task"; bottom sheet dismisses | Bottom sheet should be fully visible above the keyboard; node placement should be in a sensible viewport-centered location | P0 |
| QA-A009 | Task Creation | Persist new task across refresh | A task was just created on canvas | 1. Create a new task "Persist me" 2. Refresh the browser page | After reload, the node "Persist me" appears at the same position with status "todo" | Position, title, and status must all be preserved; no data loss | P0 |
| QA-A010 | Task Editing | Inline title edit via double-click on node | At least one ActionNode exists on canvas | 1. Double-click the node title text | Title becomes an editable inline text field with current text selected or cursor placed | Should not trigger canvas double-click (quick-add dialog); event propagation must be stopped | P0 |
| QA-A011 | Task Editing | Save inline title edit | Node title is in inline-edit mode | 1. Clear the existing title 2. Type "Updated title" 3. Press Enter or click outside the node | Title updates to "Updated title" and inline edit mode exits | Title should persist without needing an explicit save action | P0 |
| QA-A012 | Task Editing | Cancel inline title edit with Escape | Node title is in inline-edit mode | 1. Modify the title text 2. Press Escape | Inline edit mode exits; title reverts to the original value before editing began | No partial save; original title is fully restored | P1 |
| QA-A013 | Task Editing | Set inline title to empty string | Node title is in inline-edit mode | 1. Clear all text from the title field 2. Press Enter | Either the edit is rejected and the original title is restored, or a sensible default/placeholder is used; no invisible node | Node should remain selectable and visible even if empty title is somehow allowed | P1 |
| QA-A014 | Task Editing | Cycle status todo → in_progress → done | An ActionNode exists with status "todo" | 1. Click the status indicator/button on the node | Status changes to "in_progress" with corresponding visual update (color/icon change) | Transition should be visually immediate; no flicker | P0 |
| QA-A015 | Task Editing | Cycle status in_progress → done | An ActionNode exists with status "in_progress" | 1. Click the status indicator/button on the node | Status changes to "done" with corresponding visual update (e.g., checkmark, strikethrough, or green indicator) | Visual styling for "done" state should be clearly distinguishable | P0 |
| QA-A016 | Task Editing | Cycle status done → todo (wrap around) | An ActionNode exists with status "done" | 1. Click the status indicator/button on the node | Status cycles back to "todo" with the original default visual styling | Full cycle completes cleanly without stuck states | P0 |
| QA-A017 | Task Editing | Status cycling triggers vibration on touch device | Mobile/touch device with an ActionNode on canvas | 1. Tap the status indicator on a node | Status cycles and the device produces haptic/vibration feedback | Vibration should be brief and not fire multiple times; verify navigator.vibrate is called | P1 |
| QA-A018 | Task Editing | Open and edit notes via NotesEditor | An ActionNode exists on canvas | 1. Click the notes button on the node | NotesEditor popover/modal opens 2. Type "Some detailed notes" 3. Close the editor | Notes are saved and associated with the node; reopening shows "Some detailed notes" | Editor should not occlude the node entirely; notes persist after closing | P1 |
| QA-A019 | Task Editing | Notes persist across refresh | A node has notes saved via NotesEditor | 1. Refresh the browser page 2. Open the notes editor on the same node | Previously saved notes content is displayed | No data loss on reload; content formatting preserved | P1 |
| QA-A020 | Drag & Reposition | Drag a single node to a new position | At least one ActionNode on canvas | 1. Click and hold the node 2. Drag it to a new position on the canvas 3. Release | Node moves smoothly to the new position and stays there | No snapping to wrong grid, no visual jitter during drag | P0 |
| QA-A021 | Drag & Reposition | Dragged position persists after refresh | A node was just dragged to a new position | 1. Drag a node to a clearly different position 2. Note the position 3. Refresh the page | Node reappears at the dragged position, not the original position | batchUpdatePositions() must have fired and persisted successfully | P0 |
| QA-A022 | Drag & Reposition | Drag is disabled in connect mode | Connect mode is active on the canvas | 1. Activate connect mode 2. Attempt to click and drag a node | Node does not move; instead, a connection handle/edge interaction begins or nothing happens | Node should not change position at all while connect mode is enabled | P1 |
| QA-A023 | Node Resize | Resize node by dragging right edge | An ActionNode exists on canvas | 1. Hover over the right edge of the node until a resize cursor appears 2. Click and drag the right edge outward 3. Release | Node width increases; content reflows within the new width | Resize handle should be visually discoverable (cursor change); minimum width should be enforced | P1 |
| QA-A024 | Node Resize | Resize node to minimum width | An ActionNode exists on canvas | 1. Drag the right edge of the node inward as far as possible | Node stops shrinking at a minimum width; title text truncates or wraps gracefully | Node should not collapse to zero width or become unusable; buttons/status should remain accessible | P2 |
| QA-A025 | Node Deletion | Delete single node with Backspace/Delete key | A single ActionNode is selected | 1. Click to select the node 2. Press Backspace or Delete key | Node is removed from the canvas | No error thrown; undo capability if supported; canvas does not scroll unexpectedly | P0 |
| QA-A026 | Node Deletion | Delete single node via context menu | An ActionNode exists on canvas | 1. Right-click the node 2. Select "Delete" from the context menu | Node is removed from the canvas | Context menu appears at cursor position; menu dismisses after action | P1 |
| QA-A027 | Node Deletion | Multi-select and delete multiple nodes | At least 3 ActionNodes exist on canvas | 1. Enter select mode 2. Select 3 nodes by clicking each 3. Press Delete/Backspace | All 3 selected nodes are removed from the canvas simultaneously | Partial deletion should not occur; either all are removed or none (if error) | P0 |
| QA-A028 | Node Deletion | Delete container node shows confirmation modal | A ContainerNode with child tasks exists | 1. Select the ContainerNode 2. Press Delete | ConfirmModal appears warning about deleting the container and its contents | Modal should clearly state the consequence (child nodes will be deleted); cancel should abort deletion entirely | P0 |
| QA-A029 | Node Deletion | Confirm container node deletion | ConfirmModal is displayed for container deletion | 1. Click "Confirm" / "Delete" in the ConfirmModal | ContainerNode and all its child nodes are removed from the canvas | All child nodes must also be removed; no orphaned nodes left behind | P0 |
| QA-A030 | Node Deletion | Cancel container node deletion | ConfirmModal is displayed for container deletion | 1. Click "Cancel" in the ConfirmModal | Modal closes; ContainerNode and all children remain intact on canvas | No state changes; container and children fully intact | P1 |
| QA-A031 | Node Deletion | Deletion persists after refresh | A node was just deleted | 1. Delete a node 2. Refresh the page | Deleted node does not reappear | Store must flush deletion before page unload | P1 |
| QA-A032 | Selection | Single-click selects a node | Multiple nodes exist on canvas | 1. Click on a single node | The clicked node is selected (visual highlight/border); any previously selected node is deselected | Selection indicator should be clearly visible; only one node selected at a time in default mode | P0 |
| QA-A033 | Selection | Click empty canvas deselects all | One or more nodes are currently selected | 1. Click on an empty area of the canvas | All nodes are deselected; no selection indicators visible | Should not trigger quick-add dialog (single click, not double-click) | P1 |
| QA-A034 | Selection | Multi-select with select mode | At least 3 nodes exist on canvas; select mode is available | 1. Activate select mode (via toolbar or keyboard shortcut) 2. Click node A 3. Click node B 4. Click node C | All three nodes show selection indicators simultaneously | Clicking an already-selected node in select mode should deselect it (toggle behavior) | P0 |
| QA-A035 | Selection | Mobile multi-select via action sheet delete | Mobile device with multiple nodes | 1. Long-press a node to open action sheet 2. Select "Delete" from the action sheet | Node is deleted; action sheet dismisses | Long-press should not inadvertently start a drag; action sheet should be touch-friendly with adequate tap targets | P1 |
