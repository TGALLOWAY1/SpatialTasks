# SpatialTasks — Expected UI Behaviors

> A specification of what users should experience across every interaction in the app.
> Focused on **web/desktop as the primary platform**; mobile/touch noted as secondary.

---

## 1. Node Creation

### Desktop (Primary)

- **Double-click canvas** → An inline text input appears at the click location. The user types a name and presses Enter to create the node. Pressing Escape or clicking away cancels without creating anything.
- **Keyboard shortcut (`N` for task, `G` for group)** → A new node appears at the viewport center and **immediately enters edit mode** with the title field focused and its text fully selected (or empty with a placeholder like "Task name..."). The user should be able to start typing the name right away without any extra clicks or deletions.
- **Context menu → "New Action Node" / "New Container"** → Same as keyboard shortcut: the node appears and immediately enters edit mode with the name ready to type.
- **General principle**: Creating a node and naming it should feel like a single fluid action. The user should never have to click multiple times or delete placeholder text like "New Task" after creating a node.

### Mobile (Secondary)

- **Floating Action Button (FAB)** → A bottom sheet opens with a text input. The user types a name and taps "Add". The input should auto-focus so the keyboard appears immediately.

---

## 2. Node Title Editing

### Entering Edit Mode

- **Double-click** the title text on a node → enters inline edit mode. This is the standard, discoverable interaction.
- **Single-click on an already-selected node's title** → also enters edit mode (mirrors file-rename behavior in OS file managers: first click selects, second click on the name opens editing).
- **Single-click on an unselected node** → selects the node only; does **not** enter edit mode. This prevents accidental edits when the user just wants to select or drag.

### While Editing

- The title text should be **fully selected** when entering edit mode, so the user can immediately type a replacement without needing to select-all or delete the existing text first.
- The textarea/input should be **auto-focused** — no additional click needed to start typing.
- **Enter** (without Shift) → saves the title and exits edit mode.
- **Shift+Enter** → inserts a line break (for multi-line titles).
- **Escape** → cancels the edit, reverts to the previous title, and exits edit mode. The node should remain selected.
- **Click outside the node** (canvas background) → saves the current text and exits edit mode.
- Typing should feel immediate with no lag or flicker.
- An empty title should not be allowed — if the user clears the text and presses Enter or clicks away, the title reverts to its previous value.

### Visual Feedback

- A subtle edit cursor or pencil icon should indicate the title is editable on hover.
- When in edit mode, the text field should have a visible underline or border to distinguish it from the display state.

---

## 3. Node Selection & Deselection

- **Single click on a node** → selects it (deselects all other nodes/edges unless Shift is held).
- **Shift+click** → toggles the node's selection without affecting other selections (multi-select).
- **Click on empty canvas** → deselects all nodes and edges.
- **Selected node visual** → clear border/glow change (e.g., purple ring for action nodes, indigo for containers).
- Selection state should feel instant — no perceptible delay between click and visual feedback.
- Selecting a node should NOT trigger any editing, panel opening, or state change beyond updating the visual selection indicator.

---

## 4. Escape Key Behavior

Escape should be **layered and contextual**, dismissing the deepest active interaction first. Each press of Escape should peel back one layer:

| Priority | Active State | Escape Action | Result |
|----------|-------------|--------------|--------|
| 1 (highest) | Editing a node title | Exit edit mode (revert unsaved changes) | Node stays selected |
| 2 | Notes editor is open | Close notes editor | Node stays selected |
| 3 | Context menu / action sheet is open | Close the menu | Previous state preserved |
| 4 | Quick-add input is visible | Close the input | Canvas returns to normal |
| 5 | Connect mode is active | Exit connect mode | Canvas returns to normal |
| 6 | Nodes/edges are selected | Deselect all | Clean canvas state |
| 7 (lowest) | Nothing active | No action (no-op) | — |

**Key principle**: Pressing Escape while editing should **only** exit editing. It should NOT also deselect the node or close other UI elements. Each Escape press handles exactly one layer.

---

## 5. Background / Canvas Click

Clicking on empty canvas space (not on any node, edge, or UI element) should:

1. **Deselect** all selected nodes and edges.
2. **Close** any open context menu, action sheet, or quick-add input.
3. **Exit** connect mode if active.
4. **Save and exit** any node currently in edit mode (the blur event on the textarea should trigger a save).

The result should be a "clean slate" — no selections, no open menus, no active modes. This gives the user a reliable way to reset the canvas to a neutral state.

---

## 6. Drag & Drop

### Node Dragging

- **Click and drag** a node → moves it to a new position on the canvas. The node should follow the cursor smoothly.
- Dragging should NOT accidentally trigger edit mode. The distinction between a click (select/edit) and a drag (move) should be based on a small movement threshold.
- **Cursor feedback**: `grab` cursor on hover, `grabbing` cursor while dragging.
- Releasing the drag commits the new position.
- Dragging a selected node that is part of a multi-selection moves all selected nodes together, maintaining their relative positions.

### Selection Box (Drag-Select)

- **Shift+drag** on empty canvas → draws a selection rectangle. All nodes within the rectangle are selected on release.
- The selection box should have a visible semi-transparent fill and border.

---

## 7. Edge / Connection Creation

### Desktop

- **Drag from a source handle** (right side of a node) **to a target handle** (left side of another node) → creates a dependency edge.
- During the drag, a temporary line should follow the cursor from the source handle to provide visual feedback.
- Releasing on empty canvas (not on a valid target) → cancels the connection attempt without side effects.
- **Self-loops** (connecting a node to itself) should be silently prevented.
- **Duplicate edges** between the same source and target should be silently prevented.
- Created edges should render immediately with a smooth animation.

### Mobile

- A "Connect Nodes" mode should be available from the overflow menu.
- Tap source node → tap target node → edge is created.
- Clear instruction text should guide the user through the two-step process.
- Tapping the same node twice (as source and target) should not create a self-loop.

### Edge Deletion

- **Right-click on an edge** → context menu with "Remove Dependency" option.
- Selecting an edge and pressing Delete/Backspace → removes the edge.

---

## 8. Keyboard Shortcuts

All shortcuts should only fire when the canvas has focus (not when typing in an input/textarea).

| Shortcut | Action |
|----------|--------|
| `N` | Create a new action node at viewport center (auto-edit mode) |
| `G` | Create a new container node at viewport center (auto-edit mode) |
| `Delete` / `Backspace` | Delete selected nodes and edges |
| `Ctrl/Cmd+Z` | Undo |
| `Ctrl/Cmd+Shift+Z` | Redo |
| `Ctrl/Cmd+A` | Select all nodes |
| `Ctrl/Cmd+Shift+F` | Fit view (zoom to show all nodes) |
| `Escape` | Layered dismiss (see section 4) |
| `Arrow Right` | Navigate to the next connected node (follow edge forward) |
| `Arrow Left` | Navigate to the previous connected node (follow edge backward) |
| `Arrow Up/Down` | Navigate between sibling nodes (parallel tasks) |

**When typing in a text field**: All canvas shortcuts should be suppressed. Only Enter, Escape, and Shift+Enter should have special behavior within the text field. Standard text editing shortcuts (Ctrl+A to select all text, Ctrl+Z to undo text, etc.) should work normally within the field.

---

## 9. Context Menus

### Trigger

- **Right-click** on a node, edge, or empty canvas → shows a context menu at the cursor position.

### Dismissal

- **Click outside** the menu → closes it.
- **Escape** → closes it.
- **Click a menu item** → executes the action and closes the menu.

### Menu Items by Target

- **On a single node**: Set Status (submenu: Todo, In Progress, Done), Delete
- **On multiple selected nodes**: Set Status (batch, submenu), Delete N Nodes (with count)
- **On an edge**: Remove Dependency
- **On empty canvas**: New Action Node, New Container

### Behavior

- Menu should appear at the cursor position, constrained to stay within the viewport.
- Submenus should expand on hover (desktop).
- Dangerous actions (Delete) should be visually distinct (red text).
- When deleting containers with children, a confirmation dialog should appear.

---

## 10. Navigation

### Breadcrumbs

- The top bar should show the navigation path: `Home > Project Name > Container 1 > Container 2`
- Each breadcrumb segment should be clickable to jump directly to that level.
- The current level should be visually distinct (e.g., not clickable, different weight).

### Drilling Into Containers

- **Click the enter/arrow button** on a container node → navigates into the container's child graph.
- The breadcrumb updates to show the new level.
- If the container has no child graph yet, one is created automatically.

### Going Back

- **Click a parent breadcrumb** → navigates back to that level.
- **Browser-like back** behavior: the viewport state (zoom/pan) of the previous level should be preserved when returning.

### Mobile Navigation

- **Swipe right from the left edge** → navigates back one level (like mobile browser back gesture).

---

## 11. Status Cycling

- **Click the status icon** (left side of an action node) → cycles through: Todo → In Progress → Done → Todo.
- The status icon should update immediately with appropriate visual feedback (icon change, color change).
- **Blocked nodes** (those with unsatisfied dependencies) show a lock icon in place of the status circle. Clicking the lock does NOT cycle status — it surfaces the blockers (see §11a).
- Cycling status should be a single-click action — no menus or extra steps.
- Status can also be set via right-click context menu → Set Status submenu, which allows jumping directly to any status.

## 11a. Blocked Node Interaction ("Why is this blocked?")

- Every node with unsatisfied predecessors shows a red **"Blocked"** badge on its top-right corner in addition to the lock on the status icon.
- **Clicking the lock icon OR the "Blocked" badge** on a blocked node opens the **predecessor trace**:
  - Each blocking predecessor gets a red pulse ring (2 cycles, ~2.4s) overlayed on its node.
  - The viewport auto-fits to include the blocked node and its blockers (400ms animation).
  - A chip bar anchored under the blocked node lists each blocker: `Blocked by <Title>`. Container blockers show progress: `<Title> (42%)`.
  - On small/touch screens, the chip bar is replaced by a bottom sheet with 44×44 tap targets.
- **Clicking a blocker chip/row** dismisses the spotlight and frames the blocker on screen (and selects it when possible).
- **Dismissal**: Esc, clicking empty canvas, the × button on the chip bar, or after a 4-second timeout.
- Blocker resolution is refreshed on each open — stale blockers won't be shown.

---

## 12. Undo / Redo

- **Ctrl/Cmd+Z** → undoes the last action. Should cover all state mutations: node creation, deletion, movement, title edits, status changes, edge operations, etc.
- **Ctrl/Cmd+Shift+Z** → redoes the last undone action.
- Undo/redo buttons should also be available in the top bar (desktop) and overflow menu (mobile).
- Buttons should be disabled (grayed out) when there is no history to undo/redo.
- Undo/redo should feel instant — no loading or delay.

---

## 13. Canvas Operations

### Panning

- **Click and drag on empty canvas** → pans the viewport.
- Panning should feel smooth and responsive, 1:1 with cursor movement.

### Zooming

- **Mouse scroll wheel** → zooms in/out, centered on the cursor position.
- Zoom should have reasonable min/max bounds (e.g., 0.08x to 2.5x).
- **Pinch-to-zoom** on trackpads and touch devices.

### Fit View

- **Ctrl/Cmd+Shift+F** → zooms and pans to fit all nodes in the viewport with comfortable padding.
- A fit-view button should be available in the controls (desktop) and as a floating button (mobile).

### Controls

- Desktop: pan/zoom control buttons in a corner of the canvas.
- Desktop: a minimap showing an overview of the full graph, with the current viewport highlighted.
- Mobile: controls and minimap are hidden to maximize canvas space; fit-view is a floating button.

---

## 14. Multi-Select

- **Shift+click** individual nodes → toggles each node in/out of the selection.
- **Drag on empty canvas while holding Shift** → draws a selection box; all nodes within are selected on release.
- **Ctrl/Cmd+A** → selects all nodes in the current graph.
- Selected nodes should have a consistent visual indicator (highlight/border).
- **Batch operations** on multi-selected nodes:
  - **Delete/Backspace** → deletes all selected nodes (with confirmation if any are containers with children).
  - **Right-click** → context menu offers batch status change and batch delete.
- **Drag** any selected node → moves all selected nodes together.

---

## 15. Delete Operations

- **Delete/Backspace key** with nodes/edges selected → deletes all selected items.
- **Right-click → Delete** on a single node → deletes that node.
- **Confirmation required** when deleting:
  - Container nodes that have children (warns about recursive deletion).
  - Multiple nodes at once (shows count).
- **No confirmation** for deleting:
  - Single action nodes (leaf tasks).
  - Edges.
- Deleted items should be recoverable via Undo (Ctrl/Cmd+Z).
- After deletion, selection should be cleared.

---

## 16. Notes Editing

- **Click the notes icon** (visible when a node is selected) → opens the notes editor.
- **Desktop**: notes editor appears as a popover below/beside the node. An expand button opens a full-screen modal.
- **Mobile**: notes editor always opens as a full-screen modal.
- **Save** button → saves notes and closes the editor.
- **Escape** → closes the editor without saving unsaved changes.
- **Click outside** the popover → closes and saves (consistent with blur-to-save on titles, but explicit save button should also be available).
- Notes that contain URLs should render them as clickable links.
- A copy-to-clipboard button should be available for the full notes content.
- The notes icon should visually indicate whether notes exist (e.g., filled vs. outline, color change).

---

## 17. Focus Management

- **Tab order**: Interactive elements should follow a logical tab order. When a node is selected, Tab might move to the next node or to the node's interactive elements (status, title, notes).
- **Auto-focus**: When entering edit mode (title or notes), the text field should auto-focus immediately — no extra click needed.
- **Focus trapping**: Modals (confirmation dialogs, full-screen editors) should trap focus within themselves. Tab should cycle through the modal's interactive elements, not escape to the canvas behind.
- **Focus restoration**: When closing a modal or exiting edit mode, focus should return to a sensible element (the node, or the canvas).
- **No phantom focus**: Clicking the canvas background should move focus to the canvas container, not leave focus on a hidden or off-screen element.

---

## 18. Execution Mode

- **Toggle** between Planning and Execution mode via a button in the top bar.
- **In Execution mode**:
  - Actionable nodes (not blocked, not done) should be visually highlighted (e.g., amber glow, slight scale-up).
  - Non-actionable nodes should be visually dimmed (reduced opacity, grayscale).
  - A "Next" button appears on actionable action nodes — clicking it marks the node as done and auto-pans to the next actionable node.
  - A "Dive In" button appears on actionable container nodes — clicking it navigates into the container's sub-graph.
- **When inside a container in Execution mode**: A step detail panel should appear showing the parent container's info, child task progress, and a "Complete and Move On" button.
- Toggling back to Planning mode should immediately restore normal visual styling to all nodes.

---

## 19. AI Features (Gemini Integration)

### Magic Expand (Container Nodes)

- Available only when a Gemini API key is configured.
- **Click the sparkle icon** on a container node → AI generates subtasks with dependency edges inside the container.
- If the container already has children, a confirmation dialog should ask before replacing them.
- A loading spinner should appear during generation.
- Success/failure should be communicated via a toast notification.

### Flow Generator

- Accessible from the sidebar.
- User enters a prompt describing the workflow they want.
- AI generates a complete project structure with nodes and edges.
- A review panel should show the generated structure before committing it to the canvas.
- "Regenerate" button allows trying again with the same prompt.
- "Create on Canvas" commits the result as a new project.

---

## 20. Visual & Interaction Consistency

- **Cursor hints**: All interactive elements should have appropriate cursors (`pointer` for buttons, `text` for editable text, `grab`/`grabbing` for draggable nodes, `ew-resize` for resize handles).
- **Hover states**: Buttons and interactive elements should have visible hover feedback (color change, scale, or opacity shift).
- **Transitions**: State changes (selection, status, mode toggles) should have brief, smooth transitions (~200ms) — enough to be noticeable but not slow.
- **Toast notifications**: Important actions (node creation via AI, errors, clipboard copy) should show brief, auto-dismissing toast messages.
- **Loading states**: Any async operation (AI generation, save) should show a spinner or loading indicator. The UI should not freeze or become unresponsive.
- **Error handling**: Errors should be communicated clearly via toasts or inline messages — never silently swallowed.
