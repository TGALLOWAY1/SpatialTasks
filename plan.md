# Implementation Plan: Task Editing Features

## Overview

Eight features grouped into 4 implementation batches. Batches are ordered by dependency — later batches build on earlier ones. Within each batch, work is parallelizable across files.

---

## Batch 1: Store Foundation (delete + status cycle + edge connect)

These three features share a common prerequisite: store methods. They can be built together because they touch different parts of the codebase.

### 1A. Add `removeNode` and `removeEdge` to the store

**File:** `src/store/workspaceStore.ts`

Add two new methods to `WorkspaceState`:

```
removeNode(nodeId: string): void
removeEdge(edgeId: string): void
```

**`removeNode` logic:**
- Find the node in the active graph
- If it's a container with a `childGraphId`, recursively collect all descendant graph IDs (the child graph, plus any container nodes inside it that have their own childGraphIds, etc.)
- Remove the node from the active graph's `nodes` array
- Remove all edges in the active graph where `source === nodeId` or `target === nodeId`
- Delete all collected descendant graphs from the `graphs` record
- Use a helper function `collectDescendantGraphIds(graphId, graphs)` to walk the tree

**`removeEdge` logic:**
- Find the edge in the active graph by ID
- Filter it out of the graph's `edges` array

### 1B. Add `cycleNodeStatus` convenience method

**File:** `src/store/workspaceStore.ts`

```
cycleNodeStatus(nodeId: string): void
```

- Reads current node status
- Cycles: `todo` → `in_progress` → `done` → `todo`
- Calls the existing `updateNode` internally
- This is a convenience — the UI could call `updateNode` directly, but a dedicated method keeps the cycle logic centralized

### 1C. Add `onConnect` handler support

**File:** `src/store/workspaceStore.ts`

No new store method needed — `addEdge` already exists. The wiring happens in CanvasArea (Batch 2).

---

## Batch 2: Wire features into the Canvas and Node components

### 2A. Status toggle click handler on ActionNode

**File:** `src/components/Nodes/ActionNode.tsx`

**Changes:**
- Import `cycleNodeStatus` from the store (or use `updateNode` with inline cycle logic)
- Wrap the `<StatusIcon>` in a `<button>` element
- `onClick` handler: call `cycleNodeStatus(data.id)` with `e.stopPropagation()` to avoid selecting the node
- Add `cursor-pointer` and hover styles to the status icon button (e.g., `hover:scale-125 transition-transform`)
- Skip cycling if `isBlocked` is true (blocked tasks shouldn't be toggled)

### 2B. Double-click inline title editing on both node types

**File:** `src/components/Nodes/ActionNode.tsx` and `src/components/Nodes/ContainerNode.tsx`

**Shared approach (implement in both files):**
- Add local state: `const [editing, setEditing] = useState(false)` and `const [editValue, setEditValue] = useState(data.title)`
- On the title `<span>`, add `onDoubleClick={() => { setEditing(true); setEditValue(data.title); }}`
- When `editing` is true, render an `<input>` instead of the `<span>`:
  ```tsx
  <input
    className="bg-transparent border-b border-slate-500 outline-none text-sm text-slate-200 w-full"
    value={editValue}
    onChange={e => setEditValue(e.target.value)}
    onKeyDown={e => {
      if (e.key === 'Enter') { save(); }
      if (e.key === 'Escape') { setEditing(false); }
    }}
    onBlur={save}
    autoFocus
  />
  ```
- `save()` function: if `editValue.trim()` is non-empty and different from `data.title`, call `updateNode(data.id, { title: editValue.trim() })`. Then `setEditing(false)`.
- Add `e.stopPropagation()` on the input's mouse events to prevent ReactFlow from interpreting clicks as drags

### 2C. Delete nodes/edges via keyboard

**File:** `src/components/Canvas/CanvasArea.tsx`

**Changes:**
- Import `removeNode` and `removeEdge` from the store
- Track selected nodes/edges using ReactFlow's `onSelectionChange` callback or by adding `onNodesChange`/`onEdgesChange` handlers that track selection state
- Add a `useEffect` with a `keydown` listener for `Backspace` and `Delete`:
  ```
  - Get currently selected nodes and edges from ReactFlow instance
  - For each selected edge: call removeEdge(edge.id)
  - For each selected node:
    - If it's a container with children: show window.confirm() dialog
    - Call removeNode(node.id)
  ```
- ReactFlow provides `useReactFlow()` hook to get `getNodes().filter(n => n.selected)` and `getEdges().filter(e => e.selected)`
- Wrap the ReactFlow component to ensure keyboard events are captured (the ReactFlow container needs `tabIndex={0}`)
- Also handle ReactFlow's built-in `onNodesDelete` and `onEdgesDelete` callbacks as an alternative/complement

### 2D. Drag-to-connect edges

**File:** `src/components/Canvas/CanvasArea.tsx`

**Changes:**
- Import `addEdge` from the store and `useCallback`
- Add `onConnect` handler:
  ```tsx
  const onConnect = useCallback((connection: Connection) => {
    if (!activeGraphId || !connection.source || !connection.target) return;
    // Prevent self-connections
    if (connection.source === connection.target) return;
    // Prevent duplicate edges
    const graph = graphs[activeGraphId];
    const exists = graph.edges.some(e => e.source === connection.source && e.target === connection.target);
    if (exists) return;

    addEdge({
      id: uuidv4(),
      graphId: activeGraphId,
      source: connection.source,
      target: connection.target,
    });
  }, [activeGraphId, graphs, addEdge]);
  ```
- Pass `onConnect` to `<ReactFlow onConnect={onConnect} />`
- The handles are already rendered on nodes — this just wires them up

---

## Batch 3: Canvas interactions (quick-add + context menu)

### 3A. Double-click canvas to add node

**File:** `src/components/Canvas/CanvasArea.tsx`

**Changes:**
- Add `onDoubleClick` handler on the ReactFlow `<div>` wrapper or use ReactFlow's `onPaneClick` with double-click detection
- Better approach: use ReactFlow's `onPaneDoubleClick` (available in v11) or attach a native `onDoubleClick` to the wrapper and use `reactFlowInstance.screenToFlowPosition()` to convert screen coords to flow coords
- Implementation:
  - Add state: `const [quickAdd, setQuickAdd] = useState<{x: number, y: number, screenX: number, screenY: number} | null>(null)`
  - On double-click empty canvas:
    ```tsx
    const flowPosition = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    setQuickAdd({ x: flowPosition.x, y: flowPosition.y, screenX: event.clientX, screenY: event.clientY });
    ```
  - Render a `<QuickAddInput>` component (new file or inline) positioned absolutely at `screenX, screenY`:
    ```tsx
    {quickAdd && (
      <div className="fixed z-50" style={{ left: quickAdd.screenX, top: quickAdd.screenY }}>
        <input
          autoFocus
          placeholder="Task name..."
          className="bg-slate-800 border border-slate-600 text-slate-200 px-3 py-1.5 rounded text-sm w-48 outline-none focus:border-purple-500"
          onKeyDown={e => {
            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
              addNode({
                id: uuidv4(),
                graphId: activeGraphId,
                type: 'action',  // default; could add Tab toggle for container
                title: e.currentTarget.value.trim(),
                x: quickAdd.x,
                y: quickAdd.y,
                width: 200,
                height: 50,
                status: 'todo',
              });
              setQuickAdd(null);
            }
            if (e.key === 'Escape') setQuickAdd(null);
            if (e.key === 'Tab') {
              e.preventDefault();
              // toggle between action/container type indicator
            }
          }}
          onBlur={() => setQuickAdd(null)}
        />
      </div>
    )}
    ```

### 3B. Right-click context menu

**New file:** `src/components/UI/ContextMenu.tsx`

**Design:**
- A generic `<ContextMenu>` component:
  ```tsx
  interface MenuItem {
    label: string;
    shortcut?: string;
    icon?: React.ReactNode;
    danger?: boolean;
    disabled?: boolean;
    onClick: () => void;
    submenu?: MenuItem[];  // For "Set Status >" submenu
  }

  interface ContextMenuProps {
    x: number;
    y: number;
    items: MenuItem[];
    onClose: () => void;
  }
  ```
- Renders a positioned `<div>` with menu items
- Styling: `bg-slate-800 border border-slate-700 rounded-lg shadow-xl` — consistent with existing dark theme
- Closes on click-outside, Escape, or item click
- Submenu appears on hover for items with `submenu`

**Integration in CanvasArea:**

**File:** `src/components/Canvas/CanvasArea.tsx`

- Add state: `const [contextMenu, setContextMenu] = useState<{x, y, nodeId?, edgeId?} | null>(null)`
- Use ReactFlow's `onNodeContextMenu` and `onEdgeContextMenu` and `onPaneContextMenu`:
  ```tsx
  onNodeContextMenu={(event, node) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
  }}
  ```
- Build menu items based on what was right-clicked:
  - **Node context menu:**
    - "Edit Title" → trigger inline edit (need a ref/callback to the node)
    - "Set Status" → submenu: Todo, In Progress, Done (action nodes only)
    - "Delete" → call `removeNode`, with confirm for containers
  - **Edge context menu:**
    - "Remove Dependency" → call `removeEdge`
  - **Pane context menu:**
    - "New Action Node" → trigger quick-add at position
    - "New Container Node" → trigger quick-add with container type

- Render `<ContextMenu>` conditionally when `contextMenu` state is set

---

## Batch 4: Undo/Redo + Multi-select

### 4A. Undo/Redo with `zundo`

**Setup:**
- Install `zundo` package: `npm install zundo`
- `zundo` is a Zustand middleware that adds temporal (undo/redo) state tracking

**File:** `src/store/workspaceStore.ts`

- Wrap the store with `temporal` middleware from zundo:
  ```tsx
  import { temporal } from 'zundo';

  export const useWorkspaceStore = create<WorkspaceState>()(
    persist(
      temporal(
        (set, get) => ({
          // ... existing store
        }),
        {
          // Only track changes to these fields (not transient UI state)
          partialize: (state) => ({
            graphs: state.graphs,
            projects: state.projects,
          }),
          // Limit history size
          limit: 50,
        }
      ),
      { /* existing persist config */ }
    )
  );
  ```
- Note: middleware ordering matters — `persist(temporal(...))` so undo/redo state isn't persisted to localStorage

**File:** `src/components/Canvas/CanvasArea.tsx` (keyboard shortcuts)

- Add `Ctrl+Z` / `Cmd+Z` handler → `useWorkspaceStore.temporal.getState().undo()`
- Add `Ctrl+Shift+Z` / `Cmd+Shift+Z` handler → `useWorkspaceStore.temporal.getState().redo()`

**File:** `src/components/Layout/TopBar.tsx` (optional visual indicator)

- Add small undo/redo buttons (Undo2, Redo2 icons from lucide-react) next to the execution mode toggle
- Disabled state when no history available

### 4B. Multi-select batch operations

**File:** `src/components/Canvas/CanvasArea.tsx`

**Changes:**
- Enable ReactFlow's built-in multi-select:
  ```tsx
  <ReactFlow
    selectionOnDrag        // box select by dragging on empty canvas
    multiSelectionKeyCode="Shift"  // hold Shift to add to selection
    deleteKeyCode={null}   // we handle delete ourselves
    ...
  />
  ```
- Update the delete keyboard handler (from 2C) to iterate over all selected nodes/edges
- The context menu (from 3B) should detect multi-selection:
  - If multiple nodes selected, show: "Set Status for N nodes >" and "Delete N nodes"
  - Batch `updateNode` calls for status changes
  - Batch `removeNode` calls for deletion (with single confirmation dialog)

**File:** `src/store/workspaceStore.ts`

- Add batch convenience method:
  ```
  removeNodes(nodeIds: string[]): void
  batchUpdateNodes(nodeIds: string[], data: Partial<Node>): void
  ```
- These are optimizations to avoid N individual state updates — do one `set()` call

---

## File Change Summary

| File | Batches | Changes |
|------|---------|---------|
| `src/store/workspaceStore.ts` | 1, 4 | `removeNode`, `removeEdge`, `cycleNodeStatus`, `removeNodes`, `batchUpdateNodes`, zundo middleware |
| `src/components/Nodes/ActionNode.tsx` | 2 | Status toggle click, inline title editing |
| `src/components/Nodes/ContainerNode.tsx` | 2 | Inline title editing |
| `src/components/Canvas/CanvasArea.tsx` | 2, 3, 4 | `onConnect`, delete keyboard handler, quick-add, context menu integration, undo/redo shortcuts, multi-select config |
| `src/components/UI/ContextMenu.tsx` | 3 | **New file** — reusable context menu component |
| `src/components/Layout/TopBar.tsx` | 4 | Undo/redo buttons (optional) |
| `package.json` | 4 | Add `zundo` dependency |

---

## Implementation Order

```
Batch 1  ──→  Batch 2  ──→  Batch 3  ──→  Batch 4
 (store)      (wire UI)     (new UI)      (polish)
  ~30min       ~45min        ~45min        ~30min
```

Batches 1+2 can be done in a single pass since the store changes and UI wiring are tightly coupled. Batch 3 is independent UI work. Batch 4 depends on everything before it (undo needs all mutations to exist, multi-select needs delete to exist).

**Recommended approach:** Implement Batches 1+2 together as the first PR, then Batch 3, then Batch 4.
