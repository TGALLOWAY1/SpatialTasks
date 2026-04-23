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
3. **Focus View** — Single task at a time: hero image (top), scrollable notes (bottom), and a status pill that auto-advances to the next actionable task on completion. Shows a parallel chooser when more than one successor unblocks at once.
4. **Execution Mode** — Overlay on graph view with a step-detail panel, focusing on one task at a time.

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

### Flow 13b: Project Folders (Grouping)

**What the user is doing**: Organizing projects into folders (e.g. a "Music" folder) so the sidebar is browsable with many projects. Folders are flat (one level), live in the sidebar only, and never appear in the in-project breadcrumb.

**Happy path**:
1. Click the folder+ icon (next to the project+ icon) → inline folder-name input appears → type name, press Enter → folder appears below "Ungrouped" list.
2. Double-click a folder title → inline rename → Enter to save.
3. Click the chevron (or the folder title) → folder expands/collapses. State persists across reloads.
4. Desktop: drag a project row onto a folder header → purple drop-highlight while hovering → release → project nests inside. Drag a nested project back onto the "Ungrouped" section → returns to root.
5. Click the "+" button on a folder header → inline "New project" form opens inside that folder → newly created project inherits the folder.
6. Hover a folder, click trash:
   - Empty folder → single-button confirm modal.
   - Folder with projects → three-button modal: **Cancel** / **Keep projects** (moves them to Ungrouped) / **Delete projects too** (cascades deletion).
7. Mobile: drag disabled. Tap the "⋯" button on a project row → action sheet with **Rename**, **Move to folder…**, **Delete**. Picking "Move to folder…" lists Ungrouped, each folder, and a "New folder…" shortcut.
8. Cmd/Ctrl+Z undoes folder create, rename, move, and delete.

**What could go wrong**:
- Legacy (v1) workspace without a `folders` array breaks on load — migration must inject `folders: []` so the UI renders normally.
- "Delete projects too" on a folder that contains every project in the workspace — must be blocked with a toast, never auto-create a replacement blank.
- Active project is inside the deleted folder — active selection must fall back to first remaining project (same behavior as single-project delete).
- Drop event fires twice (nested drop targets) — project ends up in the wrong folder.
- Touch long-press triggers native browser drag or context menu instead of the action sheet.
- Collapse state lost on reload (means persistence wasn't wired through).
- Supabase sync: folder created on device A doesn't appear on device B after reload.

**Why it matters**: As users accumulate projects across life domains (music, work, hobbies), a flat list becomes unusable. This is the primary organizational affordance at the project level.

---

### Flow 14: View Mode Switching (Graph ↔ List ↔ Focus)

**What the user is doing**: Toggling between canvas, list, and focus views.

**Happy path**:
1. Click list icon in TopBar → switches to ListView
2. Click crosshair icon in TopBar → switches to FocusView
3. Changes made in any view reflect in the others
4. Status changes, node additions all consistent across views

**What could go wrong**:
- Node created in list view appears at (0,0) on canvas (no position context)
- Status change in list view doesn't update graph node color
- List view sorting doesn't match visual graph layout
- View toggle hidden on small screens — user can't switch back (overflow menu must include all three)
- Focus view loses its current task when switching away and back (transient state, expected to reset on reload but persist within session)

**Why it matters**: Consistency between views prevents confusion and data issues.

---

### Flow 15: Focus View — Working Through Tasks One-at-a-Time

**What the user is doing**: Picking up an established plan and grinding through tasks with full image + notes context, the way they would on a phone away from the canvas.

**Happy path**:
1. From an existing project (with tasks containing images and notes), tap the Crosshair icon in TopBar → FocusView opens on the first actionable task
2. Hero image renders in the top half (or notes fill the screen if no image)
3. Notes scroll independently if they're long
4. Tap status pill once → status cycles to In progress
5. Tap status pill again → status flips to Done; after a brief check-mark animation (~450ms) the next actionable task loads automatically
6. If the just-completed task unblocks two parallel successors, the ParallelChooser screen appears; tap one to continue
7. Tap Edit → modal opens with editable Notes textarea + Visual References grid (upload/remove images); Save persists changes
8. Tap Skip (→) → advance without changing status
9. Tap Prev (←) → return to the task you just left (in case Done was a misclick)
10. After completing every task, an "All tasks complete" celebration screen offers Back to list view / node view

**Containers**: Container nodes are never shown directly in focus view — their actionable leaf children are surfaced transparently, with a small breadcrumb (e.g. "Onboarding › Setup auth") above the title.

**Desktop keyboard shortcuts**: Space/Enter = cycle status, → = skip, ← = prev, Esc = exit to list view.

**What could go wrong**:
- Auto-advance fires too fast and the user can't visually confirm completion
- Skip/Prev buttons disabled when they shouldn't be (or enabled when no targets exist)
- ParallelChooser doesn't appear when expected (e.g. the next task is still blocked by another predecessor)
- Image carousel pagination dots / swipe broken on multi-image tasks
- Edit modal doesn't save changes back to the node
- Status pill doesn't visually reflect the in_progress / done states across cycles
- "All tasks complete" screen shown even when there are still unblocked tasks elsewhere in the project (regression in `getActionableLeafTasks`)
- View toggle missing from mobile overflow menu

**Why it matters**: Focus view is the intended on-the-go consumption surface. Notes and images are useless if buried; getting this flow smooth is what makes the app worth carrying around.

---

### Flow 16: Mobile Touch Interactions

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

### Flow 17: Auto-Organize Canvas

**What the user is doing**: Cleaning up a messy board with the Auto-Organize feature.

**Happy path**:
1. User opens a graph whose nodes overlap or are scattered.
2. Clicks the ✨ wand button in the top bar → popover lists four strategies (Cluster / Grid / Hierarchy / Flow) with short descriptions.
3. Picks **Cluster** (default). Nodes animate (~450ms ease-out) into grouped clusters: connected components sit together, same-color/tag nodes adjacent inside each cluster.
4. Presses **Ctrl+Z** once → exact prior positions restored (single undo step).
5. Right-clicks the canvas pane → "Auto-Organize ▸" submenu offers the same four strategies.
6. Selects a subset of nodes, opens the wand popover, ticks "Apply to selection only" → only the selected nodes move; the rest stay put.
7. On touch: opens the TopBar overflow menu → "Auto-Organize" section lists the four strategies as buttons.
8. Re-opening the popover highlights the last-used strategy as "Last used" (persisted in `settings.preferredLayoutStrategy`).

**What could go wrong**:
- Animation janks on graphs with many nodes (>200) or during concurrent drag.
- Layout produces residual overlaps (the sweep-line resolver should catch these).
- Strategy falls back silently on cyclic edges (Hierarchy/Flow → Grid) — make sure result is still laid out cleanly.
- Selection-only run moves unselected nodes (bug in sentinel handling).
- Undo fails to restore exact pre-organize positions (batchUpdatePositions commit order issue).
- Cluster layout with no edges doesn't group by color/tag.
- Popover stays open after applying a layout, or doesn't close on outside click.
- Preferred strategy not persisted after reload.

**Why it matters**: Core "spatial thinking" product promise — the canvas has to feel organized without destroying the user's mental map. Undo has to be bulletproof since users will experiment.

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
| QA-A009a | Task Creation | Create task via N shortcut enters edit mode | Canvas is focused, no text field active | 1. Press the N key | A new ActionNode appears at viewport center and immediately enters edit mode with title text "New Task" fully selected | User should be able to start typing a replacement name immediately without additional clicks | P0 |
| QA-A009b | Task Creation | Create container via G shortcut enters edit mode | Canvas is focused, no text field active | 1. Press the G key | A new ContainerNode appears at viewport center and immediately enters edit mode with title text "New Group" fully selected | User should be able to start typing a replacement name immediately without additional clicks | P0 |
| QA-A009c | Task Creation | Create task via context menu enters edit mode | Canvas is open | 1. Right-click on empty canvas 2. Select "New Action Node" | A new ActionNode appears at the right-click position and immediately enters edit mode with title text fully selected | Same fluid creation experience as keyboard shortcuts | P1 |
| QA-A009d | Task Creation | Create container via context menu enters edit mode | Canvas is open | 1. Right-click on empty canvas 2. Select "New Container" | A new ContainerNode appears at the right-click position and immediately enters edit mode with title text fully selected | Same fluid creation experience as keyboard shortcuts | P1 |
| QA-A010 | Task Editing | Inline title edit via double-click on node | At least one ActionNode exists on canvas | 1. Double-click the node title text | Title becomes an editable inline text field with current text selected | Should not trigger canvas double-click (quick-add dialog); event propagation must be stopped | P0 |
| QA-A010a | Task Editing | Single-click on unselected node does not enter edit mode | At least one unselected ActionNode exists | 1. Click on the title text of an unselected node | Node becomes selected but does NOT enter edit mode | First click should only select, matching OS file-manager rename behavior | P0 |
| QA-A010b | Task Editing | Single-click on already-selected node title enters edit mode | An ActionNode is already selected | 1. Click on the title text of the selected node | Title enters edit mode with text fully selected | Mimics file-rename behavior: first click selects, second click on name opens editing | P0 |
| QA-A010c | Task Editing | Text is fully selected when entering edit mode | An ActionNode is on canvas | 1. Double-click the node title text | Title enters edit mode with ALL text selected so typing immediately replaces it | User should not need to manually select-all or delete existing text | P1 |
| QA-A011 | Task Editing | Save inline title edit | Node title is in inline-edit mode | 1. Clear the existing title 2. Type "Updated title" 3. Press Enter or click outside the node | Title updates to "Updated title" and inline edit mode exits | Title should persist without needing an explicit save action | P0 |
| QA-A012 | Task Editing | Cancel inline title edit with Escape | Node title is in inline-edit mode | 1. Modify the title text 2. Press Escape | Inline edit mode exits; title reverts to the original value before editing began; node remains selected | No partial save; original title is fully restored; Escape does NOT also deselect the node (layered Escape) | P1 |
| QA-A013 | Task Editing | Set inline title to empty string | Node title is in inline-edit mode | 1. Clear all text from the title field 2. Press Enter | Either the edit is rejected and the original title is restored, or a sensible default/placeholder is used; no invisible node | Node should remain selectable and visible even if empty title is somehow allowed | P1 |
| QA-A014 | Task Editing | Cycle status todo → in_progress → done | An ActionNode exists with status "todo" | 1. Click the status indicator/button on the node | Status changes to "in_progress" with corresponding visual update (color/icon change) | Transition should be visually immediate; no flicker | P0 |
| QA-A015 | Task Editing | Cycle status in_progress → done | An ActionNode exists with status "in_progress" | 1. Click the status indicator/button on the node | Status changes to "done" with corresponding visual update (e.g., checkmark, strikethrough, or green indicator) | Visual styling for "done" state should be clearly distinguishable | P0 |
| QA-A016 | Task Editing | Cycle status done → todo (wrap around) | An ActionNode exists with status "done" | 1. Click the status indicator/button on the node | Status cycles back to "todo" with the original default visual styling | Full cycle completes cleanly without stuck states | P0 |
| QA-A017 | Task Editing | Status cycling triggers vibration on touch device | Mobile/touch device with an ActionNode on canvas | 1. Tap the status indicator on a node | Status cycles and the device produces haptic/vibration feedback | Vibration should be brief and not fire multiple times; verify navigator.vibrate is called | P1 |
| QA-A018 | Task Editing | Open and edit notes via NotesEditor | An ActionNode exists on canvas | 1. Click the notes button on the node | NotesEditor popover/modal opens 2. Type "Some detailed notes" 3. Close the editor | Notes are saved and associated with the node; reopening shows "Some detailed notes" | Editor should not occlude the node entirely; notes persist after closing | P1 |
| QA-A019 | Task Editing | Notes persist across refresh | A node has notes saved via NotesEditor | 1. Refresh the browser page 2. Open the notes editor on the same node | Previously saved notes content is displayed | No data loss on reload; content formatting preserved | P1 |
| QA-A019a | Visual References | Open Visual References panel on an ActionNode | A selected ActionNode with no images | 1. Click the Image (bottom-left) button on the selected node | The "Visual References" panel expands inline inside the node body showing an empty-state message and an "Upload an image" button | Button color is slate (empty state); panel is visible within the node and does not get clipped | P1 |
| QA-A019b | Visual References | Upload a single image | Visual References panel open, Add button visible | 1. Click "Add" 2. Pick one PNG/JPEG under 5 MB | Thumbnail appears in a 3-column grid; Image button on the node turns blue; count indicator reflects 1 | Only the selected image is added; duplicate-selection of the same file still works (input value is reset) | P1 |
| QA-A019c | Visual References | Upload multiple images in one pick | Visual References panel open | 1. Click "Add" 2. Select 3 valid images in the file dialog | All 3 thumbnails appear in the grid in the chosen order | No race condition; `addedAt` ordering is stable; all three data URLs decode correctly | P1 |
| QA-A019d | Visual References | Reject oversized file | Visual References panel open | 1. Click "Add" 2. Select a PNG larger than 5 MB | File is not added; inline error shows "<name>: too large (N MB, max 5 MB)" | Other valid files in the same selection are still accepted | P1 |
| QA-A019e | Visual References | Reject unsupported file type | Visual References panel open | 1. Click "Add" 2. Select a .pdf (or use accept-override trick) | File is not added; inline error shows "<name>: unsupported type" | Accept attribute limits picker; runtime MIME check is still enforced | P2 |
| QA-A019f | Visual References | Open lightbox from a thumbnail | Visual References panel open with ≥1 image | 1. Click any thumbnail | Fullscreen lightbox overlay opens with the image scaled to fit (`object-contain`); backdrop darkens the canvas | Clicking the backdrop or pressing Escape closes the lightbox; arrow keys step through images when >1 | P1 |
| QA-A019g | Visual References | Lightbox keyboard navigation | Lightbox open with ≥2 images | 1. Press → then ← | The displayed image advances to the next, then returns to the previous; counter ("2 / 3") updates | Arrow keys do not also pan the canvas; Escape closes lightbox cleanly | P2 |
| QA-A019h | Visual References | Remove an image | Visual References panel open with ≥2 images | 1. Hover (or focus) a thumbnail 2. Click the trash icon that appears | The image is removed from the grid; remaining images stay; Image button count updates | Only the targeted image is removed; other images unaffected; undo (Ctrl+Z) restores the removed image | P1 |
| QA-A019i | Visual References | Panel open/closed state persists across refresh | A node where Visual References is explicitly open (or closed) and has ≥1 image | 1. Toggle panel to desired state 2. Wait for Save indicator to settle 3. Refresh the page | The Visual References panel returns in the exact state it was left (open or closed); images are intact | `meta.imagesOpen` is persisted; images render without re-upload | P0 |
| QA-A019j | Visual References | Images survive Supabase sync | Signed in with Supabase configured; image uploaded and SaveIndicator shows "Saved" | 1. Open the same workspace in a second browser/incognito window signed into the same account | Images appear on the same node with the same data | Base64 payload round-trips through Supabase JSONB without truncation | P2 |
| QA-A019k | Visual References | Read-only view when node deselected | Node with images; panel open | 1. Click the canvas to deselect the node | Thumbnails remain visible; "Add" button and per-thumbnail remove icons are hidden | The panel close (X) button remains available; clicking a thumbnail still opens the lightbox | P1 |
| QA-A019l | Visual References | Visual References on ContainerNode | A selected ContainerNode | 1. Click the Image button (bottom-left) 2. Upload an image | Panel renders with indigo accent matching the container's theme; image is attached to the container | Container's Magic Expand still sees `meta.notes` unchanged; image does not interfere with container progress or enter-subgraph | P2 |
| QA-A020 | Drag & Reposition | Drag a single node to a new position | At least one ActionNode on canvas | 1. Click and hold the node 2. Drag it to a new position on the canvas 3. Release | Node moves smoothly to the new position and stays there | No snapping to wrong grid, no visual jitter during drag | P0 |
| QA-A021 | Drag & Reposition | Dragged position persists after refresh | A node was just dragged to a new position | 1. Drag a node to a clearly different position 2. Note the position 3. Refresh the page | Node reappears at the dragged position, not the original position | batchUpdatePositions() must have fired and persisted successfully | P0 |
| QA-A022 | Drag & Reposition | Drag is disabled in connect mode | Connect mode is active on the canvas | 1. Activate connect mode 2. Attempt to click and drag a node | Node does not move; instead, a connection handle/edge interaction begins or nothing happens | Node should not change position at all while connect mode is enabled | P1 |
| QA-A023 | Node Resize | Resize node by dragging right edge | An ActionNode exists on canvas | 1. Hover over the right edge of the node until a resize cursor appears 2. Click and drag the right edge outward 3. Release | Node width increases; content reflows within the new width | Resize handle should be visually discoverable (cursor change); minimum width should be enforced | P1 |
| QA-A024 | Node Resize | Resize node to minimum width | An ActionNode exists on canvas | 1. Drag the right edge of the node inward as far as possible | Node stops shrinking at a minimum width; title text truncates or wraps gracefully | Node should not collapse to zero width or become unusable; buttons/status should remain accessible | P2 |
| QA-A025 | Node Deletion | Delete single node with Backspace/Delete key | A single ActionNode is selected | 1. Click to select the node 2. Press Backspace or Delete key | Node is removed from the canvas | No error thrown; undo capability if supported; canvas does not scroll unexpectedly | P0 |
| QA-A026 | Node Deletion | Delete single node via context menu | An ActionNode exists on canvas | 1. Right-click the node 2. Select "Delete" from the context menu | Node is removed from the canvas | Context menu appears at cursor position; menu dismisses after action | P1 |
| QA-A027 | Node Deletion | Multi-select and delete multiple nodes | At least 3 ActionNodes exist on canvas | 1. Enter select mode 2. Select 3 nodes by clicking each 3. Press Delete/Backspace | Confirmation dialog appears showing node count; confirming removes all 3 nodes simultaneously | Confirmation required for multi-node delete even without containers; partial deletion should not occur | P0 |
| QA-A028 | Node Deletion | Delete container node shows confirmation modal | A ContainerNode with child tasks exists | 1. Select the ContainerNode 2. Press Delete | ConfirmModal appears warning about deleting the container and its contents | Modal should clearly state the consequence (child nodes will be deleted); cancel should abort deletion entirely | P0 |
| QA-A029 | Node Deletion | Confirm container node deletion | ConfirmModal is displayed for container deletion | 1. Click "Confirm" / "Delete" in the ConfirmModal | ContainerNode and all its child nodes are removed from the canvas | All child nodes must also be removed; no orphaned nodes left behind | P0 |
| QA-A030 | Node Deletion | Cancel container node deletion | ConfirmModal is displayed for container deletion | 1. Click "Cancel" in the ConfirmModal | Modal closes; ContainerNode and all children remain intact on canvas | No state changes; container and children fully intact | P1 |
| QA-A031 | Node Deletion | Deletion persists after refresh | A node was just deleted | 1. Delete a node 2. Refresh the page | Deleted node does not reappear | Store must flush deletion before page unload | P1 |
| QA-A032 | Selection | Single-click selects a node | Multiple nodes exist on canvas | 1. Click on a single node | The clicked node is selected (visual highlight/border); any previously selected node is deselected | Selection indicator should be clearly visible; only one node selected at a time in default mode | P0 |
| QA-A033 | Selection | Click empty canvas deselects all | One or more nodes are currently selected | 1. Click on an empty area of the canvas | All nodes are deselected; no selection indicators visible | Should not trigger quick-add dialog (single click, not double-click) | P1 |
| QA-A034 | Selection | Multi-select with select mode | At least 3 nodes exist on canvas; select mode is available | 1. Activate select mode (via toolbar or keyboard shortcut) 2. Click node A 3. Click node B 4. Click node C | All three nodes show selection indicators simultaneously | Clicking an already-selected node in select mode should deselect it (toggle behavior) | P0 |
| QA-A035 | Selection | Mobile multi-select via action sheet delete | Mobile device with multiple nodes | 1. Long-press a node to open action sheet 2. Select "Delete" from the action sheet | Node is deleted; action sheet dismisses | Long-press should not inadvertently start a drag; action sheet should be touch-friendly with adequate tap targets | P1 |
| QA-A036 | Escape Key | Escape while editing exits only editing | Node title is in inline-edit mode | 1. Double-click a node title to enter edit mode 2. Press Escape | Edit mode exits, title reverts, but node remains selected | Escape must NOT also deselect the node or close other UI; only one layer dismissed per press | P0 |
| QA-A037 | Escape Key | Layered Escape dismisses context menu first | Context menu is open while nodes are selected | 1. Select a node 2. Right-click to open context menu 3. Press Escape | Context menu closes; node selection remains | A second Escape press should then deselect the node | P1 |
| QA-A038 | Escape Key | Layered Escape dismisses connect mode | Connect mode is active with nodes selected | 1. Select a node 2. Activate connect mode 3. Press Escape | Connect mode exits; node selection remains | A second Escape press should then deselect the node | P1 |
| QA-A039 | Status | Blocked node shows not-allowed cursor | An ActionNode is blocked by unsatisfied dependencies | 1. Hover over the status icon of a blocked node | Cursor changes to not-allowed; clicking does not cycle status | Cursor should clearly indicate the interaction is disabled | P1 |
| QA-A040 | Auto-Organize | Cluster layout from toolbar | A graph with 5+ nodes and at least 2 edges | 1. Drag nodes to overlap / scatter 2. Click the ✨ wand button in the top bar 3. Select "Cluster" | Nodes animate smoothly (~450ms) into grouped clusters; connected components sit together; no overlaps | Animation should not jank; final positions must have no AABB overlaps; popover closes after selection | P0 |
| QA-A041 | Auto-Organize | Grid layout produces aligned rows/columns | A graph with 6+ nodes | 1. Open ✨ Auto-Organize 2. Select "Grid" | Nodes animate into clean rows/columns with consistent spacing | Columns must be aligned; rows left-justified; no overlaps | P1 |
| QA-A042 | Auto-Organize | Hierarchy layout respects dependencies | A graph with a chain/tree of connected nodes | 1. Create a dependency chain A→B→C→D 2. Open ✨ Auto-Organize 3. Select "Hierarchy" | Nodes lay out top-to-bottom in dependency order: roots at top, leaves at bottom | Source nodes (no incoming edges) must be in the top layer; order within a layer should reduce edge crossings | P1 |
| QA-A043 | Auto-Organize | Flow layout is left-to-right | A graph with a dependency chain | 1. Open ✨ Auto-Organize 2. Select "Flow" | Nodes lay out left-to-right along dependencies; same-depth siblings stack vertically | Left column = sources; right column = sinks | P1 |
| QA-A044 | Auto-Organize | Undo restores exact prior positions | Any graph after running Auto-Organize | 1. Note positions of 2-3 nodes 2. Run any strategy 3. Press Ctrl+Z | All nodes return to their exact pre-organize positions | Must be a single undo step (not per-node); use zundo via batchUpdatePositions commit | P0 |
| QA-A045 | Auto-Organize | Cyclic edges fall back to Grid for Hierarchy/Flow | A graph with a cycle (A→B→C→A) | 1. Open ✨ Auto-Organize 2. Select "Hierarchy" (or "Flow") | Layout engine detects cycle and falls back to Grid; no crash, no infinite recursion | Cycle detection must not throw; all nodes still laid out cleanly | P1 |
| QA-A046 | Auto-Organize | Selection-only scope | A graph with 6+ nodes | 1. Select 3 nodes 2. Open ✨ Auto-Organize 3. Check "Apply to selection only" 4. Select "Grid" | Only the 3 selected nodes are repositioned; unselected nodes remain in place | Empty-array `nodeIds` sentinel in action resolves to current RF selection | P1 |
| QA-A047 | Auto-Organize | Context menu submenu | A graph with 2+ nodes | 1. Right-click on an empty area of the canvas 2. Hover "Auto-Organize ▸" | Submenu shows 4 strategies (Cluster / Grid / Hierarchy / Flow); selecting one triggers the same animated layout | Submenu positioning stays within viewport | P1 |
| QA-A048 | Auto-Organize | Preferred strategy persists across reload | Last used strategy was "Grid" | 1. Run Auto-Organize → Grid 2. Reload the page 3. Open ✨ Auto-Organize | "Grid" shows the "Last used" pill in the popover | Persisted via `settings.preferredLayoutStrategy` through localStorage + Supabase sync | P2 |
| QA-A049 | Auto-Organize | Mobile overflow menu entries | Touch device | 1. Open the top-bar overflow menu (⋮) 2. Scroll to "Auto-Organize" section | Four strategy buttons listed (Cluster / Grid / Hierarchy / Flow); tapping any one runs the layout and closes the menu | All buttons meet 44px min touch target | P2 |
| QA-A050 | Auto-Organize | Deterministic re-run | A graph with 10+ nodes | 1. Run Auto-Organize → Cluster 2. Undo 3. Run Auto-Organize → Cluster again | Second run produces identical positions to the first | `computeLayout` must be pure; seeded RNG and stable sort required | P2 |
| QA-A051 | Auto-Organize | No-op on empty or single-node graph | 0 or 1 nodes on the canvas | 1. Run any Auto-Organize strategy | No animation, no error, no state change | Must not throw or create a stray undo entry | P2 |

### Group B: Connections, Navigation & Views (34 cases)

| Test ID | Area | Scenario | Preconditions | Steps | Expected Result | Watch For | Priority |
|---------|------|----------|---------------|-------|----------------|-----------|----------|
| QA-B001 | Edge creation | Drag from source handle to target handle | Graph with at least 2 nodes visible | 1. Hover over source node to reveal handles. 2. Click and drag from a source handle (right side). 3. Drag to target handle (left side) of another node. 4. Release mouse. | A smoothstep edge appears connecting source to target. Edge is animated on desktop. Edge persists in state. | Handle highlight on hover; edge snaps to handle on release; no phantom edges left if dropping on empty canvas | P0 |
| QA-B002 | Edge creation | Connect mode via TopBar toggle (desktop) | Graph with at least 2 nodes | 1. Click the connect mode toggle in TopBar. 2. Click source node. 3. Click target node. | Connect mode activates (visual indicator in TopBar). After tapping source, it highlights as selected. After tapping target, a smoothstep animated edge is created between them. Node dragging is disabled while connect mode is on. | Source highlight clears after connection; connect mode remains active for additional connections; cursor style change | P0 |
| QA-B003 | Edge creation | Connect mode two-tap flow on mobile | Mobile device or emulator; graph with 2+ nodes | 1. Tap connect mode toggle in TopBar. 2. Tap source node. 3. Tap target node. | Edge created between source and target. Nodes cannot be dragged while connect mode is active. | Fat-finger tolerance; visual feedback on first tap; no accidental node moves | P0 |
| QA-B004 | Edge creation | Prevent self-connection | Graph with at least 1 node | 1. Drag from a node's source handle back to the same node's target handle. | No edge is created. No error shown to user but connection is silently rejected by addEdge. | No phantom edge left behind; no console errors | P1 |
| QA-B005 | Edge creation | Prevent duplicate edge | Graph with 2 nodes already connected by an edge | 1. Drag from the same source handle to the same target handle that already has a connection. | No second edge is created. The existing edge remains unchanged. | No visual glitch or doubled edges; addEdge dedup logic fires correctly | P1 |
| QA-B006 | Edge creation | Connect mode self-connection prevention | Connect mode active; graph with nodes | 1. Toggle connect mode on. 2. Tap a node as source. 3. Tap the same node as target. | No edge is created. Source selection resets or remains for a new target selection. | Clear feedback that self-connection was rejected | P1 |
| QA-B007 | Edge deletion | Delete edge via Backspace key | Graph with at least 1 edge | 1. Click on an edge to select it (edge highlights). 2. Press Backspace. | Edge is removed from the graph. Connected nodes remain. | Selection visual clears after deletion; undo support if implemented; no orphan references in state | P0 |
| QA-B008 | Edge deletion | Delete edge via context menu | Graph with at least 1 edge | 1. Right-click on an edge. 2. Select "Delete" from the context menu. | Edge is removed. Context menu closes. | Context menu positions correctly near the edge; menu dismisses on click-away without deleting | P0 |
| QA-B009 | Edge deletion | Delete edge on mobile (long-press context menu) | Mobile device; graph with edge | 1. Long-press on an edge. 2. Tap "Delete" from context menu. | Edge is deleted. | Long-press duration feels natural; no accidental pan during long-press; context menu positioned within viewport | P1 |
| QA-B010 | Nested navigation | Enter subgraph via ContainerNode | Graph containing a ContainerNode with children | 1. Click the enter-subgraph button on a ContainerNode. | View transitions into the subgraph. NavStack is pushed with new entry. Breadcrumbs in TopBar update to show parent > current path. Subgraph nodes and edges are displayed. | Transition animation smoothness; breadcrumb label matches ContainerNode label; previous viewport is preserved in memory | P0 |
| QA-B011 | Nested navigation | Navigate back via breadcrumbs | Inside a subgraph (depth >= 1) | 1. Click the parent breadcrumb in the TopBar. | View returns to parent graph at the previously stored viewport position. NavStack pops. Breadcrumbs update accordingly. | Viewport restores to exact previous {x, y, zoom}; no flash of wrong graph | P0 |
| QA-B012 | Nested navigation | Navigate back from root graph | At the root graph level (navStack has 1 entry) | 1. Attempt to trigger navigateBack (if a back button is visible). | Nothing happens or back button is hidden/disabled at root level. No error or crash. | No empty navStack; no blank screen | P1 |
| QA-B013 | Nested navigation | Deep nesting (3+ levels) and breadcrumb skip | Graph with ContainerNodes nested 3+ levels deep | 1. Enter subgraph level 1. 2. Enter subgraph level 2. 3. Enter subgraph level 3. 4. Click the root breadcrumb (skipping levels). | View jumps directly to root graph. NavStack resets to root. All intermediate entries are removed. Viewport restores to root's stored viewport. | Breadcrumbs don't overflow TopBar; navigateToBreadcrumb clears stack correctly; no stale state from intermediate levels | P1 |
| QA-B014 | Nested navigation | Swipe-right-from-left-edge on mobile | Mobile device; inside a subgraph (depth >= 1) | 1. Place finger within 50px of the left edge of the screen. 2. Swipe right at least 100px with less than 50px vertical drift. | Navigates back to parent graph. Breadcrumbs update. Viewport restores. | Swipe starting outside 50px zone does nothing; vertical drift > 50px cancels gesture; partial swipe (< 100px) cancels and snaps back | P0 |
| QA-B015 | Nested navigation | Swipe-back cancellation (insufficient distance) | Mobile device; inside a subgraph | 1. Start swipe from left edge (within 50px). 2. Swipe right only 60px. 3. Release. | Navigation is cancelled. View snaps back to current subgraph. No state change. | Smooth snap-back animation; no partial navigation state | P2 |
| QA-B016 | Nested navigation | Swipe-back cancellation (too much vertical drift) | Mobile device; inside a subgraph | 1. Start swipe from left edge. 2. Swipe right 120px but with 70px vertical drift. | Navigation is cancelled due to excessive vertical drift. View remains on current subgraph. | No accidental navigation; gesture feels intentional | P2 |
| QA-B017 | Pan and zoom | Mouse drag to pan canvas | Graph with nodes visible | 1. Click and drag on empty canvas area (not on a node). | Canvas pans smoothly following the mouse movement. | No jank; nodes stay in relative positions; no accidental node selection | P0 |
| QA-B018 | Pan and zoom | Scroll wheel zoom | Graph with nodes | 1. Position cursor over the canvas. 2. Scroll up to zoom in. 3. Scroll down to zoom out. | Canvas zooms centered on cursor position. Zoom is smooth and responsive. | Zoom center follows cursor; min/max zoom limits respected; no sudden jumps | P0 |
| QA-B019 | Pan and zoom | Pinch-to-zoom on touch | Mobile/touch device; graph with nodes | 1. Place two fingers on the canvas. 2. Pinch in to zoom out. 3. Spread to zoom in. | Canvas zooms smoothly centered between the two touch points. | No accidental pan during pinch; smooth framerate; works alongside swipe-back gesture | P0 |
| QA-B020 | Pan and zoom | Fit-view with Ctrl+Shift+F | Graph with nodes spread across canvas | 1. Pan far away from nodes so they are off-screen. 2. Press Ctrl+Shift+F. | All nodes fit into the visible viewport with 0.2 padding. Animation takes approximately 300ms. | Smooth 300ms animation; padding is uniform on all sides; zoom level doesn't exceed max | P1 |
| QA-B021 | Pan and zoom | Fit-view on empty graph | Empty graph with no nodes | 1. Press Ctrl+Shift+F. | No crash. Viewport resets to default center or remains unchanged. | No error in console; no weird zoom to infinity | P2 |
| QA-B022 | Pan and zoom | MiniMap interaction | Graph with many nodes | 1. Observe the MiniMap renders a thumbnail of the full graph. 2. Click and drag on the MiniMap to reposition the viewport. | MiniMap accurately reflects node positions and current viewport rectangle. Dragging on MiniMap pans the main canvas accordingly. | MiniMap updates in real-time as nodes are moved; viewport rectangle is accurate; performance is acceptable | P1 |
| QA-B023 | Pan and zoom | Viewport persistence across graph navigation | ContainerNode with subgraph present | 1. Pan and zoom to a specific position on root graph. 2. Enter a subgraph. 3. Pan and zoom to a different position in subgraph. 4. Navigate back to root. | Root graph restores to the exact viewport {x, y, zoom} from step 1. | Viewport stored per graphId; entering subgraph again should show subgraph's last viewport; no drift in stored values | P1 |
| QA-B024 | View mode | Toggle from graph view to list view | Graph view active with several nodes and edges | 1. Click the graph/list toggle in the TopBar to switch to list view. | List view renders showing all tasks in topological sort order. Tasks reflect current statuses. An add-task input appears at the bottom. | Topological order is correct (dependencies before dependents); no missing nodes; toggle button state updates | P0 |
| QA-B025 | View mode | Toggle from list view to graph view | List view active | 1. Click the graph/list toggle to switch back to graph view. | Graph view renders with all nodes and edges. Any status changes made in list view are reflected on node visuals. | Node positions unchanged; edge state consistent; no layout jump | P0 |
| QA-B026 | View mode | Status change in list view reflects in graph view | List view with tasks visible | 1. In list view, toggle the status of a task (e.g., mark as complete). 2. Switch to graph view. | The node corresponding to the toggled task shows updated status in graph view. | Inline status toggle works on first click; state is shared via Zustand store; no stale data | P0 |
| QA-B027 | View mode | Add task in list view and verify in graph view | List view active | 1. Type a task name in the add-task input at bottom. 2. Submit (Enter). 3. Switch to graph view. | New task appears in list immediately. After switching to graph view, the new node is present on the canvas. | Node gets a default position in graph; topological sort re-runs; input clears after submission | P1 |
| QA-B028 | View mode | Topological sort correctness with complex dependencies | Graph with diamond dependency pattern (A -> B, A -> C, B -> D, C -> D) | 1. Switch to list view. | Tasks are listed in valid topological order: A appears before B and C; B and C appear before D. | Multiple valid orderings may exist; verify it is a valid topological sort; no cycles cause crash | P1 |
| QA-B028-arrow1 | Canvas | Arrow key navigation forward/backward | Graph view with a linear workflow (A → B → C), node A selected | 1. Press Right arrow key. 2. Press Right again. 3. Press Left arrow key. | Selection moves A → B → C → B. Canvas pans to each newly selected node. | Single node must be selected; does nothing if no edge in that direction; does not fire when typing in input | P1 |
| QA-B028-arrow2 | Canvas | Arrow key navigation for parallel tasks | Graph with parallel branches (A → B, A → C where B and C are at different Y positions), node B selected | 1. Press Down arrow. 2. Press Up arrow. | Selection moves B → C → B (or navigates by Y position among siblings). | Siblings found via shared parent or shared child edges; wraps if no candidate in direction | P1 |
| QA-B028-arrow3 | Canvas | Arrow key with multiple forward targets | Graph where A → B and A → C, node A selected | 1. Press Right arrow. | Selects the forward target closest in Y position to node A. | Deterministic selection among multiple candidates | P2 |
| QA-B028a | View mode | List view top-level task alignment | Graph with sequential dependencies (A -> B -> C) | 1. Switch to list view. | All top-level tasks are left-aligned with no indentation regardless of dependency depth. | No cascading indentation for main workflow tasks; only expanded subtasks are indented | P1 |
| QA-B028b | View mode | Subtask status toggle from expanded list view | Container with subtasks, list view active | 1. Expand a container in list view. 2. Click the status icon on a subtask. | Subtask status cycles (todo → in_progress → done). Change persists when switching to graph view. | Status updates the correct child graph node, not the active graph; progress bar on container updates | P0 |
| QA-B028c | View mode | Subtask editing and deletion from expanded list view | Container with subtasks expanded in list view | 1. Double-click a subtask title to edit it. 2. Save the edit. 3. Click delete on another subtask. | Title updates persist; deleted subtask is removed from child graph. Changes reflect in graph view. | Operations target the child graph correctly; container progress recalculates | P1 |
| QA-B028d | View mode | Expanded subtask parallel alignment | Container with parallel subtasks (multiple at same dependency depth) | 1. Expand the container in list view. | Parallel subtasks are indented slightly more than sequential subtasks but are aligned with each other. A branch icon appears next to parallel tasks. | Consistent indent level for all parallel tasks; visual distinction from sequential tasks | P1 |
| QA-B028e | View mode | Hide completed tasks toggle | List view with mix of done and pending tasks | 1. Click the eye icon in the summary header. 2. Verify completed action tasks and 100% containers are hidden. 3. Click again to show them. | Completed tasks are filtered out; toggle icon switches between Eye and EyeOff; counts in header still reflect all tasks; expanding a container also respects the filter | P1 |
| QA-B029 | Execution mode | Toggle execution mode on | Graph with tasks in various states; some actionable, some blocked | 1. Toggle execution mode on in the TopBar. | StepDetailPanel appears on the right side. The first actionable node is focused/highlighted. Blocked nodes are visually distinguished from actionable ones. | Panel renders without layout shift; correct initial node selection; highlight colors are distinct for blocked vs actionable | P0 |
| QA-B030 | Execution mode | Next button advances to next actionable node | Execution mode active; multiple actionable nodes exist | 1. Click the "Next" button in StepDetailPanel. | Focus moves to the next actionable node. The canvas pans to center on it. StepDetailPanel updates to show that node's details. | Skips blocked nodes correctly; wraps or disables at end; pan animation is smooth | P0 |
| QA-B031 | Execution mode | Blocked vs actionable highlighting accuracy | Execution mode active; graph with dependencies where some tasks have unfinished prerequisites | 1. Observe node highlighting in execution mode. 2. Complete a prerequisite task. 3. Observe the previously blocked dependent. | Nodes with incomplete dependencies show blocked styling. After prerequisite completion, the dependent node transitions to actionable styling. isActionable and isBlocked from utils/logic.ts produce correct results. | Real-time update of highlight state; no stale blocked state after dependency resolved | P1 |
| QA-B032 | Execution mode | Toggle execution mode off | Execution mode active with StepDetailPanel visible | 1. Toggle execution mode off in the TopBar. | StepDetailPanel hides. Node highlights (blocked/actionable) are removed. Normal graph interaction resumes. | No lingering highlights; no layout shift as panel disappears; node selection works normally again | P1 |
| QA-B032a | Execution mode | Complete container substeps and advance to next task | Execution mode active; inside a container node with substeps; sibling nodes exist after the container in parent graph | 1. Complete all substeps inside a container (or click "Complete Step & Move On"). 2. Observe navigation back to parent graph. | The container node is marked as done in the parent graph. The canvas automatically pans to the next actionable sibling node. The next node is highlighted. No grey/blank screen. | Container status correctly set to 'done'; downstream nodes become unblocked; advance-next finds correct successor | P0 |
| QA-B032b | Execution mode | Switch between Tasks and Notes views | Execution mode active; inside a container with notes containing markdown (e.g. `**bold**`, `[link](https://example.com)`, `- item`) | 1. Open the panel. 2. Tap the "Notes" tab in the view switcher. 3. Tap "Tasks" to switch back. | Tabs visibly toggle. Notes view renders markdown formatted (bold, italic, code, headings, lists, links). Tasks view shows the substep checklist + verification. Active tab is amber-highlighted. | Selected view persists while the panel stays mounted; tab buttons meet 36px+ touch target | P0 |
| QA-B032c | Execution mode | Notes view renders markdown and active links | Container with notes containing `**bold**`, `*italic*`, `` `code` ``, `# heading`, `- bullet`, `[example](https://example.com)`, and a bare URL `https://foo.bar/baz` | 1. Switch to Notes view. 2. Click a rendered link. | All formatting renders inline (no raw `**` characters visible). Both `[label](url)` links and bare URLs render as clickable, underlined sky-colored links. Clicking a link opens it in a new tab (target=_blank, rel="noreferrer noopener"). Detected links also appear in the "Links" summary box below the notes. | No HTML/script injection from user-controlled markdown; trailing punctuation on bare URLs is preserved as text, not part of the link | P1 |
| QA-B032d | Execution mode | Edit notes inline from Notes view | Execution mode active; container with or without notes | 1. Switch to Notes view. 2. Tap "Edit" (pencil icon) — or, if no notes exist, tap the empty-state placeholder. 3. Type markdown content. 4. Tap "Save". | Textarea opens with current notes (if any). Save persists notes to the container's `meta.notes` and immediately re-renders as formatted markdown. Cancel discards edits and returns to the rendered view. Esc cancels; Cmd/Ctrl+Enter saves. | Save uses the latest `meta` from the store (does not clobber concurrent updates from other surfaces); textarea autofocuses; vertical resize is allowed | P1 |
| QA-B032e | Execution mode (mobile) | Bottom panel and CTA stay within the viewport | iPhone-sized viewport (e.g. 390×844 portrait); execution mode active inside a container with notes and 4+ tasks | 1. Open the panel. 2. Verify the orange "Complete Step & Move On" CTA is fully visible. 3. Scroll the task list. 4. Switch to Notes view and tap into edit mode (keyboard opens). | Panel respects `100dvh` so iOS URL bar / home-indicator never clip it. CTA is fully tappable above the home-indicator (safe-area gutter applied to footer). Scroll happens inside the panel body — header, view switcher, and CTA stay pinned. When the keyboard opens, the panel lifts above it. | Test in portrait + landscape; verify with iOS Safari (URL bar collapse changes vh but not dvh); long task names wrap without pushing CTA off-screen | P0 |
| QA-B033 | Performance | Pan and zoom with 100+ nodes | Graph loaded with 100+ nodes and many edges | 1. Pan the canvas. 2. Zoom in and out. 3. Toggle fit-view. | Interactions remain responsive (no visible frame drops or lag). Fit-view completes within a reasonable time. | Framerate during pan/zoom; ReactFlow virtualization working; MiniMap stays responsive | P1 |
| QA-B034 | Performance | Deep nesting navigation speed | Graph with 5+ levels of nested ContainerNodes | 1. Navigate down through 5 levels of nesting. 2. Use breadcrumb to jump back to root. 3. Navigate down again. | Each navigation completes quickly. No noticeable delay on enter or back. Breadcrumbs remain correct at every level. | Memory leaks from repeated navigation; viewport restore speed; breadcrumb truncation at deep levels | P2 |
| QA-B035 | Focus view | Enter Focus View shows next actionable task | Project with several action nodes; first one has both notes and images | 1. Click the Crosshair icon in TopBar to switch to Focus View. | View renders the first actionable leaf task. If it has images, hero image fills top half (~40-45vh); otherwise notes fill the screen. Title and notes are shown below. Status pill is visible at the bottom. Header shows "Task 1 of N". | Should match `getActionableLeafTasks(activeGraph, graphs)[0]`; "No image for this task" pill shown when images array empty | P0 |
| QA-B036 | Focus view | Status pill cycles and auto-advances on done | Focus View showing a task with status='todo' | 1. Tap the status pill once. 2. Tap it again. 3. Wait. | First tap cycles to 'in_progress' (blue). Second tap cycles to 'done' and shows a green check confirmation; after ~450ms the next actionable task replaces the current one. | Rapid clicks must not skip past 'in_progress'; advance is debounced via `advancing` flag; check that status updates also reflect in graph and list views | P0 |
| QA-B037 | Focus view | Parallel chooser appears when 2+ successors unblock | Graph where node A has two outgoing edges to B and C, both with no other dependencies | 1. Open Focus View on node A. 2. Mark A done via the status pill. 3. After auto-advance delay, observe the screen. | The ParallelChooser screen renders, listing B and C with a small thumbnail (or placeholder), title, optional notes snippet. Tapping one continues focus on that task. | Rows should be ≥64px tall (touch target); cancel button returns to A's view if user changes mind; if a successor is still blocked by another predecessor it must NOT appear | P0 |
| QA-B038 | Focus view | Container nodes are auto-drilled, never shown | Project root contains only a container with leaf tasks inside | 1. Switch to Focus View at root level. | The view shows a leaf task from inside the container, with a small breadcrumb above the title (e.g. "Container Title"). Container itself is never the focus task. | If container has nested containers, breadcrumb chains them ("Outer › Inner"); fully completed containers are skipped; ParallelChooser also flattens containers when collecting successors | P1 |
| QA-B039 | Focus view | Edit modal updates notes and images | Focus View on any task | 1. Tap the Edit (pencil) button. 2. In the modal, change the notes text and add an image. 3. Tap Save. | Modal closes; the focus view immediately reflects the new notes and image hero. Switching to graph or list view confirms the change persisted. | ImagesEditor inside modal supports add/remove with 5 MB cap; closing modal via X discards unsaved edits | P1 |
| QA-B040 | Focus view | Skip and Prev navigation | Focus View with at least 3 actionable tasks remaining | 1. Tap Skip (→). 2. Tap Skip again. 3. Tap Prev (←). | Skip moves to the next actionable task without changing status; Prev returns to the immediately previous focus task (in-memory history). At the start of a session Prev is disabled. | Skip is disabled when only one actionable task remains; status of skipped tasks remains unchanged | P1 |
| QA-B041 | Focus view | All-tasks-complete celebration screen | Project with a small, fully connected workflow | 1. From Focus View, complete every task in sequence. | After the last task is marked done, instead of another task the celebration screen appears: party-popper icon, "All tasks complete", and buttons to return to list view or node view. | Should not appear if there are still actionable tasks in unrelated branches; "Back to list view" / "Back to node view" buttons must work | P1 |
| QA-B042 | Focus view | View toggle hidden but reachable on small screens | Mobile/small viewport (< sm breakpoint) | 1. Open the TopBar overflow menu (kebab/MoreVertical icon). | The overflow menu lists Node View, List View, AND Focus View options, each with the active state highlighted when current. | Tapping switches view mode and closes the menu; new Focus button must not be left out of mobile UX | P0 |
| QA-B043 | Focus view | Desktop keyboard shortcuts | Focus View on desktop with one task showing | 1. Press Space. 2. Press Space again. 3. Press → key. 4. Press ← key. 5. Press Esc. | Space/Enter cycles status (and may auto-advance); → triggers Skip; ← triggers Prev; Esc switches viewMode back to 'list'. | Shortcuts must NOT fire while typing in the Edit modal's textarea; should be inert on touch devices | P2 |

### Group C: Projects, Persistence & AI (33 cases)

| Test ID | Area | Scenario | Preconditions | Steps | Expected Result | Watch For | Priority |
|---------|------|----------|---------------|-------|----------------|-----------|----------|
| QA-C001 | Project CRUD | Create a new project from sidebar | App loaded, sidebar visible | 1. Click "New Project" button in sidebar 2. Enter project name "Test Project" 3. Confirm creation | New project appears in sidebar list, canvas clears to empty workspace for the new project | Project should be selected/highlighted in sidebar after creation | P0 |
| QA-C002 | Project CRUD | Rename an existing project | At least one project exists in sidebar | 1. Right-click (or click menu icon) on project in sidebar 2. Select "Rename" 3. Change name to "Renamed Project" 4. Press Enter or click away to confirm | Project name updates in sidebar immediately; any references to project name elsewhere also update | Empty string or whitespace-only names should be rejected | P1 |
| QA-C003 | Project CRUD | Delete a project | At least two projects exist | 1. Right-click on a project in sidebar 2. Select "Delete" 3. ConfirmModal appears 4. Click "Delete" to confirm | Project removed from sidebar, another project loads automatically, deleted project's nodes/edges no longer on canvas | Confirm modal must appear — no silent deletion; check that deleting the currently active project switches to another | P0 |
| QA-C004 | Project CRUD | Load/switch between projects | Two or more projects with different nodes exist | 1. Click on Project A in sidebar 2. Note nodes on canvas 3. Click on Project B in sidebar | Canvas updates to show Project B's nodes/edges; Project B is highlighted in sidebar; previous project state is preserved | Unsaved changes to Project A should persist after switching back | P0 |
| QA-C005 | Persistence | localStorage saves workspace state | App loaded, workspace has nodes | 1. Add several task nodes and a container 2. Wait 1-2 seconds 3. Open DevTools → Application → Local Storage 4. Check key "spatialtasks-workspace" | The localStorage entry contains serialized workspace state including nodes, edges, and project metadata | Verify the key name is exactly "spatialtasks-workspace" via Zustand persist | P0 |
| QA-C006 | Persistence | Supabase debounced sync triggers after 2s | User authenticated, Supabase connected, network online | 1. Add a new task node 2. Observe SaveIndicator in UI 3. Wait 2+ seconds without further edits | SaveIndicator shows "Saving..." shortly after edit, then transitions to "Saved" after Supabase sync completes | Rapid successive edits should reset the 2s debounce timer; only one sync call fires after edits stop | P0 |
| QA-C007 | Persistence | SaveIndicator reflects save states accurately | User authenticated | 1. Make an edit to workspace 2. Watch SaveIndicator immediately 3. Wait for sync to complete | Indicator shows "Saving..." during sync, then "Saved" once complete | If network is slow, "Saving..." should persist until confirmed; no false "Saved" before server acknowledgment | P1 |
| QA-C008 | Persistence | Reload restores full workspace from localStorage | Workspace with multiple nodes, edges, containers | 1. Build a workspace with 5+ nodes and connections 2. Hard refresh the browser (Ctrl+Shift+R) | All nodes, edges, positions, and container groupings restored exactly as before refresh | Node positions should match pixel-for-pixel; no layout drift | P0 |
| QA-C009 | Undo/Redo | Undo last action with Ctrl+Z | Workspace with at least one action performed (e.g., node added) | 1. Add a task node 2. Press Ctrl+Z | The added node is removed from canvas; workspace returns to previous state | Canvas should visually update immediately without flicker | P0 |
| QA-C010 | Undo/Redo | Redo with Ctrl+Shift+Z | At least one undo has been performed | 1. Add a task node 2. Press Ctrl+Z (node removed) 3. Press Ctrl+Shift+Z | Node reappears in the same position it was originally placed | Redo stack should clear if a new action is taken after undo | P0 |
| QA-C011 | Undo/Redo | Undo/redo via TopBar buttons | Actions performed on workspace | 1. Perform several edits 2. Click undo button in TopBar repeatedly 3. Click redo button in TopBar | Each click undoes/redoes one step; buttons reflect availability (disabled when stack empty) | Undo button should be disabled when history is empty; redo button disabled when at latest state | P1 |
| QA-C012 | Undo/Redo | 50-state undo limit | Fresh workspace | 1. Perform 55 distinct actions (add/move/delete nodes) 2. Press Ctrl+Z 50 times 3. Press Ctrl+Z once more | First 50 undos succeed, reverting actions; the 51st Ctrl+Z does nothing — oldest states beyond 50 are discarded | No crash or error when exceeding the limit; undo button becomes disabled at boundary | P2 |
| QA-C013 | AI Flow Generation | Generate flow from prompt via Gemini API | geminiApiKey set in Settings | 1. Click FlowGenerator button to open GenerateFlowModal 2. Enter prompt "Plan a website redesign" 3. Click Generate 4. Wait for Gemini response 5. DraftReviewPanel appears 6. Click Accept | Generated nodes/edges appear in DraftReviewPanel for review; accepting creates a new project with the generated flow on canvas | Verify API key is required — if missing, user should see an error or be directed to settings | P1 |
| QA-C014 | AI Flow Generation | Reject AI-generated draft | geminiApiKey set, GenerateFlowModal open | 1. Generate a flow from a prompt 2. DraftReviewPanel shows result 3. Click Reject/Cancel | Draft is discarded, no new project created, user returns to previous workspace state | No orphaned nodes should remain; workspace should be completely unchanged | P1 |
| QA-C015 | AI Flow Generation | Generate flow without API key | geminiApiKey not set in settings | 1. Open GenerateFlowModal 2. Enter a prompt 3. Attempt to generate | Error message indicating API key is required; user directed to settings to configure geminiApiKey | Should not make any network request without valid key | P1 |
| QA-C016 | Magic Expand | Expand a ContainerNode into subtasks | A ContainerNode with a task description exists on canvas, API key configured | 1. Select a ContainerNode 2. Click "Magic Expand" option 3. Wait for magicExpand API response | Container is populated with subtask nodes decomposed from the original task; subtasks are logically arranged inside the container | Loading indicator should appear during API call; original container title preserved | P1 |
| QA-C017 | Magic Expand | Magic expand on empty container | An empty ContainerNode exists, API key configured | 1. Select an empty ContainerNode (no label or generic label) 2. Trigger Magic Expand | Appropriate error or prompt asking user to add a description first, OR API returns generic subtasks | Should not crash or produce nonsensical results from empty input | P2 |
| QA-C018 | Markdown Import | Import a well-formed markdown plan | App loaded | 1. Open MarkdownImporter 2. Paste a markdown plan with headings and bullet points 3. Confirm import | Headings become container nodes; bullet items become task nodes nested appropriately; a new project is created | Nested lists should map to hierarchy; formatting artifacts (**, ##) should be stripped from node labels | P1 |
| QA-C019 | Markdown Import | Import empty or malformed markdown | App loaded | 1. Open MarkdownImporter 2. Paste empty string or random non-markdown text 3. Confirm import | Graceful handling — either an error toast saying invalid input or a minimal project with a single node from the text | Should not crash or produce an empty project with zero nodes | P2 |
| QA-C020 | JSON Import | Import valid workspace JSON | App loaded, have a previously exported JSON file | 1. Open JSON import option 2. Select a valid workspace JSON file 3. Confirm import | Workspace fully replaced with imported data — all nodes, edges, positions, and project structure match the JSON | SaveIndicator should trigger a save after import; previous workspace is gone (warn user beforehand) | P1 |
| QA-C021 | JSON Import | Import invalid JSON file | App loaded | 1. Open JSON import 2. Select a file with invalid JSON or wrong schema 3. Confirm import | Validation fails; error toast displayed; workspace remains unchanged | Should validate schema structure, not just JSON parse; no partial import leaving workspace in broken state | P1 |
| QA-C022 | Project Folders | Create folder via FolderPlus button | App loaded | 1. Click FolderPlus icon in sidebar 2. Type "Music", press Enter | Folder "Music" appears in sidebar below any existing folders; persists after reload | Empty name should be rejected or default to "Untitled Folder"; new folder should be expanded by default | P1 |
| QA-C023 | Project Folders | Rename folder via double-click | At least one folder exists | 1. Double-click folder title 2. Type new name 3. Press Enter | Folder renamed; change persists after reload | Empty name reverts to previous title; Escape cancels without saving | P2 |
| QA-C024 | Project Folders | Drag project onto folder (desktop) | Desktop viewport; at least one folder and one ungrouped project | 1. Drag a project row onto the folder header 2. Observe purple ring/tint on drop target 3. Release | Project nests under folder; persists after reload | No drop should occur if released outside a valid target; dragged row shows opacity-50 during drag | P1 |
| QA-C025 | Project Folders | Drag project out to Ungrouped | Project nested inside a folder | 1. Drag project from folder onto the "Ungrouped" section 2. Release | Project returns to the top (ungrouped) level | If dropped onto its own current folder, nothing changes (no-op) | P2 |
| QA-C026 | Project Folders | Collapse/expand state persists | Folder with one or more projects | 1. Click chevron to collapse folder 2. Reload the page | Folder remains collapsed after reload | Expand also persists; collapse is undoable via Ctrl+Z but acceptable | P2 |
| QA-C027 | Project Folders | Delete folder with projects — Keep | Folder contains >=1 project | 1. Click trash on folder 2. Modal shows 3 buttons 3. Click "Keep projects (move to root)" | Folder removed; its projects reappear in Ungrouped section; no project content lost | Active project selection should remain unchanged | P1 |
| QA-C028 | Project Folders | Delete folder with projects — Delete Too | Folder contains >=1 project; workspace has at least 1 project outside folder | 1. Click trash on folder 2. Click "Delete projects too" | Folder and all its projects deleted including graphs; if active project was among deleted, falls back to first remaining project | Cmd+Z restores folder + projects + graphs | P1 |
| QA-C029 | Project Folders | Delete would empty workspace — blocked | Folder contains every project in workspace | 1. Click trash 2. Click "Delete projects too" | Operation blocked with error toast ("Can't delete — workspace must keep at least one project"); nothing is deleted | No silent auto-blank project creation | P1 |
| QA-C030 | Project Folders | Delete empty folder | Empty folder exists | 1. Click trash on empty folder | Single-button ConfirmModal appears (not the 3-button modal); confirming removes the folder | Should NOT show the keep/delete choice when there are no projects inside | P2 |
| QA-C031 | Project Folders | Create project inside folder | Folder exists and is expanded | 1. Hover folder header 2. Click "+" button on the folder header 3. Type name, Enter | New project is created with folderId set to that folder; appears inside the folder immediately | Creating via the top-level "+" still creates an ungrouped project | P2 |
| QA-C032 | Project Folders | Mobile action sheet: Move to folder | Mobile viewport, >=1 folder, >=1 project | 1. Tap "⋯" button on a project row 2. Pick "Move to folder…" 3. Pick a target folder | Project is moved into that folder; action sheet closes with success toast | "New folder…" shortcut creates a folder and moves project into it in one step | P1 |
| QA-C033 | Project Folders | v1 → v2 migration | User has pre-folders localStorage data | 1. Manually edit localStorage `spatialtasks-workspace` to set `version: 1` and remove `folders` key 2. Reload the app | App loads without error; `folders: []` is injected; all existing projects appear in Ungrouped; version bumps to 2 on next save | Supabase-hydrated v1 workspace self-heals the same way | P0 |

### Group D: Auth, Mobile & Edge Cases (21 cases)

| Test ID | Area | Scenario | Preconditions | Steps | Expected Result | Watch For | Priority |
|---------|------|----------|---------------|-------|----------------|-----------|----------|
| QA-D001 | Authentication | Login with valid credentials | Supabase auth configured, existing user account | 1. Open app (AuthGate shows AuthScreen) 2. Enter valid email and password 3. Click Login | User authenticated, AuthGate passes through, workspace loads with user's data | Session should persist on refresh (Supabase session token stored) | P0 |
| QA-D002 | Authentication | Signup new account | Supabase auth configured | 1. On AuthScreen click "Sign Up" 2. Enter new email and password 3. Submit | Account created; confirmation email sent or user logged in (depending on Supabase config); workspace loads | Password validation rules should be enforced; duplicate email should show clear error | P0 |
| QA-D003 | Authentication | Password reset flow | Existing user account | 1. On AuthScreen click "Forgot Password" 2. ResetPasswordScreen appears 3. Enter email 4. Submit | Reset email sent; user sees confirmation message; clicking link in email allows setting new password | Invalid email should show error; rate limiting should prevent abuse | P1 |
| QA-D004 | Authentication | VITE_SKIP_AUTH bypasses login | VITE_SKIP_AUTH=true in environment | 1. Set VITE_SKIP_AUTH=true 2. Load app | AuthGate is bypassed; workspace loads directly without login screen | Should only work in development; verify it does not leak into production builds | P1 |
| QA-D005 | Authentication | Session persistence across refresh | User logged in | 1. Log in successfully 2. Close and reopen browser tab 3. Navigate to app URL | User is still authenticated; workspace loads without showing login screen | Supabase session token should be valid; expired sessions should redirect to login | P0 |
| QA-D006 | Mobile/Touch | FloatingActionButton and bottom sheet | Mobile viewport or touch device | 1. Open app on mobile 2. Tap FloatingActionButton (+) 3. Bottom sheet appears with action options | Bottom sheet slides up with options to add task, container, etc.; tapping an option creates the item and closes the sheet | FAB should be positioned in bottom-right with proper safe-area offset; sheet should be dismissible by swiping down | P0 |
| QA-D007 | Mobile/Touch | Long-press context menu with vibration | Mobile/touch device, node on canvas | 1. Long-press (500ms) on a task node 2. Wait for haptic feedback | ActionSheet appears (replaces desktop ContextMenu) with node actions; device vibrates on trigger | Vibration should fire at exactly the 500ms threshold; moving finger during press should cancel | P1 |
| QA-D008 | Mobile/Touch | Touch targets meet 44px minimum | Mobile device | 1. Inspect all interactive elements (buttons, node handles, checkboxes) on mobile 2. Attempt to tap each | All touch targets are at least 44x44px; no missed taps on small elements | Pay special attention to connection handles on nodes and small icon buttons | P1 |
| QA-D009 | Mobile/Touch | Swipe-back navigation | Mobile device, navigated into a subgraph | 1. Navigate into a subgraph via container node 2. Swipe from left edge toward right | Swipe-back navigates to parent graph, matching native mobile gesture patterns | Should not conflict with canvas pan gestures; only trigger from screen edge | P2 |
| QA-D010 | Responsive Layout | Sidebar as drawer on mobile | Viewport width < 1024px (mobile device) | 1. Open app on mobile 2. Tap hamburger/menu icon 3. Sidebar drawer slides in | Sidebar renders as overlay drawer, 80vw wide with max 320px; tapping outside or swiping closes it | Drawer should not push content; background should have semi-transparent overlay | P0 |
| QA-D011 | Responsive Layout | TopBar overflow menu on mobile | Mobile viewport | 1. Open app on mobile 2. Observe TopBar 3. Tap overflow menu (three dots or similar) | View toggle and undo/redo buttons are hidden from TopBar and accessible via overflow dropdown menu | All functionality from desktop TopBar should still be reachable | P1 |
| QA-D012 | Responsive Layout | Safe-area insets on notched devices | Device with notch/dynamic island (iPhone 12+, etc.) | 1. Open app on notched device 2. Check top and bottom UI elements | UI respects --sat (safe-area-top) and --sab (safe-area-bottom) CSS variables; no content hidden behind notch or home indicator | FAB and bottom sheets should account for --sab; TopBar should account for --sat | P1 |
| QA-D013 | Empty States | Canvas empty state message (desktop) | New project with no nodes, desktop browser | 1. Create a new empty project 2. View the canvas | Canvas displays "Double-click to add a task" placeholder text with AI generation CTA | Message should disappear as soon as first node is added | P1 |
| QA-D014 | Empty States | Canvas empty state on mobile | New project, mobile device | 1. Create new project on mobile 2. View canvas | Canvas displays "Tap the + button" placeholder guiding user to FloatingActionButton | Should reference mobile-appropriate interaction (tap, not double-click) | P1 |
| QA-D015 | Empty States | List view empty state | New project with no tasks, list view active | 1. Switch to list view 2. Ensure no tasks exist | List view shows "No tasks yet" empty state message | Adding a task should immediately replace the empty state with the task list | P1 |
| QA-D016 | Error States | ErrorBoundary catches render crash | App loaded | 1. Trigger a component render error (e.g., corrupt localStorage data manually) 2. Reload app | ErrorBoundary catches the crash; displays fallback UI with a "Reload" button; clicking reload refreshes the app | Error details should be logged to console; user should not see raw stack trace | P0 |
| QA-D017 | Error States | Toast error on network failure | User authenticated, Supabase sync active | 1. Disable network (airplane mode or DevTools offline) 2. Make an edit to workspace 3. Wait for sync attempt | Toast notification appears indicating save failed / network error; workspace remains functional locally | SaveIndicator should not show "Saved"; local changes should persist in localStorage | P0 |
| QA-D018 | Loading States | Initial loading screen | App cold start | 1. Clear cache 2. Load app URL | LoadingScreen appears showing "Loading your workspace..." until data is fetched and app is ready | Loading screen should not flash if load is fast; smooth transition to main UI | P1 |
| QA-D019 | Destructive Actions | Confirm modal for container deletion | Canvas has a container with child nodes | 1. Right-click container node 2. Select "Delete" 3. ConfirmModal appears warning about child nodes 4. Click Confirm | Container and all child nodes removed; action is undoable via Ctrl+Z | Modal should clearly state that children will also be deleted; Cancel should abort with no changes | P0 |
| QA-D020 | Destructive Actions | Cancel project deletion | Multiple projects exist | 1. Right-click project in sidebar 2. Select "Delete" 3. ConfirmModal appears 4. Click Cancel | Project is NOT deleted; modal closes; everything unchanged | Confirm button should be visually distinct (red/danger styling); project name should be mentioned in warning | P0 |
| QA-D021 | Destructive Actions | Workspace reset | Workspace has data | 1. Open settings 2. Select "Reset Workspace" 3. ConfirmModal appears 4. Confirm | Entire workspace cleared — all projects, nodes, edges removed; app returns to fresh/empty state | This is irreversible; warning must be very clear; localStorage and Supabase data both cleared | P1 |

---

## 4. 30-Minute Smoke Test

> Run this before sharing the app with anyone. Covers the highest-risk flows that would break a demo.

### Setup (2 min)
1. Open the app in Chrome desktop + have a mobile device or emulator ready
2. Ensure you have a test account (or use `VITE_SKIP_AUTH=true` locally)
3. Start with a fresh workspace (or reset via Settings → Reset Workspace)

### Desktop Smoke Test (15 min)

| # | What to test | Steps | Pass? |
|---|-------------|-------|-------|
| 1 | **Login** | Log in with test credentials. Verify workspace loads. | ☐ |
| 2 | **Empty state** | Confirm empty canvas shows "Double-click to add a task" message. | ☐ |
| 3 | **Create task** | Double-click canvas → type "Smoke test task" → Enter. Node appears at click position. | ☐ |
| 4 | **Edit task** | Double-click the node → change title → click away. Title persists. | ☐ |
| 5 | **Status cycle** | Click the status icon 3 times. Verify: todo → in_progress → done → todo. | ☐ |
| 6 | **Create 3 more tasks** | Add "Task B", "Task C", "Task D" at different positions. | ☐ |
| 7 | **Drag a node** | Drag "Task B" to a new position. Verify it stays. | ☐ |
| 8 | **Create edge** | Drag from Task B's source handle to Task C's target handle. Edge appears. | ☐ |
| 9 | **Pan and zoom** | Scroll to zoom. Drag empty canvas to pan. Press Ctrl+Shift+F to fit all. | ☐ |
| 10 | **Create container** | Right-click canvas → add container. Give it a title. | ☐ |
| 11 | **Enter container** | Click the enter-subgraph arrow on the container. Breadcrumbs update. | ☐ |
| 12 | **Add task inside** | Double-click inside the subgraph to add a child task. | ☐ |
| 13 | **Navigate back** | Click the root breadcrumb. Verify you return to the parent graph. | ☐ |
| 14 | **Delete a node** | Select a node → press Delete. Node removed. | ☐ |
| 15 | **Undo** | Press Ctrl+Z. Deleted node reappears. | ☐ |
| 16 | **Switch to list view** | Toggle to list view. Verify all tasks appear. | ☐ |
| 17 | **Status in list** | Toggle a status in list view → switch back to graph. Status matches. | ☐ |
| 18 | **Refresh persistence** | Hard refresh (Ctrl+Shift+R). All nodes, edges, positions restored. | ☐ |
| 19 | **Create second project** | Open sidebar → create new project. Verify canvas clears. | ☐ |
| 20 | **Switch projects** | Click back to first project. All data intact. | ☐ |

### Mobile Smoke Test (10 min)

| # | What to test | Steps | Pass? |
|---|-------------|-------|-------|
| 21 | **Mobile load** | Open app on phone. Verify it loads and is usable. | ☐ |
| 22 | **Sidebar drawer** | Tap hamburger menu. Sidebar opens as drawer. Tap outside to close. | ☐ |
| 23 | **FAB task creation** | Tap FAB (+). Enter a task in bottom sheet. Confirm it appears on canvas. | ☐ |
| 24 | **Touch pan/zoom** | Drag to pan. Pinch to zoom. Both feel responsive. | ☐ |
| 25 | **Long-press menu** | Long-press a node. Action sheet appears with options. | ☐ |
| 26 | **Status cycle (touch)** | Tap status icon. Verify cycle + vibration feedback. | ☐ |
| 27 | **Swipe back** | Enter a container → swipe from left edge → returns to parent. | ☐ |
| 28 | **Safe areas** | Verify no content hidden behind notch or home indicator. | ☐ |
| 29 | **Refresh** | Refresh mobile browser. All data persists. | ☐ |
| 30 | **Empty state (mobile)** | Create empty project. Verify "Tap +" message shows. | ☐ |

### Smoke Test Exit Criteria
- All 30 checks pass → **safe to demo**
- Any P0 failure (items 1-3, 5, 7-8, 18, 21, 23-24) → **fix before sharing**
- Non-P0 failures → **note and share with caveats**

---

## 5. Full Pre-Release Checklist

> Complete this before any public release or major user testing round.

### Core Flows
- [ ] User can sign up, log in, and reset password
- [ ] Session persists across browser restart
- [ ] Workspace loads correctly after authentication
- [ ] New user sees proper empty state with guidance
- [ ] Tasks can be created, edited, and deleted on desktop
- [ ] Tasks can be created via FAB on mobile
- [ ] Status cycling works (todo → in_progress → done → todo)
- [ ] Nodes can be dragged and repositioned
- [ ] Edges can be created via handle drag and connect mode
- [ ] Edges can be deleted via keyboard and context menu
- [ ] Container nodes can be entered and navigated out of
- [ ] Breadcrumb navigation works at all depth levels
- [ ] Undo/redo works for all major operations

### Persistence & Data
- [ ] Changes save to localStorage immediately
- [ ] Supabase sync completes within ~3 seconds of last edit
- [ ] SaveIndicator shows accurate Saving/Saved states
- [ ] Full page refresh restores all data (nodes, edges, positions, statuses)
- [ ] Project switching preserves data for both projects
- [ ] Closing and reopening tab preserves workspace
- [ ] No data loss when closing tab during debounce window (verify beforeunload warning)

### Views & Modes
- [ ] Graph ↔ List ↔ Focus view toggle works
- [ ] Status changes in any view reflect in the others
- [ ] Tasks created in list view appear in graph view
- [ ] Focus View opens on the first actionable task; auto-advances on done; ParallelChooser appears for multi-successor unblocks; container leaves are surfaced transparently
- [ ] Execution mode activates with correct panel and highlighting
- [ ] "Next" button in execution mode navigates to correct actionable node
- [ ] Blocked/actionable states are accurate based on dependencies
- [ ] Execute Mode panel: Tasks ↔ Notes view switcher works; markdown renders; links open in new tab
- [ ] Execute Mode panel on mobile: CTA stays visible inside the dynamic viewport; safe-area + keyboard offsets respected

### Canvas Interactions
- [ ] Pan works with mouse drag on empty canvas
- [ ] Zoom works with scroll wheel
- [ ] Fit-view (Ctrl+Shift+F) centers all nodes
- [ ] MiniMap displays and is interactive
- [ ] Double-click creates task at correct position
- [ ] Connect mode disables drag and enables edge creation
- [ ] Select mode allows multi-selection
- [ ] Backspace/Delete removes selected nodes/edges

### Mobile & Responsive
- [ ] App is usable on iPhone (Safari) and Android (Chrome)
- [ ] Sidebar renders as drawer on small screens
- [ ] FAB and bottom sheet work correctly
- [ ] Long-press shows action sheet with vibration
- [ ] Pinch-to-zoom works
- [ ] Swipe-back navigation works from subgraphs
- [ ] Safe-area insets prevent content from being hidden
- [ ] Touch targets are at least 44px
- [ ] TopBar overflow menu provides access to hidden controls
- [ ] Keyboard doesn't obscure input fields in bottom sheets

### Error Handling
- [ ] ErrorBoundary catches crashes and shows reload button
- [ ] Network failure shows toast error and doesn't corrupt local data
- [ ] Invalid Gemini API key shows clear error message
- [ ] Empty/malformed JSON import is rejected gracefully
- [ ] Empty/malformed markdown import is handled gracefully
- [ ] Deleting last project is blocked with clear message

### Destructive Actions
- [ ] Container deletion shows ConfirmModal with clear warning
- [ ] Project deletion shows ConfirmModal
- [ ] Workspace reset shows ConfirmModal
- [ ] Cancel in all ConfirmModals leaves data untouched
- [ ] Undo after deletion restores the deleted item

### Performance
- [ ] Canvas with 50+ nodes feels responsive during pan/zoom
- [ ] Canvas with 100+ nodes doesn't freeze
- [ ] Rapid node creation (10+ quickly) doesn't cause errors
- [ ] Deep nesting (5+ levels) doesn't cause noticeable slowdown
- [ ] Rapid project switching doesn't cause race conditions

### AI Features
- [ ] Flow generation works with valid API key
- [ ] Generated draft can be reviewed and accepted
- [ ] Generated draft can be rejected without side effects
- [ ] Magic expand decomposes container into subtasks
- [ ] Markdown import creates correct project structure

### Browser Compatibility
- [ ] Chrome (latest) — full test
- [ ] Safari (latest) — smoke test
- [ ] Firefox (latest) — smoke test
- [ ] Safari iOS — mobile smoke test
- [ ] Chrome Android — mobile smoke test

### Accessibility Basics
- [ ] All interactive elements are keyboard-reachable (Tab)
- [ ] Focus indicators are visible
- [ ] Color is not the only indicator of status (icons also used)
- [ ] Text is readable at default zoom level
- [ ] Modals trap focus and can be closed with Escape

---

## 6. User Verification Plan

### Who Should Test

| Tester Type | Why | What They'll Reveal |
|-------------|-----|-------------------|
| **Non-technical friend/family** | Zero context on task management tools | Discoverability issues, confusing UX, unclear terminology |
| **Project manager / planner** | Core target user; uses task tools daily | Missing features, workflow gaps, comparison to existing tools |
| **Developer** | Likely early adopter; will stress-test | Edge cases, performance issues, technical bugs |
| **Mobile-primary user** | Tests the touch experience naturally | Touch target issues, gesture conflicts, responsive bugs |
| **Someone over 50** | Tests accessibility and clarity | Font size issues, low contrast, confusing icons |

### What to Ask Testers to Do

Give testers these tasks **without explaining HOW to do them**:

1. "Create a project for planning a birthday party"
2. "Add 5 tasks you'd need to do for the party"
3. "Organize them in an order that makes sense to you"
4. "Connect tasks that depend on each other"
5. "Mark 2 tasks as in progress and 1 as done"
6. "Create a group for 'Decorations' and put some tasks inside it"
7. "Go inside the Decorations group and add subtasks"
8. "Come back to the main view"
9. "Switch to the list view and back"
10. "Delete a task you don't need"
11. "Undo that deletion"
12. "Close the app and reopen it — is everything still there?"

### What NOT to Explain in Advance

- How to create tasks (double-click vs FAB)
- What the status icons mean
- How to connect nodes
- What containers/subgraphs are
- How to navigate breadcrumbs
- What the sidebar does
- How to use execution mode

### What to Observe While They Use It

**Watch for these signals:**

| Signal | What It Means |
|--------|--------------|
| Hovering without clicking | Can't find the right interaction |
| Clicking wrong things | Affordances are unclear |
| Asking "how do I...?" | Feature is not discoverable |
| Long pauses | Confused or lost |
| Trying to right-click on mobile | Desktop muscle memory, no mobile equivalent found |
| Accidentally deleting something | Destructive action too easy to trigger |
| Not noticing the FAB | Mobile entry point is not prominent enough |
| Zooming past nodes | Pan/zoom feels disorienting |
| Can't find their way back | Navigation (breadcrumbs) is unclear |
| Ignoring the sidebar | Sidebar is not discoverable or seems unimportant |

### Questions to Ask Afterward

1. "What was the first thing you tried to do?"
2. "Was anything confusing?"
3. "Did you lose any work at any point?"
4. "What would you change about how [specific feature] works?"
5. "Would you use this instead of [their current tool]? Why or why not?"
6. "What's missing?"
7. "Rate the experience 1-10. What would make it a 10?"

### Bug vs Confusing UX vs Missing Feature

| Category | Definition | Example | Action |
|----------|-----------|---------|--------|
| **Bug** | App does something wrong or crashes | Node disappears after drag | Fix immediately |
| **Confusing UX** | App works but user can't figure out how | User doesn't know double-click creates a task | Improve affordances/onboarding |
| **Missing Feature** | User expects something that doesn't exist | "Can I search for a task?" | Add to backlog, prioritize |

### Lightweight Tester Script

> Copy-paste this and send to a friend:

```
Hey! I'm building a task management app and would love 10 minutes of your time to try it.

Here's the link: [APP URL]

Please try to:
1. Create an account
2. Make a project called "Weekend Trip"
3. Add 5 things you'd need to plan
4. Try to organize them visually
5. Mark some as in progress or done
6. Close the tab and reopen — is your stuff still there?

Don't worry about doing it "right" — I want to see where it's confusing.
If you get stuck, just tell me what you were trying to do.

After you're done, tell me:
- What confused you?
- What was easy?
- Would you use this?
- What's missing?

Thanks!
```

### Observer Checklist

Use this while watching someone test:

```
Tester: _______________  Date: ___________  Device: ___________

FIRST IMPRESSIONS
- [ ] What did they do first?
- [ ] Did they understand what the app is for?
- [ ] Did they find the empty state helpful?

TASK CREATION
- [ ] Found how to create tasks? (method: double-click / FAB / other)
- [ ] Time to first task: ___ seconds
- [ ] Any confusion?

CANVAS INTERACTION
- [ ] Tried dragging nodes?
- [ ] Tried connecting nodes?
- [ ] Used pan/zoom?
- [ ] Got lost on the canvas?

NAVIGATION
- [ ] Found sidebar?
- [ ] Understood breadcrumbs?
- [ ] Tried entering a container?
- [ ] Found their way back?

MOBILE (if applicable)
- [ ] Found the FAB?
- [ ] Used long-press?
- [ ] Had gesture conflicts?
- [ ] Safe area issues?

DATA
- [ ] Lost any work?
- [ ] Noticed the save indicator?

OVERALL
- [ ] Completed all tasks? (Y/N, which ones failed)
- [ ] Frustration moments:
- [ ] Delight moments:
- [ ] Feature requests:
- [ ] Rating (1-10): ___
```

---

## 7. Highest-Risk Areas / Likely Failure Points

### 1. Persistence Race Conditions
**Risk**: Data loss when localStorage and Supabase diverge.

**Files**: `src/lib/workspaceSync.ts`, `src/hooks/useWorkspaceSync.ts`

**Scenarios**:
- User closes tab during the 2-second debounce window → last changes lost (only `beforeunload` warning protects this, which browsers may skip)
- First-time login merges localStorage to Supabase — if localStorage has stale data from a different account, it could overwrite the remote
- `_supabaseLoaded` flag prevents saves before hydration, but if hydration fails silently, no saves happen at all
- Rapid project switching could trigger concurrent saves with different active states

**Likelihood**: Medium-High. **Impact**: Critical (data loss).

### 2. Undo/Redo State Corruption
**Risk**: Undo produces inconsistent state or interacts badly with persistence.

**Files**: `src/store/workspaceStore.ts` (Zundo temporal middleware)

**Scenarios**:
- Undo after a batch operation (e.g., multi-node delete with `removeNodes`) may not restore edges that were auto-removed
- Undone state gets auto-saved to Supabase via the debounced sync, making undo "permanent"
- 50-state limit means early history is silently dropped — user expects more undo than available
- Undo after `hydrateFromSupabase` could revert to pre-hydration (empty/stale) state

**Likelihood**: Medium. **Impact**: High.

### 3. Coordinate Transform Bugs
**Risk**: Nodes created at wrong position, especially at extreme zoom levels.

**Files**: `src/components/Canvas/CanvasArea.tsx` (screenToFlowPosition)

**Scenarios**:
- Double-click at high zoom → quick-add dialog position correct but node placed at wrong flow coordinates
- `screenToFlowPosition` depends on ReactFlow instance state which could be stale during rapid interactions
- Mobile viewport changes (keyboard open/close) may shift coordinate reference

**Likelihood**: Medium. **Impact**: Medium (confusing but not data loss).

### 4. Recursive Graph Deletion / Orphaned Data
**Risk**: Deleting a container leaves orphaned child graphs in the store.

**Files**: `src/store/workspaceStore.ts` (`removeNode`, `removeNodes`)

**Scenarios**:
- `removeNode` recursively deletes child graphs, but if a child graph references another container's children, the cascade could delete too much or too little
- `removeNodes` batch delete may process nodes in an order that causes intermediate states with broken references
- If the recursive deletion throws mid-execution, partial cleanup leaves orphaned graphs in `state.graphs`

**Likelihood**: Medium. **Impact**: High (invisible data bloat, potential state corruption).

### 5. Connect Mode Stuck State
**Risk**: Connect mode doesn't exit, leaving node dragging permanently disabled.

**Files**: `src/components/Canvas/CanvasArea.tsx` (`connectMode` state)

**Scenarios**:
- User enables connect mode, taps source, then navigates away (breadcrumb/sidebar) without completing connection
- Error during edge creation leaves `connectMode.active = true` but no visual indicator
- On mobile, accidental tap outside nodes during connect mode has unclear behavior

**Likelihood**: Medium. **Impact**: Medium (user can't drag, very confusing).

### 6. View Consistency (Graph ↔ List)
**Risk**: State changes in one view not reflected in the other.

**Files**: `src/components/ListView/ListView.tsx`, `src/components/Canvas/CanvasArea.tsx`

**Scenarios**:
- Task created in list view gets position (0,0) in graph view — may stack on top of other nodes
- Topological sort in list view could fail with cyclic dependencies (edges A→B, B→A)
- Rapid switching between views during a mutation could show stale data

**Likelihood**: Medium. **Impact**: Medium.

### 7. Mobile Gesture Conflicts
**Risk**: Touch gestures interfere with each other.

**Files**: `src/components/Canvas/CanvasArea.tsx`, `src/hooks/useDeviceDetect.ts`

**Scenarios**:
- Long-press (500ms) fires during intended scroll/pan, opening action sheet accidentally
- Swipe-back (50px from left edge) triggers during canvas pan that starts near the left edge
- Pinch-to-zoom on a node triggers both zoom and node interaction
- FAB positioned over a node — tapping FAB also selects the node behind it

**Likelihood**: High. **Impact**: Medium (frustrating UX).

### 8. Gemini API Error Handling
**Risk**: AI features fail ungracefully.

**Files**: `src/services/gemini.ts`, `src/components/FlowGenerator/FlowGenerator.tsx`

**Scenarios**:
- Malformed JSON response from Gemini → `parse_error` toast but no retry or fallback
- Quota exceeded → user doesn't understand they need to wait or use a different key
- Magic expand returns empty array → container gets no children, user thinks it failed
- Network timeout has no retry mechanism — user must manually retry
- Long prompts or complex responses may hit Gemini token limits silently

**Likelihood**: Medium. **Impact**: Medium.

### 9. JSON Import Validation Gaps
**Risk**: Malformed import data corrupts workspace.

**Files**: `src/store/workspaceStore.ts` (`jsonImport`)

**Scenarios**:
- `jsonImport` validates top-level structure but may not catch invalid node references (edges pointing to non-existent nodes)
- Importing a workspace with overlapping IDs could cause conflicts
- Very large JSON import could freeze the UI during synchronous parsing

**Likelihood**: Low. **Impact**: High (workspace corruption).

### 10. Performance Degradation at Scale
**Risk**: Large canvases become unusable.

**Files**: `src/components/Canvas/CanvasArea.tsx`, `src/store/workspaceStore.ts`

**Scenarios**:
- 200+ nodes on a single graph → pan/zoom lag, MiniMap slowdown
- Deep nesting (10+ levels) → navStack grows, breadcrumb rendering slows
- Each store mutation triggers subscriber notifications to all components
- Entire workspace serialized to localStorage on every persist — large workspaces slow this down

**Likelihood**: Medium (depends on usage). **Impact**: High (app feels broken).

---

## 8. What Should Be Automated Later

> Spatial Tasks currently has **zero test coverage** (Playwright is installed but unused). These recommendations are ordered by value — start from the top.

### Unit Tests (Vitest recommended)

| What to Test | File(s) | Why It Matters | Bugs It Would Catch | Priority |
|-------------|---------|---------------|---------------------|----------|
| **Workspace store mutations** | `src/store/workspaceStore.ts` | Core data logic — every feature depends on it | Orphaned graphs on delete, missing edge cleanup, navStack corruption | P0 |
| **Blocking/actionable logic** | `src/utils/logic.ts` | Determines execution mode behavior and visual state | Wrong blocked/actionable status, progress calculation errors | P0 |
| **Draft-to-canvas conversion** | `src/utils/draftUtils.ts` | AI-generated flows become real projects through this | Missing nodes, wrong hierarchy, broken edge references | P1 |
| **Markdown parser** | `src/utils/markdownParser.ts` | User imports depend on correct parsing | Malformed import, lost content, wrong nesting | P1 |
| **Workspace sync utilities** | `src/lib/workspaceSync.ts` | Persistence correctness | Gemini key leaking to Supabase, debounce not resetting, version conflicts | P1 |
| **JSON import validation** | `src/store/workspaceStore.ts` (`jsonImport`) | Data integrity on import | Corrupted workspace from bad input, partial import | P2 |

### Integration Tests (Vitest + React Testing Library)

| What to Test | Component(s) | Why It Matters | Bugs It Would Catch | Priority |
|-------------|-------------|---------------|---------------------|----------|
| **Status cycling** | `ActionNode` + `workspaceStore` | Most common user interaction | Status not persisting, wrong cycle order, UI not updating | P0 |
| **Node CRUD** | `CanvasArea` + `workspaceStore` | Core feature | Nodes not appearing, positions wrong, IDs conflicting | P0 |
| **Edge creation/dedup** | `CanvasArea` + `workspaceStore` | Connection logic | Duplicate edges, self-connections, missing edges | P1 |
| **View mode consistency** | `CanvasArea` + `ListView` + store | Two views share state | Stale data in one view, missing nodes, wrong sort order | P1 |
| **Project switching** | `Sidebar` + `workspaceStore` | Multi-project support | Data from wrong project shown, navStack not reset | P1 |
| **Undo/redo with persistence** | Store + temporal middleware | Undo interacts with save pipeline | Undone state auto-saved, redo lost after new action | P2 |

### End-to-End Tests (Playwright — already installed)

| What to Test | Why It Matters | Bugs It Would Catch | Priority |
|-------------|---------------|---------------------|----------|
| **Full task lifecycle** (create → edit → status → delete → undo) | Covers the core happy path | Regression in any step of the main workflow | P0 |
| **Persistence across refresh** (create tasks → refresh → verify) | Users expect data to survive | localStorage/Supabase sync failures, hydration bugs | P0 |
| **Container navigation** (create container → enter → add child → navigate back) | Key differentiating feature | NavStack corruption, viewport not restoring, orphaned graphs | P1 |
| **Connect mode flow** (enable → source → target → edge appears → disable) | Complex multi-step interaction | Mode getting stuck, drag disabled permanently | P1 |
| **Project management** (create → switch → rename → delete) | Multi-project support | Data loss on switch, last-project delete not blocked | P1 |
| **Mobile smoke test** (FAB → create → long-press → action sheet) | Touch-specific flows | Gesture conflicts, FAB not working, action sheet bugs | P2 |

### Visual Regression Tests (Playwright + screenshot comparison)

| What to Test | Why It Matters | Bugs It Would Catch | Priority |
|-------------|---------------|---------------------|----------|
| **Node rendering** (action, container, selected, blocked, done states) | Visual correctness of all node states | Styling regressions, missing icons, wrong colors | P1 |
| **Empty states** (canvas, list view) | First impression | Missing or broken empty state UI | P2 |
| **Mobile layout** (sidebar drawer, FAB, action sheet, bottom sheet) | Mobile-specific components | Safe-area issues, overflow, z-index bugs | P2 |
| **TopBar states** (breadcrumbs at various depths, execution mode on/off) | Navigation UI correctness | Breadcrumb overflow, mode indicator bugs | P2 |

### Recommended Implementation Order

1. **Week 1**: Unit tests for `workspaceStore` mutations and `utils/logic.ts` — highest ROI, catches most critical bugs
2. **Week 2**: Playwright E2E for task lifecycle and persistence — catches regression in the core flow
3. **Week 3**: Integration tests for status cycling, node CRUD, view consistency
4. **Week 4**: Playwright E2E for container navigation and connect mode
5. **Ongoing**: Visual regression screenshots for node states and mobile layout

---

## 9. Test Environment and Setup Checklist

### Environment Variables

| Variable | Required | Source | Notes |
|----------|----------|--------|-------|
| `VITE_SUPABASE_URL` | Yes (production) | Supabase dashboard | e.g., `https://your-project.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Yes (production) | Supabase dashboard | Public anon key |
| `VITE_SKIP_AUTH` | No | Set to `true` for local dev | Bypasses auth entirely — **never use in production** |

### Local Setup

```bash
# Clone and install
git clone <repo-url> && cd SpatialTasks
npm install

# Copy env template
cp .env.example .env
# Edit .env with your Supabase credentials (or set VITE_SKIP_AUTH=true)

# Start dev server
npm run dev
# App available at http://localhost:5173 (listens on all interfaces)
```

### Seed Data / Test Boards

- **No seed data mechanism exists.** The app generates a default workspace on first login.
- To test with specific data: create tasks manually, or use the JSON import feature.
- To test AI features: configure a Gemini API key in Settings → paste key.
- To reset to clean state: Settings → Reset Workspace (or clear `spatialtasks-workspace` from localStorage).

### Browser Coverage

| Browser | Priority | Notes |
|---------|----------|-------|
| Chrome (desktop, latest) | P0 | Primary target — full test |
| Safari (desktop, latest) | P1 | CSS differences, safe-area behavior |
| Firefox (desktop, latest) | P1 | Potential flexbox/grid differences |
| Safari iOS (iPhone) | P0 | Primary mobile target — touch, safe-area, FAB |
| Chrome Android | P1 | Touch interactions, viewport behavior |
| Samsung Internet | P2 | Second-most-common Android browser |

### Mobile Testing

- **Physical device preferred** over emulators for touch gesture testing
- For iOS safe-area testing, use an iPhone with a notch (iPhone X or later)
- Chrome DevTools device mode works for layout but NOT for: real touch events, vibration, safe-area insets, iOS Safari quirks
- Use `useDeviceDetect.ts` behavior: touch is detected via `navigator.maxTouchPoints` or `(hover: none)` media query

### Backend / Database

- **Supabase**: Ensure `workspaces` table exists with `user_id`, `data` (JSONB), `version` columns
- **No migrations tool** — schema is implied from code in `workspaceSync.ts`
- To reset a user's data: delete their row from `workspaces` table in Supabase dashboard
- Gemini API keys are **never stored in Supabase** — only in browser localStorage under `spatialtasks-gemini-config`

### Debug Tooling

- **React DevTools**: Inspect component tree, Zustand store state
- **Browser DevTools → Application → Local Storage**: Inspect `spatialtasks-workspace` and `spatialtasks-gemini-config`
- **Network tab**: Monitor Supabase sync calls (look for `workspaces` upsert requests)
- **Console**: Errors from ErrorBoundary, Gemini API failures, and sync issues are logged here
- **SaveIndicator** (top bar): Visual feedback on save state — useful during manual testing

---

## 10. Bug Report Template

```markdown
## Bug Report

**Date**: YYYY-MM-DD
**Reporter**: [name]
**Device/Browser**: [e.g., iPhone 14 / Safari 17, Chrome 120 / macOS]
**App Version/Commit**: [if known]

### Summary
[One sentence describing the bug]

### Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Expected Behavior
[What should have happened]

### Actual Behavior
[What actually happened]

### Screenshot/Recording
[Attach if possible]

### Severity
- [ ] Critical (data loss, crash, can't use app)
- [ ] High (major feature broken)
- [ ] Medium (feature works but incorrectly)
- [ ] Low (cosmetic, minor annoyance)

### Context
- Was this on first use or after extended use?
- Did a refresh fix it?
- Network conditions: [online / offline / slow]
- Any console errors? [paste if available]
```

---

## 11. Tester Feedback Template

```markdown
## Tester Feedback

**Tester Name**: _______________
**Date**: _______________
**Device**: _______________
**Time Spent**: ___ minutes

### Tasks Attempted
| Task | Completed? | Difficulty (1-5) | Notes |
|------|-----------|-----------------|-------|
| Create a project | | | |
| Add tasks | | | |
| Organize spatially | | | |
| Connect tasks | | | |
| Change statuses | | | |
| Use containers | | | |
| Navigate subgraphs | | | |
| Delete and undo | | | |
| Refresh and check persistence | | | |

### What was confusing?
[Free text]

### What was easy or enjoyable?
[Free text]

### What's missing?
[Free text]

### Bugs encountered
[List any bugs — use the Bug Report Template for serious ones]

### Would you use this app?
- [ ] Yes, as-is
- [ ] Yes, with some changes
- [ ] Maybe, needs significant work
- [ ] No

### Overall rating (1-10): ___

### Additional comments
[Free text]
```

---

## 12. Recommended Next Steps

### Immediate (before first user test)
1. **Run the 30-minute smoke test** (Section 4) on desktop + mobile
2. **Fix any P0 failures** before sharing
3. **Set up a test account** with sample data for demos

### Short-term (before wider release)
1. **Run the full pre-release checklist** (Section 5)
2. **Conduct 3-5 user tests** using the User Verification Plan (Section 6)
3. **Address top confusing UX issues** discovered during user tests
4. **Add unit tests for workspaceStore** — highest ROI automation target

### Medium-term (ongoing quality)
1. **Set up Playwright E2E** for the core task lifecycle and persistence flows
2. **Add integration tests** for status cycling and view consistency
3. **Create a CI pipeline** that runs tests on every PR
4. **Add visual regression tests** for node states and mobile layout
5. **Monitor Supabase sync** — add logging for failed saves

### Key Risks to Track
- **Data loss from persistence race conditions** — the 2s debounce window is the biggest risk
- **Mobile gesture conflicts** — needs real-device testing, not just emulators
- **Undo/redo reliability** — especially after batch operations and persistence sync
- **Scale performance** — test with progressively larger workspaces as users grow

---

## Audit Issue Fixes — Verification Tests

The following test cases verify fixes from the codebase audit (`SPATIAL_TASKS_CODEBASE_AUDIT.md`).

### Fix 1: Container Completion is Derived (Not Persisted)

**What changed:** Container node completion is now purely derived from child progress via `getContainerProgress()`. The explicit `status: 'done'` write was removed from `StepDetailPanel.handleCompleteAndMoveOn()`. `isNodeBlocked()` now checks derived progress for container source nodes.

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| AF-1 | Container shows complete when all children done | 1. Create container with 3 action children 2. Mark all 3 as done | Container progress ring shows 100%; downstream nodes unblocked |
| AF-2 | Reopening child re-blocks downstream | 1. Complete all children of a container 2. Set one child back to 'todo' | Container progress drops; downstream nodes that depended on the container are re-blocked |
| AF-3 | Execution mode complete-and-move-on | 1. Enter execution mode, drill into container 2. Click "Complete Step & Move On" | All children marked done, navigates back, container shows 100%, canvas advances to next node |
| AF-4 | Container blocking is derived | 1. Create A (container) → B (action) edge 2. Leave A's children incomplete | B shows as blocked; completing all of A's children unblocks B |

### Fix 2: SaveIndicator Driven by Sync Pipeline

**What changed:** SaveIndicator now subscribes to `syncStatus` from the store instead of all store mutations. Sync status is set by `debouncedSave()` — only real Supabase save events trigger the indicator.

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| AF-5 | UI-only actions don't trigger save indicator | 1. Toggle sidebar 2. Select/deselect nodes 3. Switch view mode | No "Saving..." indicator appears |
| AF-6 | Data changes trigger save indicator | 1. Edit a node title 2. Add a new node | "Saving..." then "Saved" appears (when Supabase is configured) |
| AF-7 | Sync failure shows error state | 1. Simulate network failure during save | SaveIndicator shows "Sync failed" in red; persists until next successful save |

### Fix 3: Typed Canvas Actions Replace DOM Events

**What changed:** `canvas:delete-selected`, `canvas:fit-view`, and `canvas:advance-next` DOM events replaced with typed store actions (`dispatchCanvasAction`/`clearCanvasAction`).

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| AF-8 | TopBar delete-selected still works | 1. Select nodes on canvas 2. Click "Delete Selected" in overflow menu | Selected nodes are deleted |
| AF-9 | TopBar fit-view still works | 1. Pan away from nodes 2. Click "View Full Flow" in overflow menu | Canvas zooms to fit all nodes |
| AF-10 | Execution advance-next still works | 1. Enter execution mode 2. Click "Next" on highlighted action node | Node marked done, canvas zooms to next actionable node |
| AF-11 | StepDetailPanel advance still works | 1. In execution mode, drill into container 2. Click "Complete Step & Move On" | Navigates back and advances to next actionable node |

### Fix 4: Code Splitting and Lazy Loading

**What changed:** FlowGenerator and MarkdownImporter are lazy-loaded via `React.lazy()`. Vite config splits ReactFlow and Supabase into separate chunks.

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| AF-12 | Initial load doesn't include modal chunks | 1. Open app, check Network tab | FlowGenerator and MarkdownImporter JS chunks not loaded on initial page load |
| AF-13 | FlowGenerator loads on demand | 1. Click "Generate Flow" button | FlowGenerator chunk loads; modal opens correctly |
| AF-14 | MarkdownImporter loads on demand | 1. Click "Import Plan" button | MarkdownImporter chunk loads; modal opens correctly |
| AF-15 | Build produces multiple chunks | 1. Run `npm run build` | Output shows separate chunks for react-flow, supabase, and lazy-loaded modals |

### Feature: Keyboard Shortcuts Cheatsheet

**What changed:** Pressing `?` (Shift+/) opens a modal listing all user-facing keyboard shortcuts, grouped by category. Also accessible from the sidebar footer.

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| KS-1 | Open via ? | 1. Focus the canvas 2. Press Shift+/ | Modal appears with 4 categories: Canvas, Selection, Edit, Focus View |
| KS-2 | ? suppressed while typing | 1. Double-click a node to edit 2. Type "?" | No modal; character goes into input |
| KS-3 | Close via Esc | 1. Open modal 2. Press Esc | Modal closes |
| KS-4 | Close via click-outside | 1. Open modal 2. Click the dimmed backdrop | Modal closes |
| KS-5 | Close via × button | 1. Open modal 2. Click × | Modal closes |
| KS-6 | Open via sidebar | 1. Click "Keyboard shortcuts" in the sidebar footer | Modal opens |
| KS-7 | Mac labels use ⌘ | On macOS, verify modifier labels show ⌘/⇧/⌥ | Keys render as macOS glyphs |
| KS-8 | Windows labels use Ctrl | On Windows/Linux, verify labels use Ctrl/Shift/Alt | Keys render as Windows words |
### Feature: Node Accent Colors

**What changed:** Nodes can be tagged with one of 7 accent colors via context menu / action sheet. Accent renders as a 3px left-edge bar in graph view and an 8px dot in list view.

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| AC-1 | Set color on a single node | 1. Right-click a node 2. Set Color → Red | Red 3px bar appears on the node's left edge in graph view |
| AC-2 | Clear color | 1. On a colored node, Set Color → No color | Bar disappears; node returns to default appearance |
| AC-3 | Color persists in list view | 1. Color a node red 2. Switch to list view | Red dot next to title |
| AC-4 | Batch color via multi-select | 1. Select 3+ nodes (Shift-click) 2. Right-click → Set Color → Blue | All selected nodes show blue bar; single undo reverts all |
| AC-5 | Persist across reload | 1. Color a node, reload | Color still applied |
| AC-6 | Undo restores previous color | 1. Color node red 2. Change to blue 3. Undo | Node is red again |
| AC-7 | Touch: action sheet color picker | 1. Long-press a node on touch 2. Set Color → Green | Green accent applied |
### Feature: Predecessor Trace ("Why is this blocked?")

**What changed:** Clicking the lock icon or "Blocked" badge on a blocked node now surfaces which predecessors are blocking it with red pulse rings, a fitView, and a chip bar / bottom sheet listing the blockers by title.

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| PT-1 | Single blocker (action) | 1. Open Morning Flow System → Breakfast subgraph 2. Click the lock icon on "Eat" | Cook gets a red pulse ring; viewport fits Eat + Cook; chip bar "Blocked by Cook" appears under Eat |
| PT-2 | Container blocker shows progress | 1. On root graph, click the "Blocked" badge on Breakfast | Workout pulses; chip shows "Blocked by Workout (25%)" |
| PT-3 | Chain of 3 blockers | 1. Build a graph A → B → C → D where A is todo 2. Click lock on D | Only C appears as a blocker (direct predecessor only); clicking C's chip frames C, which can itself be opened to reveal B |
| PT-4 | Dismiss via Esc | 1. Trigger a blocker spotlight 2. Press Esc | Chip bar/bottom sheet closes; pulse rings stop |
| PT-5 | Dismiss by clicking empty canvas | 1. Trigger spotlight 2. Click empty canvas pane | Chip bar closes; spotlight clears |
| PT-6 | Auto-dismiss after 4s | 1. Trigger spotlight 2. Do nothing for 4+ seconds | Chip bar disappears; pulse rings fade |
| PT-7 | Chip click jumps to blocker | 1. Trigger spotlight on Eat 2. Click the "Cook" chip | Spotlight closes; viewport re-frames Cook |
| PT-8 | Touch: bottom sheet instead of chip bar | 1. On mobile/touch device, tap the "Blocked" badge on a blocked node | Bottom sheet slides up listing blockers with ≥44px tap targets |
| PT-9 | Blocked state stays blocked after predecessor partial complete | 1. Mark some (not all) leaves of a container predecessor done 2. Click downstream node's blocker | Chip still lists the container with updated percentage |
| PT-10 | Unblocked nodes show no badge | 1. Mark all predecessors done on a previously-blocked node | "Blocked" badge and lock icon disappear; status cycling works again |

### Feature: Theme Toggle (Dark / Light)

**What changed:** A sidebar toggle switches between dark (default) and light themes. Surface colors (backgrounds, borders, text) are themed; semantic colors (red, amber, accents) are not.

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| TH-1 | Default is dark | 1. Fresh localStorage 2. Load app | Canvas, sidebar, top bar are dark |
| TH-2 | Toggle to light | 1. Click "Light theme" in sidebar | Canvas becomes light gray, sidebar white, text dark |
| TH-3 | Toggle back to dark | 1. Click "Dark theme" | Reverts to dark palette |
| TH-4 | Theme persists across reload | 1. Set light 2. Reload | Still light |
| TH-5 | ReactFlow dots re-theme | 1. Toggle to light | Background dots become lighter gray |
| TH-6 | ReactFlow controls re-theme | 1. Toggle to light | +/−/fit/lock buttons have light background |
| TH-7 | Semantic colors preserved | 1. Put a blocked node on canvas 2. Toggle light | Red "Blocked" badge remains red |
| TH-8 | Accent colors preserved | 1. Color a node red 2. Toggle light | Red accent bar still visible |
