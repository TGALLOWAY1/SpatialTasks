# iPhone Support Plan for SpatialTasks

Concrete implementation plan for making SpatialTasks work on both desktop and iPhone, organized into sequential phases. Each phase is independently shippable — the app improves incrementally with each one.

---

## Phase 0: Device Detection & Infrastructure

**Goal:** Establish the plumbing so all subsequent phases can branch behavior by platform.

### Files to create/modify
- **`src/hooks/useDeviceDetect.ts`** (new) — Custom hook exporting `{ isTouchDevice, isIOS, isMobile, screenSize }`. Uses `navigator.maxTouchPoints`, `window.matchMedia('(hover: none)')`, and viewport width breakpoints. No user-agent sniffing.
- **`src/index.html`** — Update viewport meta to `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1, user-scalable=no">`. The `maximum-scale=1, user-scalable=no` prevents Safari double-tap zoom. `viewport-fit=cover` enables safe-area insets.
- **`src/index.css`** — Add CSS custom properties for safe-area insets:
  ```css
  :root {
    --sat: env(safe-area-inset-top);
    --sar: env(safe-area-inset-right);
    --sab: env(safe-area-inset-bottom);
    --sal: env(safe-area-inset-left);
  }
  ```
- **`tailwind.config.js`** — Add custom screen breakpoint `'touch': {'raw': '(hover: none)'}` so we can use `touch:` prefix in Tailwind classes.

### Rationale
Every subsequent phase checks `isTouchDevice` to decide which interaction to render. Doing this first means no phase needs to invent its own detection.

---

## Phase 1: Touch Targets & Visual Sizing

**Goal:** Make every interactive element finger-friendly (44x44pt minimum).

### Changes

| Element | Current size | Target size | File |
|---------|-------------|-------------|------|
| Status icon button | 16x16px | 44x44pt tap area (icon stays 20px, padding expands hit area) | `ActionNode.tsx` |
| ReactFlow handles | 12x12px (`w-3 h-3`) | 20x20px visible + 44px invisible tap zone via `::after` pseudo-element | `index.css` (`.react-flow__handle` override) |
| Context menu items | ~36px tall | 48px tall with 16px horizontal padding | `ContextMenu.tsx` |
| Breadcrumb links | Text-only | `min-h-[44px] min-w-[44px]` with flex centering | `TopBar.tsx` |
| Undo/Redo buttons | `p-1.5` (30px) | `p-2.5` on mobile (44px) | `TopBar.tsx` |
| ReactFlow controls | 20x20px buttons | 36x36px buttons on mobile | `index.css` |
| Enter Subgraph button | 20x20px | 44x44pt tap zone | `ContainerNode.tsx` |
| Magic Expand button | 16x16px | 44x44pt tap zone | `ContainerNode.tsx` |

### Implementation approach
- Use the `touch:` Tailwind variant from Phase 0 to conditionally apply larger sizes: `touch:p-3 touch:min-h-[44px]`.
- For ReactFlow handles, add a CSS media query `@media (hover: none)` that enlarges `.react-flow__handle` and adds an `::after` pseudo-element with 44px hit zone.
- Desktop layout remains unchanged — all size changes are behind touch media queries.

---

## Phase 2: Replace Right-Click with Long-Press Action Sheet

**Goal:** Context menu works on touch devices via long-press, displayed as a bottom sheet.

### New component
- **`src/components/UI/ActionSheet.tsx`** — A bottom-sheet modal that slides up from the bottom of the screen. Takes the same `MenuItem[]` interface as `ContextMenu`. Renders items as large (48px) rows. Includes a "Cancel" dismiss row. Accounts for `var(--sab)` safe-area inset. Uses `position: fixed; bottom: 0` with a backdrop overlay.

### Modified files
- **`CanvasArea.tsx`** — Replace the three context menu handlers:
  - On desktop (mouse): keep existing `onNodeContextMenu` / `onEdgeContextMenu` / `onPaneContextMenu` behavior unchanged.
  - On touch: register long-press via `onTouchStart` / `onTouchEnd` timers (500ms threshold). On long-press, trigger haptic feedback via `navigator.vibrate(10)` and open the `ActionSheet` instead of `ContextMenu`.
  - Gate with `isTouchDevice` from Phase 0 hook.
- **`ContextMenu.tsx`** — Fix submenu interaction for the action sheet case: submenus render inline (expanded/collapsed) rather than on hover. When `ActionSheet` renders a menu item with a `submenu`, tapping it expands the submenu items in-place.

### Interaction flow (iPhone)
1. User long-presses a node → 500ms timer fires → phone vibrates → ActionSheet slides up
2. ActionSheet shows: "Set Status >" (expandable), "Delete" (red)
3. Tapping "Set Status" expands inline: Todo, In Progress, Done
4. Tapping an option executes it and dismisses the sheet
5. Tapping backdrop or "Cancel" dismisses

---

## Phase 3: Replace Double-Click with Tap-to-Select + Edit Button

**Goal:** Title editing and quick-add work on touch without relying on double-tap.

### ActionNode.tsx changes
- Keep `onDoubleClick` for desktop.
- On touch: when a node is selected (tapped), show a small floating "Edit" button above the node (absolutely positioned, 44px). Tapping "Edit" enters inline edit mode. Alternatively, the edit action is available in the long-press ActionSheet from Phase 2.

### ContainerNode.tsx changes
- Same pattern: selected container shows an "Edit Title" button.

### CanvasArea.tsx — Replace double-click quick-add
- Remove `onDoubleClick={handlePaneDoubleClick}` on touch devices.
- Add a **Floating Action Button (FAB)**: a `+` button fixed at `bottom: calc(24px + var(--sab)); right: 24px`, 56px diameter, purple background.
- Tapping the FAB opens a bottom-sheet input for the new task name. On submit, the node is placed at the center of the current viewport (via `reactFlowInstance.getViewport()`).

### New component
- **`src/components/UI/FloatingActionButton.tsx`** — Renders only on touch devices. A circular button with a `+` icon. Fixed position, bottom-right, respects safe area.

---

## Phase 4: Mobile Toolbar (Replaces Keyboard Shortcuts)

**Goal:** Undo, Redo, Delete, and Select-mode are accessible without a keyboard.

### TopBar.tsx changes
- On touch devices, the TopBar gets a second row (or the existing buttons enlarge):
  - **Undo** button (already exists, just ensure 44pt)
  - **Redo** button (already exists, just ensure 44pt)
  - **Delete** button (new, Trash2 icon) — enabled when nodes/edges are selected, executes the same logic as the keyboard Delete handler in `CanvasArea.tsx`
  - **Select Mode** toggle (new, BoxSelect icon) — toggles between pan-mode and box-select-mode

### CanvasArea.tsx changes
- Add a `selectMode` state (boolean), toggled by the toolbar button.
- When `selectMode` is true: set ReactFlow's `panOnDrag={false}` and `selectionOnDrag={true}`.
- When `selectMode` is false (default on mobile): set `panOnDrag={true}` and `selectionOnDrag={false}`.
- Extract the delete-selected logic from the `useEffect` keyboard handler into a shared `deleteSelected()` function that both the keyboard handler and the toolbar button call.

### Store addition
- Add `selectMode: boolean` and `toggleSelectMode()` to the workspace store (or keep it as local component state in CanvasArea if we prefer not to persist it).

---

## Phase 5: Tap-to-Connect Edge Mode

**Goal:** Creating dependency edges works with finger-sized taps instead of handle-dragging.

### New state
- Add to workspace store (or CanvasArea local state): `connectMode: { active: boolean; sourceNodeId?: string }`.

### UI changes
- **TopBar.tsx** or **FAB area** — Add a "Connect" toggle button (Link icon). When active, it highlights in purple.
- **CanvasArea.tsx**:
  - When `connectMode.active` is true and user taps a node:
    - If no `sourceNodeId` set → set it, highlight that node with a pulsing border.
    - If `sourceNodeId` is already set → create an edge from source to tapped node (reusing existing `onConnect` logic), then clear connect mode.
    - Tapping the canvas (not a node) or pressing the toggle again cancels.
  - When `connectMode.active` is true, disable node dragging (`draggable: false` on all nodes) to prevent accidental moves.
- **ActionNode.tsx / ContainerNode.tsx** — When a node is the "connect source", render with a distinct pulsing border (e.g., `ring-4 ring-purple-500 animate-pulse`).

### Desktop behavior
- The handle-drag approach remains unchanged. Connect mode is an additional option available on both platforms but primarily useful on mobile.

---

## Phase 6: Remove Hover Dependencies & Fix CSS

**Goal:** All hover-dependent interactions have touch equivalents; no "stuck" hover states.

### index.css changes
- Wrap all `:hover` styles in `@media (hover: hover)` so they only apply on devices that actually support hover:
  ```css
  @media (hover: hover) {
    .react-flow__controls-button:hover { background: #374151; }
    .react-flow__controls-button:hover svg { fill: #e5e7eb; }
  }
  ```

### Component changes
- **ContextMenu.tsx** — Submenu `onMouseEnter`/`onMouseLeave` → on touch, use `onClick` to toggle submenu visibility. (Largely handled by Phase 2's ActionSheet, but the desktop ContextMenu should also not break if accessed on a touch-capable laptop.)
- **ActionNode.tsx** — `hover:scale-125` on status icon → wrap in `@media (hover: hover)` or use `hover:md:scale-125` equivalent.
- **ContainerNode.tsx** — Same for Magic Expand and Enter buttons' hover effects.
- **TopBar.tsx** — `hover:text-white` and `hover:bg-gray-700` → gate behind hover media query.

### Active states
- Add `:active` equivalents for touch feedback:
  ```css
  @media (hover: none) {
    button:active { opacity: 0.7; transform: scale(0.95); }
  }
  ```

---

## Phase 7: Performance Optimizations for Mobile Safari

**Goal:** Smooth 60fps panning and dragging on iPhone.

### Changes
- **CanvasArea.tsx** — On mobile, set `animated={false}` on all edges (remove the SVG dash animation). This is the single biggest performance win for ReactFlow on mobile Safari.
  ```tsx
  animated: isTouchDevice ? false : true,
  ```
- **index.css** — Add `will-change: transform` to `.react-flow__nodes` and `.react-flow__edges` to promote them to GPU layers.
- **ActionNode.tsx / ContainerNode.tsx** — Replace `transition-all` (which transitions every property) with explicit `transition-transform transition-opacity` to reduce composite cost.
- **CanvasArea.tsx** — On mobile, throttle `onNodesChange` position updates to 1 call per animation frame using `requestAnimationFrame`:
  ```tsx
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    if (isTouchDevice) {
      rafRef.current = requestAnimationFrame(() => { /* apply changes */ });
    } else {
      /* apply immediately */
    }
  }, [...]);
  ```

---

## Phase 8: Replace `window.confirm()` with Custom Modal

**Goal:** Deletion confirmations feel native on both platforms.

### New component
- **`src/components/UI/ConfirmModal.tsx`** — A centered modal with title, message, Cancel and Confirm buttons. On mobile, buttons are full-width and stacked (iOS style). On desktop, buttons are side-by-side. Uses the same dark theme as the rest of the app.

### Modified files
- **CanvasArea.tsx** — Replace all `window.confirm()` calls with `ConfirmModal` (controlled via state: `confirmAction: { message: string; onConfirm: () => void } | null`).
- **ContainerNode.tsx** — Same replacement for the Magic Expand confirmation.

---

## Phase 9: Fixed Overlay & Keyboard Awareness

**Goal:** Overlays (quick-add input, modals) don't get hidden behind the iOS virtual keyboard.

### Changes
- **CanvasArea.tsx** — The quick-add input (Phase 3 replaces this with a bottom-sheet, but if we keep any `position: fixed` overlays):
  - Use the Visual Viewport API (`window.visualViewport`) to detect keyboard presence and adjust overlay position.
  - Subscribe to `visualViewport.onresize` and offset `bottom` by `window.innerHeight - visualViewport.height`.
- **ActionSheet.tsx / ConfirmModal.tsx** — Bottom-anchored sheets already naturally push above the keyboard on iOS when using `position: fixed; bottom: 0` combined with the Visual Viewport adjustment.
- **index.css** — Ensure `body` does not scroll when modals/sheets are open (already have `overflow: hidden` on body, but verify no iOS Safari bounce scroll leaks through — add `-webkit-overflow-scrolling: touch` containment if needed).

---

## Phase 10: Responsive Sidebar

**Goal:** The sidebar works on a small screen without permanently eating canvas space.

### Changes
- **`src/components/Layout/Sidebar.tsx`**:
  - On mobile: render as a slide-over drawer (off-screen left, slides in on toggle).
  - Add a hamburger menu button to the TopBar (visible only on mobile) that toggles the drawer.
  - When open, show a semi-transparent backdrop; tapping it closes the drawer.
  - Drawer width: `80vw` (max 320px).
- **`src/App.tsx`**:
  - On desktop: keep the current `flex` layout with sidebar always visible.
  - On mobile: sidebar is `position: fixed` overlay, initially hidden.
- **TopBar.tsx** — Add hamburger `Menu` icon button (left side, before breadcrumbs) visible only on mobile.

---

## Implementation Order & Dependencies

```
Phase 0  (infrastructure)
  │
  ├── Phase 1  (touch targets) ── can ship standalone
  ├── Phase 6  (hover fixes)   ── can ship standalone
  ├── Phase 7  (performance)   ── can ship standalone
  │
  ├── Phase 2  (action sheet)  ── needed before Phase 3
  │     └── Phase 3  (edit + FAB)
  │
  ├── Phase 4  (toolbar)       ── independent
  ├── Phase 5  (connect mode)  ── independent
  ├── Phase 8  (confirm modal) ── independent
  ├── Phase 9  (keyboard-aware overlays) ── after Phases 2-3
  └── Phase 10 (responsive sidebar) ── independent
```

Phases 1, 4, 5, 6, 7, 8, and 10 are all independent of each other and can be built in parallel or any order after Phase 0.

---

## New Files Summary

| File | Purpose |
|------|---------|
| `src/hooks/useDeviceDetect.ts` | Device/platform detection hook |
| `src/components/UI/ActionSheet.tsx` | Bottom-sheet context menu for touch |
| `src/components/UI/FloatingActionButton.tsx` | FAB for quick-add on mobile |
| `src/components/UI/ConfirmModal.tsx` | Custom confirmation dialog |

## Modified Files Summary

| File | Phases |
|------|--------|
| `src/index.html` | 0 |
| `src/index.css` | 0, 1, 6, 7, 9 |
| `tailwind.config.js` | 0 |
| `src/components/Canvas/CanvasArea.tsx` | 1, 2, 3, 4, 5, 7, 8 |
| `src/components/Nodes/ActionNode.tsx` | 1, 3, 5, 6, 7 |
| `src/components/Nodes/ContainerNode.tsx` | 1, 3, 5, 6, 7, 8 |
| `src/components/UI/ContextMenu.tsx` | 1, 6 |
| `src/components/Layout/TopBar.tsx` | 1, 4, 5, 6, 10 |
| `src/components/Layout/Sidebar.tsx` | 10 |
| `src/App.tsx` | 10 |
| `src/store/workspaceStore.ts` | 4, 5 (if storing selectMode/connectMode in global state) |

---

## What This Plan Does NOT Include

- **Native app (React Native / Capacitor):** This plan keeps SpatialTasks as a web app accessed via Safari. A native wrapper is a separate future effort.
- **Offline PWA:** Service workers, manifest, and caching are out of scope but would be a natural Phase 11.
- **iPad-specific layouts:** iPad gets the "desktop" experience since it has hover (with trackpad), large screen, and keyboard support. The touch adaptations apply on iPad when using fingers.
