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
