# iPhone Incompatibilities

Features and interactions in SpatialTasks that will not translate directly to an iPhone version of the app. Each section describes the desktop feature, why it breaks on iOS, and suggested alternatives.

---

## Right-Click Context Menu

**Desktop behavior:** Right-click on nodes, edges, or the canvas pane opens a context menu with actions (delete, set status, create node).

**Why it breaks on iPhone:** iOS has no right-click. Long-press is intercepted by the OS for text selection, link previews, and haptic touch menus. Safari and WebKit don't fire `contextmenu` events reliably on mobile.

**Suggested alternative:** Use a long-press gesture with haptic feedback (via the Haptic API) to trigger a native-style action sheet or bottom drawer menu.

---

## Double-Click to Edit Title / Double-Click Canvas to Add Node

**Desktop behavior:** Double-clicking a node title enters inline edit mode. Double-clicking empty canvas space opens a quick-add text input.

**Why it breaks on iPhone:** Double-tap on iOS triggers zoom by default. Even when zoom is disabled via `<meta name="viewport">`, double-tap detection competes with single-tap selection and has a 300ms delay. ReactFlow's double-click event detection is unreliable on touch devices.

**Suggested alternative:** Use a single-tap to select + an "Edit" button in a toolbar or bottom sheet. For quick-add, use a floating action button (FAB) that places a node at the viewport center or allows drag-to-position.

---

## Keyboard Shortcuts (Delete, Undo/Redo)

**Desktop behavior:** Backspace/Delete removes selected nodes and edges. Ctrl+Z/Ctrl+Shift+Z for undo/redo.

**Why it breaks on iPhone:** iPhones have no physical keyboard in typical use. The virtual keyboard only appears for text input fields. There's no way to detect Backspace/Delete key presses when not focused on a text input.

**Suggested alternative:** Add a persistent toolbar or contextual action bar with Undo, Redo, and Delete buttons. iOS shake-to-undo could supplement but isn't discoverable.

---

## Drag-to-Connect Edges (Handle Dragging)

**Desktop behavior:** Click and drag from a source handle to a target handle to create a dependency edge.

**Why it breaks on iPhone:** ReactFlow handles are 12x12px — too small for reliable finger targeting (Apple's minimum recommended touch target is 44x44pt). Touch-drag on small handles conflicts with node dragging and canvas panning. Multi-touch disambiguation makes this interaction frustrating.

**Suggested alternative:** Use a "connect mode" toggle: tap source node, then tap target node to create an edge. Or enlarge handles significantly and use a distinct visual mode for connecting.

---

## Drag-to-Select (Box Selection)

**Desktop behavior:** Click and drag on empty canvas to draw a selection rectangle around multiple nodes.

**Why it breaks on iPhone:** Drag on canvas pans the viewport. There's no modifier key (Shift) available to disambiguate pan vs. select. Touch-drag box selection feels unnatural on small screens.

**Suggested alternative:** Add a "Select Mode" toggle button that changes canvas drag behavior from pan to selection. Or use tap-to-select with multi-select via a persistent "Select Multiple" mode.

---

## Hover States and Tooltips

**Desktop behavior:** Status icon shows hover:scale-125 effect. Buttons show hover:text-white transitions. Context menu submenus appear on hover.

**Why it breaks on iPhone:** iOS has no hover state — `:hover` CSS only triggers on first tap and persists until tapping elsewhere. Submenu-on-hover in the context menu is completely non-functional.

**Suggested alternative:** Remove hover-dependent interactions entirely. Use tap-to-expand for submenus. Rely on press states (`:active`) for visual feedback.

---

## Small Touch Targets

**Desktop behavior:** Status icon buttons (16x16px), ReactFlow handles (12x12px), breadcrumb navigation links, and context menu items are all sized for mouse precision.

**Why it breaks on iPhone:** Apple Human Interface Guidelines require minimum 44x44pt touch targets. Most interactive elements in the current UI are well below this threshold. Users will frequently mis-tap.

**Suggested alternative:** Increase all interactive element sizes to at least 44x44pt. Use bottom sheets instead of compact context menus. Consider a completely different node layout optimized for touch.

---

## ReactFlow Canvas Performance

**Desktop behavior:** ReactFlow renders smoothly with many nodes, animated edges, and continuous position updates during drag.

**Why it breaks on iPhone:** SVG rendering of animated edges is expensive on mobile Safari. Continuous re-renders during drag cause frame drops. ReactFlow's internal event handling (mouse events, wheel events) doesn't fully support touch equivalents. WebKit's compositor has different batching behavior than desktop browsers.

**Suggested alternative:** Reduce animation complexity on mobile (disable animated edges). Use CSS transforms instead of SVG updates during drag. Consider react-native alternatives like react-native-graph for a native app.

---

## window.confirm() Dialogs

**Desktop behavior:** Browser `window.confirm()` used for container deletion confirmation.

**Why it breaks on iPhone:** `window.confirm()` works on iOS Safari but feels non-native and jarring. In a React Native or PWA context, it may not work at all. The modal blocks the JS thread.

**Suggested alternative:** Use custom modal components styled to match iOS conventions, or use the native ActionSheet API via React Native.

---

## Fixed-Position Overlays (Quick-Add Input, Context Menu)

**Desktop behavior:** Quick-add input and context menu use `position: fixed` with exact pixel coordinates from mouse events.

**Why it breaks on iPhone:** iOS Safari has known issues with `position: fixed` when the virtual keyboard is open (viewport shifts). Touch coordinates from `clientX/clientY` may not account for Safari's dynamic toolbar height changes. Elements can appear behind the keyboard or outside visible viewport.

**Suggested alternative:** Use bottom-anchored sheets or modals that account for safe area insets and keyboard presence. Use the Visual Viewport API to calculate correct positioning.

---

## Summary

| Feature | Severity | Mobile Alternative |
|---------|----------|-------------------|
| Right-click context menu | **High** | Long-press action sheet |
| Double-click interactions | **High** | Single-tap + toolbar buttons |
| Keyboard shortcuts | **High** | Persistent toolbar with buttons |
| Drag-to-connect edges | **High** | Tap-source-then-tap-target mode |
| Box selection | **Medium** | Select mode toggle |
| Hover states | **Medium** | Remove; use active/press states |
| Small touch targets | **High** | Enlarge to 44pt minimum |
| Canvas performance | **Medium** | Reduce animations, optimize rendering |
| window.confirm() | **Low** | Custom modal dialogs |
| Fixed overlays | **Medium** | Bottom sheets with safe area awareness |
