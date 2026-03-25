# SpatialTasks Technical Analysis

This report is based on the current implementation in the repository, with emphasis on material that is useful for a recruiter-facing infographic, slide deck, portfolio entry, or interview narrative.

Important context: some repository docs are stale relative to the code. In particular, the current implementation includes Supabase auth and workspace sync, while older docs still describe a purely local-only app. This report follows the code.

Primary evidence sources:
- `src/App.tsx`
- `src/store/workspaceStore.ts`
- `src/components/Canvas/CanvasArea.tsx`
- `src/components/Nodes/ActionNode.tsx`
- `src/components/Nodes/ContainerNode.tsx`
- `src/components/ListView/ListView.tsx`
- `src/hooks/useWorkspaceSync.ts`
- `src/lib/workspaceSync.ts`
- `src/components/Auth/AuthGate.tsx`
- `src/services/gemini.ts`

---

# 1. Executive Summary

SpatialTasks is a spatial task-planning application built as a React + TypeScript single-page app around a node graph metaphor. Instead of organizing work as flat lists, it lets users place tasks on a canvas, connect them with dependency edges, open container nodes into nested subgraphs, and switch between a freeform graph view and a conventional list view.

The product is best understood as a hybrid between:
- a spatial task manager
- a canvas-based productivity tool
- a recursive planning workspace

What makes the project technically interesting is not generic CRUD complexity, but the coordination of several nontrivial systems:
- a normalized recursive graph data model
- a ReactFlow-powered interaction surface
- dependency-aware execution mode
- mobile-specific interaction fallbacks
- authenticated cloud sync
- optional AI-generated subflows

From an engineering perspective, the hard part is keeping spatial state, hierarchical navigation, dependency semantics, interaction modes, and persistence in sync while presenting a clean, simple UI.

This project demonstrates:
- interaction-heavy frontend engineering
- state modeling for complex UI systems
- product-minded UX systems design
- pragmatic full-stack integration
- structured AI feature integration

## Recruiter Takeaways

Strong portfolio and resume signals grounded in the repo:

- Interactive front-end engineering through a custom node-based workspace on top of ReactFlow
- Advanced UI state management through a centralized Zustand store with persistence and undo/redo
- Spatial/canvas-based product design through draggable nodes, zoom/pan canvas behavior, and graph-based planning
- Rich interaction systems including drag, resize, connect, multi-select, context menus, and touch-specific action sheets
- Information architecture through recursive subgraphs and breadcrumb navigation
- Full-stack product thinking through Supabase auth, sync, and local-first fallback behavior
- Visual systems engineering through distinct task/container node types, progress indicators, and execution highlighting
- Performance-conscious rendering through memoized nodes, disabled animated edges on touch, and requestAnimationFrame throttling
- Product UX intuition through graph/list dual views and separate desktop/touch interaction models
- Extensible app architecture through a normalized `Workspace -> Project -> Graph -> Node/Edge` model

---

# 2. Project Purpose and User Value

## Intended Purpose

SpatialTasks is built for people who think in structure, sequence, and decomposition rather than just checklists. The included demo workspaces in `src/utils/generator.ts` cover:
- routines
- landing-page launch work
- audio-production workflows

That suggests the target user is a solo builder, operator, creative professional, or technically minded planner managing multi-step work with dependencies.

## What Problem It Solves

Conventional list-based task tools handle linear task capture well, but they lose:
- task shape
- branching work
- dependency structure
- hierarchical decomposition
- visual grouping

SpatialTasks addresses that by making work spatial and navigable. A list can tell you what exists; SpatialTasks tries to show how work branches, what depends on what, which items hide deeper detail, and where effort is clustered.

## Core User Workflow

The product loop is:
1. Open a project root graph
2. Add action nodes and container nodes
3. Arrange them spatially on the canvas
4. Connect dependencies with edges
5. Enter containers to decompose work into nested subgraphs
6. Switch into execution mode to surface actionable work
7. Optionally use AI to generate a subflow for a container
8. Revisit the same graph in list view when linear task management is more useful

## Why Spatial Organization Is Useful

Spatial organization helps because it supports:
- cognitive mapping of work
- proximity-based grouping
- branch and dependency visibility
- high-level planning without losing detail
- local context for decomposition

The user is not just checking off tasks. They are designing a work structure.

## Best Framing for Recruiters

Best recruiter framing:

SpatialTasks is a visual task-planning system that combines canvas interactions, nested task graphs, dependency modeling, and execution-focused UX in a compact frontend-heavy architecture.

That framing is stronger than calling it only:
- a task manager
- a whiteboard
- a notes app

because the code clearly implements workflow semantics and recursive graph navigation, not just freeform sketching.

---

# 3. Architecture Overview

## High-Level Narrative

SpatialTasks is a client-rendered React application. Authentication is gated through Supabase in `src/components/Auth/AuthGate.tsx`. Once authenticated, `src/App.tsx` mounts a single workspace shell. The application’s source of truth is a Zustand store in `src/store/workspaceStore.ts`, which contains:
- normalized projects
- graphs
- nodes
- edges
- navigation state
- view mode
- touch interaction state
- settings
- undo history

The canvas layer in `src/components/Canvas/CanvasArea.tsx` translates the active graph into ReactFlow nodes and edges, while node components implement:
- editing
- status updates
- progress display
- AI expansion
- subgraph navigation

Persistence happens in two layers:
- local persistence via Zustand `persist`
- authenticated cloud sync via `src/hooks/useWorkspaceSync.ts` and `src/lib/workspaceSync.ts`

Gemini integration is direct from the browser via `src/services/gemini.ts`. There is no custom application backend.

## Main Modules

| Layer | Responsibilities | Key modules |
|---|---|---|
| App shell | Auth gate, loading states, graph/list switching | `src/main.tsx`, `src/App.tsx`, `src/components/Auth/AuthGate.tsx` |
| Domain model | Type system for workspace, graph, nodes, edges, settings | `src/types/index.ts` |
| State management | Graph mutations, navigation, modes, undo/redo, persistence | `src/store/workspaceStore.ts` |
| Canvas rendering | ReactFlow integration, quick add, connect mode, selection, context menu | `src/components/Canvas/CanvasArea.tsx` |
| Node UI | Action rendering, container rendering, progress, AI generation, graph entry | `src/components/Nodes/ActionNode.tsx`, `src/components/Nodes/ContainerNode.tsx` |
| Alternate representation | List-first representation of the active graph | `src/components/ListView/ListView.tsx` |
| Product chrome | Breadcrumbs, execution mode, view mode, project management, settings | `src/components/Layout/TopBar.tsx`, `src/components/Layout/Sidebar.tsx` |
| Persistence/sync | Supabase fetch/save, debounced sync, Gemini key isolation | `src/lib/supabase.ts`, `src/lib/workspaceSync.ts`, `src/hooks/useWorkspaceSync.ts` |
| Logic helpers | Blocked-state logic, actionability, container progress | `src/utils/logic.ts` |
| Demo/sample data | Generates example workspaces for demo and onboarding | `src/utils/generator.ts` |
| Mobile adaptation | Device detection, keyboard offsets, action sheets, FAB, safe-area CSS | `src/hooks/useDeviceDetect.ts`, `src/hooks/useKeyboardOffset.ts`, `src/components/UI/ActionSheet.tsx`, `src/components/UI/FloatingActionButton.tsx`, `src/index.css` |

## Frontend Responsibilities

The frontend owns nearly all product logic:
- rendering
- interactions
- graph mutations
- navigation
- dependency semantics
- AI prompting and graph materialization
- local persistence
- cloud sync orchestration

## Backend Responsibilities

There is no custom backend. Backend-like responsibilities are outsourced to Supabase:
- auth session handling
- storage of a workspace blob per user

There are no:
- custom API routes
- custom serverless functions in the repo
- custom database access layers beyond Supabase client usage

## State Management System

State is centralized in `src/store/workspaceStore.ts` and includes:
- workspace data
- active project and active graph
- navigation stack
- UI modes like graph/list, execution mode, connect mode, select mode
- transient flags like sidebar state and selection presence
- undo/redo history via `zundo`

## Models

Core data model in `src/types/index.ts`:
- `Workspace`
- `Project`
- `Graph`
- `Node`
- `Edge`
- `Viewport`

Key modeling idea:
- container nodes reference `childGraphId`
- graphs are stored in a flat `Record<string, Graph>`

This is a recursive system implemented with normalized storage.

## Rendering Layers

Rendering layers are:
- workspace shell
- top bar and sidebar chrome
- graph/list view switch
- ReactFlow canvas
- action/container node components
- overlays: context menu, action sheet, confirm modal, FAB

## Interaction Handling

Canvas interactions include:
- drag node
- resize node
- drag-to-connect edges
- tap-to-connect on touch
- double-click quick add on desktop
- long-press action sheet on touch
- keyboard shortcuts for delete/undo/redo
- touch toolbar fallbacks for delete/select/connect

## Persistence / Sync

Persistence stack:
- localStorage persistence via Zustand `persist`
- Supabase upsert via `saveWorkspace`
- debounced autosave via `debouncedSave`
- local-only storage for Gemini API keys via `saveGeminiConfig`

## Viewport / Zoom / Pan

ReactFlow provides pan/zoom. The model includes a `viewport` field on each graph, but current code does not write it back or restore it, so this is more modeled than fully implemented.

## Mobile Handling

Mobile-specific behavior is substantial and implemented, not aspirational:
- touch device detection
- long-press action sheet
- FAB quick add
- explicit connect mode
- explicit select mode
- mobile sidebar drawer
- enlarged touch targets
- safe-area handling
- virtual keyboard offset handling

## Export / Share Logic

Not implemented in the visible UI. The store contains a `jsonImport` helper, but there is no surfaced export/share workflow.

## Text Diagram

```text
User Auth
-> AuthGate / Supabase session
-> App shell
-> Zustand workspace store
-> Active graph selection
-> CanvasArea or ListView
-> Node interactions / mode-specific UI
-> Store mutation
-> ReactFlow render update
-> localStorage persist
-> debounced Supabase upsert

Optional AI branch:
Container node
-> Gemini prompt
-> JSON subtasks
-> child graph + edges
-> store update
-> auto-navigate into subgraph
```

---

# 4. Feature Inventory

## A. User-Facing Features

| Feature | What it does | Why it matters | Key files | Recruiter-worthiness |
|---|---|---|---|---|
| Spatial canvas | Users place tasks as nodes on a graph canvas | Makes work structure visible | `src/components/Canvas/CanvasArea.tsx` | **Portfolio Highlight** |
| Nested subflows | Container nodes open into child graphs | Supports recursive decomposition | `src/components/Nodes/ContainerNode.tsx`, `src/store/workspaceStore.ts` | **Portfolio Highlight** |
| Dependency tracking | Edges link tasks into ordered flows | Adds workflow semantics | `src/components/Canvas/CanvasArea.tsx`, `src/utils/logic.ts` | **Portfolio Highlight** |
| Execution mode | Highlights actionable work, dims blocked/completed work | Bridges planning and execution | `src/components/Layout/TopBar.tsx`, `src/components/Nodes/ActionNode.tsx`, `src/components/Nodes/ContainerNode.tsx` | **Portfolio Highlight** |
| List view | Renders the same graph as a linear task list | Offers a lower-friction execution view | `src/components/ListView/ListView.tsx`, `src/App.tsx` | **Portfolio Highlight** |
| Inline editing | Double-click or touch-select to rename tasks/groups | Keeps editing in context | `src/components/Nodes/ActionNode.tsx`, `src/components/Nodes/ContainerNode.tsx`, `src/components/ListView/ListView.tsx` | High |
| Multi-select and batch actions | Select multiple nodes and set status or delete | Makes the canvas feel tool-like | `src/components/Canvas/CanvasArea.tsx`, `src/components/UI/ContextMenu.tsx` | High |
| AI Magic Expand | Generates subtasks and dependencies for a container | Shows structured AI augmentation | `src/services/gemini.ts`, `src/components/Nodes/ContainerNode.tsx` | **Portfolio Highlight** |
| Authenticated accounts | Sign in via email/password or OAuth | Makes it feel product-grade | `src/components/Auth/AuthScreen.tsx`, `src/components/Auth/AuthGate.tsx` | High |
| Cloud sync | Restores and saves workspaces to Supabase | Makes work portable across sessions/devices | `src/hooks/useWorkspaceSync.ts`, `src/lib/workspaceSync.ts` | **Portfolio Highlight** |
| Mobile interaction system | Long-press menus, FAB, connect mode, mobile sidebar | Shows deliberate UX engineering | `src/components/Canvas/CanvasArea.tsx`, `src/components/Layout/TopBar.tsx`, `src/components/Layout/Sidebar.tsx` | **Portfolio Highlight** |

## B. Technical Features

- Normalized graph store keyed by `graphId`
- Recursive node-to-child-graph relationships
- Zustand persistence plus temporal undo/redo
- ReactFlow adapter layer
- RequestAnimationFrame-throttled touch drag updates
- Safe-area-aware CSS and touch-target enlargement
- Debounced whole-workspace cloud persistence
- Local-only secret isolation for Gemini keys
- Structured AI JSON parsing and graph reconstruction

## C. Hidden Sophistication

- Recursive deletion removes descendant child graphs, not just the clicked node
- Graph and list views are alternative projections of the same domain data
- Touch support changes gesture model, not just styles
- AI output is materialized into internal graph structure, not simply displayed
- The app separates sync-safe workspace state from local-only AI credentials

---

# 5. Core Technical Approaches

## 5.1 Normalized Recursive Graph Model

### Problem It Solves

Nested workspaces are difficult to model if you store deeply nested graph trees directly in component state. The app instead uses a normalized flat graph store with explicit references.

### How It Appears in the Codebase

In `src/types/index.ts`:
- `Workspace.graphs` is `Record<string, Graph>`
- `Node.childGraphId` links a container node to another graph
- `Workspace.navStack` tracks the current drill-down path

### Implementation Style

This is a normalized recursive model:
- recursion exists conceptually
- storage stays flat

### Where the Logic Lives

- `src/types/index.ts`
- `src/store/workspaceStore.ts`
- `src/components/Nodes/ContainerNode.tsx`

### Why It Is Technically Interesting

It is a clean balance between:
- recursive product behavior
- manageable state updates
- easier persistence

### Status

Fully implemented and central to the product.

## 5.2 ReactFlow as an Interaction Engine

### Problem It Solves

Building graph interactions from scratch would be expensive. The project uses ReactFlow for:
- drag interactions
- node handles
- selection
- pan/zoom
- controls

### How It Appears

`src/components/Canvas/CanvasArea.tsx` maps domain nodes and edges into ReactFlow nodes and edges via `useMemo`.

### Implementation Style

ReactFlow is treated as a rendering/interaction layer, while the app owns:
- domain model
- graph state
- mutation logic

### Why It Is Technically Interesting

This is a strong product engineering pattern: use a capable UI engine, but keep the domain architecture application-owned.

### Status

Fully implemented.

## 5.3 Dependency-Aware Execution Mode

### Problem It Solves

A spatial plan can become visually rich but operationally noisy. Execution mode narrows attention to what can be acted on next.

### How It Appears

`src/utils/logic.ts` provides:
- `isNodeBlocked`
- `isNodeActionable`

These derived states drive:
- highlight rings
- dimming
- “Next” affordances
- “Dive In” affordances for containers

### Where the Logic Lives

- `src/utils/logic.ts`
- `src/components/Nodes/ActionNode.tsx`
- `src/components/Nodes/ContainerNode.tsx`
- `src/components/Layout/TopBar.tsx`

### Why It Is Technically Interesting

It turns the canvas from a passive planning surface into an execution-oriented system.

### Status

Partially implemented. It works for action nodes, but container semantics are incomplete because containers do not have a consistent computed `status`.

## 5.4 On-the-Fly Child Graph Creation

### Problem It Solves

Users should be able to create a container as a lightweight high-level placeholder before committing to its internal structure.

### How It Appears

If a container has no `childGraphId`, entering it causes the app to:
- allocate a new graph
- store it in the graph map
- update the container with the new `childGraphId`
- navigate into it

### Files

- `src/components/Nodes/ContainerNode.tsx`
- `src/components/ListView/ListView.tsx`

### Why It Is Interesting

It is a good example of progressive complexity in product design.

### Status

Fully implemented.

## 5.5 Mobile-First Interaction Remapping

### Problem It Solves

Desktop interaction metaphors do not translate directly to touch devices.

### How It Appears

The code explicitly replaces:
- right-click with long-press action sheet
- keyboard delete with toolbar delete
- drag-to-connect precision with tap-to-connect connect mode
- double-click quick-add with FAB placement
- persistent desktop sidebar with mobile drawer

### Files

- `src/components/Canvas/CanvasArea.tsx`
- `src/components/Layout/TopBar.tsx`
- `src/components/Layout/Sidebar.tsx`
- `src/components/UI/ActionSheet.tsx`
- `src/components/UI/FloatingActionButton.tsx`
- `src/hooks/useDeviceDetect.ts`
- `src/index.css`

### Why It Is Interesting

This is one of the strongest engineering signals in the repo. It shows the engineer did not confuse “responsive” with “touch-usable.”

### Status

Implemented.

## 5.6 Local Persistence + Debounced Cloud Sync

### Problem It Solves

The app needs resilience and continuity without forcing the user to think about saving.

### How It Appears

- Local persistence is handled in `src/store/workspaceStore.ts` through Zustand `persist`
- Supabase sync happens in `src/hooks/useWorkspaceSync.ts`
- Actual fetch/save helpers live in `src/lib/workspaceSync.ts`

### Implementation Style

Local-first with debounced remote upsert of the whole workspace blob.

### Why It Is Interesting

It is a pragmatic architecture:
- simple enough for a solo product
- strong enough to feel like a real app

### Status

Implemented, with some caveats around what fields should sync.

## 5.7 BYOK AI Graph Generation

### Problem It Solves

Task decomposition is often a bottleneck. The AI feature helps bootstrap subgraphs.

### How It Appears

`src/services/gemini.ts`:
- prompts Gemini to return JSON only
- validates response structure

`src/components/Nodes/ContainerNode.tsx` and `src/components/ListView/ListView.tsx`:
- map Gemini slug ids to UUIDs
- create action nodes
- rebuild edges from `dependsOn`
- navigate into the new child graph

### Why It Is Interesting

The AI feature creates structured app state. That is more substantial than a chatbot add-on.

### Status

Implemented.

## Technical Sophistication Assessment

### What the Project Already Does Well

- Recursive graph model is strong and presentation-worthy
- Interaction layer is dense and product-like
- Touch-specific adaptation is explicit and credible
- AI feature is structurally integrated
- Persistence strategy is pragmatic and useful

### What Is Elegant

- `graphs: Record<string, Graph>` + `childGraphId` + `navStack`
- ReactFlow as infrastructure, not domain model
- Gemini key isolation
- Recursive deletion logic

### What Appears Incomplete or Fragile

- Container completion/blocking semantics
- Non-recursive progress roll-up
- Viewport persistence not wired through
- Duplication between list and canvas container logic
- No test coverage
- Some stale docs

### What Is Especially Strong for Recruiter Presentation

- Recursive subgraph concept
- Dual graph/list views
- Touch interaction redesign
- Execution mode
- AI-to-graph pipeline

### What Differentiates It from Generic CRUD

- Recursive graph navigation
- dependency semantics
- execution-driven rendering
- spatial organization as first-class UX
- multi-modal interaction design

---

# 6. Algorithms, Interaction Systems, and Rendering Logic

## Coordinate Systems and Placement

The canvas uses flow-space coordinates. Quick-add and long-press pane actions convert screen coordinates into flow coordinates via `screenToFlowPosition` in `src/components/Canvas/CanvasArea.tsx`.

This matters because node placement remains spatially coherent regardless of pan/zoom state.

## Viewport-Center Placement

On touch devices, FAB-based task creation uses the current viewport from ReactFlow and computes the visible center before placing the new node.

Inputs:
- viewport x/y/zoom
- window dimensions

Outputs:
- node x/y in graph space

This is a nice example of product thinking expressed as coordinate math.

## Drag Update Pipeline

In `src/components/Canvas/CanvasArea.tsx`:
- ReactFlow emits node changes
- position changes are written back to the store
- on touch devices, writes are throttled via `requestAnimationFrame`

Tradeoff:
- simple and responsive at current scale
- still not optimized for very large graphs

## Selection Logic

Selection state is surfaced from ReactFlow through `onSelectionChange`, then mirrored into the store via `_hasSelection` so other UI surfaces like the mobile top bar can react.

This lets the toolbar know when delete should be enabled without directly coupling it to ReactFlow internals.

## Connect Logic

There are two connection systems:
- desktop drag-to-connect through ReactFlow handles and `onConnect`
- touch tap-to-connect through explicit `connectMode`

Tap-to-connect works as a mini state machine:
1. activate connect mode
2. tap source node
3. tap target node
4. create edge if valid
5. clear mode

This is a good example of adapting interaction architecture, not just interaction styling.

## Recursive Delete Logic

Deleting a container is not just a UI removal. In `src/store/workspaceStore.ts`, the store recursively collects descendant graph ids and removes them from the normalized graph map.

Inputs:
- node id
- active graph
- graph map

Outputs:
- updated graph without node and edges
- pruned descendant graphs

This is one of the strongest “hidden sophistication” systems in the repo.

## Progress Roll-Up Logic

Container progress is derived from the child graph:
- filter immediate child graph nodes to `action`
- count `done`
- compute ratio

Tradeoff:
- simple and fast
- not recursive across nested containers

## Actionability / Blocked Logic

Blocked logic:
- inspect incoming edges
- find source nodes
- if a predecessor is not done, node is blocked

Interesting caveat:
- container predecessors do not have a fully computed status pipeline, so the current logic is only partially correct for mixed action/container dependency flows

## AI Materialization Pipeline

AI output flow:
1. send container title and optional notes to Gemini
2. enforce JSON-only response
3. parse structured subtasks
4. map model slugs to UUIDs
5. create action nodes
6. rebuild dependency edges
7. create child graph
8. attach `childGraphId` to container
9. navigate into the new subgraph

This is a clean end-to-end structured content generation pipeline.

## Most Interesting Technical Mechanisms

Top presentation-worthy mechanisms:

1. Recursive subgraphs through `childGraphId` references
2. Single normalized graph store powering both canvas and list representations
3. Execution mode that visualizes blocked vs actionable work
4. Touch-first interaction remapping for long-press, connect mode, and FAB creation
5. Screen-to-flow coordinate conversion for spatially correct quick-add
6. Recursive delete safety for descendant graph trees
7. AI expansion that converts JSON subtasks into internal graph structure
8. Local-first persistence with debounced authenticated cloud sync
9. Temporal undo/redo middleware integrated into the main store
10. Safe-area and keyboard-aware mobile UI handling

---

# 7. End-to-End Workflow Walkthrough

## 1. Step-by-Step Prose

1. The user lands in an auth-gated shell. `AuthGate` checks Supabase session state.
2. After auth, `useWorkspaceSync` fetches remote workspace data.
3. If no remote workspace exists, the app either preserves local state or generates a demo workspace.
4. `App.tsx` loads the first available project and renders graph view or list view.
5. In graph view, `CanvasArea` transforms the active graph into ReactFlow nodes and edges.
6. The user adds tasks, groups, dependencies, or edits labels in place.
7. Drag, resize, status changes, and node creation all mutate the centralized workspace store.
8. Entering a container navigates into a child graph, creating one on demand if necessary.
9. Switching to execution mode changes how nodes render based on derived workflow semantics.
10. Every mutation persists locally and schedules a debounced save to Supabase.
11. Optionally, the user can use Magic Expand to convert a container into a generated child workflow.

## 2. Concise Pipeline Diagram

```text
Session check
-> workspace hydration
-> load project root graph
-> render graph/list from normalized store
-> user interaction
-> store mutation
-> render refresh
-> local persistence + undo history
-> debounced Supabase save
-> future restore
```

## 3. Recruiter-Friendly Summary Version

The user signs in, opens a project as a node graph, decomposes work into nested subflows, connects dependencies, and then flips into execution mode to see what is actionable. Under the hood, the app translates spatial interactions into normalized graph state, persists them locally, syncs them to Supabase, and can optionally generate entirely new subgraphs from AI output.

## Interaction Loops and Hidden Complexity

Places where simple UI hides complexity:
- adding a node must respect graph coordinates and current viewport
- entering a container may allocate new graph state and update navigation
- deleting a container must recursively delete descendant graphs
- touch usability requires alternate interaction pathways
- execution mode depends on derived graph semantics, not static task properties

---

# 8. Codebase Deep Dive by Module

## Canvas / Workspace Engine

### `src/store/workspaceStore.ts`

Purpose:
- central workspace state
- all main graph mutations
- navigation and mode toggles
- local persistence
- temporal undo/redo integration

Key responsibilities:
- `loadProject`
- `enterGraph`
- `navigateToBreadcrumb`
- `addNode`
- `updateNode`
- `removeNode`
- `removeNodes`
- `addEdge`
- `cycleNodeStatus`
- `updateSettings`
- `hydrateFromSupabase`

Why it matters:
- this is the real application core
- it defines what the app is, more than any single UI component

Should be highlighted in a deck:
- yes, as the state engine / single source of truth

### `src/components/Canvas/CanvasArea.tsx`

Purpose:
- adapt the active graph into ReactFlow
- handle selection, connect, delete, quick add, context menu, mobile action sheet

Important logic:
- ReactFlow node/edge mapping
- `onNodesChange`
- `onConnect`
- `deleteSelected`
- pane double-click quick add
- long-press handling
- tap-to-connect

Why it matters:
- this is the input and interaction engine

Should be highlighted:
- yes

## Task / Card Models

### `src/types/index.ts`

Purpose:
- canonical workspace schema

Interesting parts:
- `Node.type`
- `Node.childGraphId`
- `Graph.viewport`
- `Workspace.navStack`

Should be highlighted:
- yes, especially the recursive graph data model

## Interaction Handlers

### `src/components/Nodes/ActionNode.tsx`

Purpose:
- render action nodes
- expose status update
- inline editing
- resize affordance
- visual blocked/actionable states

Why it matters:
- shows how execution semantics become visible UI

### `src/components/Nodes/ContainerNode.tsx`

Purpose:
- render container nodes
- show progress
- enter child graph
- perform AI expansion
- expose inline editing and resize behavior

Why it matters:
- this component expresses the core recursive-subgraph product idea

Should be highlighted:
- absolutely

## Viewport / Zoom / Pan Logic

### `src/components/Canvas/CanvasArea.tsx`

Relevant logic:
- `screenToFlowPosition`
- `getViewport`
- `fitView`

Observation:
- viewport-aware placement exists
- viewport persistence model exists
- actual viewport persistence is not fully wired

## Persistence / Storage

### `src/hooks/useWorkspaceSync.ts`

Purpose:
- hydrate from Supabase
- preserve local data for first-time authenticated users
- subscribe to store and autosave

### `src/lib/workspaceSync.ts`

Purpose:
- Supabase fetch/save
- Gemini key stripping
- save debouncing

Why both matter:
- together they define the product’s local-first + cloud-sync behavior

## UI Components

Important UI infrastructure:
- `src/components/UI/ContextMenu.tsx`
- `src/components/UI/ActionSheet.tsx`
- `src/components/UI/FloatingActionButton.tsx`
- `src/components/UI/ConfirmModal.tsx`
- `src/components/UI/Toast.tsx`

These are supporting components, but they matter because the app’s behavior depends on them for mode-appropriate interactions.

## Mobile / Responsive Systems

Important modules:
- `src/hooks/useDeviceDetect.ts`
- `src/hooks/useKeyboardOffset.ts`
- `src/index.css`
- `src/components/Layout/Sidebar.tsx`
- `src/components/Layout/TopBar.tsx`

Why they matter:
- they show a product-quality response to touch constraints

## Tests / Examples / Demo Flows

There is no automated test suite visible in the repo.

Example/demo understanding comes primarily from:
- `src/utils/generator.ts`
- `screenshot.png`

---

# 9. Product and UX Systems Analysis

## Why Spatial Placement Matters

Spatial placement is central, not ornamental. It lets users:
- cluster related work
- see branch points
- preserve mental maps
- hold high-level and local context at once

This is especially clear in the generated sample workflows.

## How the UI Supports Planning and Prioritization

The UI supports planning by:
- letting containers stand in for unresolved work
- allowing dependencies to express sequencing
- showing progress on grouped work
- providing execution mode for “what now?”

The UI supports prioritization by:
- visually separating actionable and blocked tasks
- letting users structure work spatially before linearizing it in list view

## Discoverability

Discoverability is handled through:
- visible node affordances
- explicit top-bar modes
- sidebar settings and project list
- clear iconography for enter, AI expand, edit, delete, and state changes

Weakness:
- some advanced behaviors are still learned by use rather than fully explained in-product

## Editing Flows

Editing is intentionally in place:
- status cycling directly on action nodes
- inline title edits
- right-click/long-press menus for contextual actions
- quick-add directly on the canvas or through touch FAB

This reduces context switching and keeps the app feeling like a tool rather than a form stack.

## Complexity Management

The product manages complexity by:
- using only two node types
- nesting detail behind containers
- offering a list view over the same graph
- using execution mode to suppress noise

## Freedom vs Structure

SpatialTasks balances freedom and structure well:
- freedom through free placement and arbitrary dependency patterns
- structure through node types, statuses, edges, and derived execution logic

## What Makes SpatialTasks Different

### Compared to a Generic To-Do App

SpatialTasks is not just a list with icons. It models:
- dependency structure
- recursive decomposition
- visual grouping
- navigable workspaces

### Compared to a Kanban Board

Kanban organizes work into status columns. SpatialTasks organizes work into:
- graphs
- branches
- containers
- subgraphs

### Compared to a Whiteboard

A whiteboard is usually visually freeform but semantically loose. SpatialTasks adds:
- statuses
- dependencies
- progress roll-up
- execution mode
- project/workspace structure

### Compared to a Note-Taking App

The primary object is not a document. It is a graph.

---

# 10. Engineering Quality Assessment

## Code Organization

Code organization is good for the project’s size:
- directories map cleanly to app concerns
- main logic is concentrated in a few understandable places
- supporting utilities are separated reasonably well

## Modularity

Modularity is decent. The largest files are:
- `src/store/workspaceStore.ts`
- `src/components/Canvas/CanvasArea.tsx`
- `src/components/ListView/ListView.tsx`
- `src/components/Nodes/ContainerNode.tsx`
- `src/components/Layout/Sidebar.tsx`

That is acceptable for an interaction-heavy frontend, though some extraction would improve reuse.

## Separation of Concerns

Mostly good:
- domain state in the store
- sync in dedicated modules
- AI request logic isolated
- rendering components separated by node type and shell role

## Extensibility

The architecture is reasonably extensible because the normalized data model can support:
- new node types
- richer metadata
- more derived graph logic
- export/share features
- layout tools
- collaboration features

## Maintainability

Maintainability is mixed:
- the model is strong
- naming is clear
- logic is explicit
- but there is duplication between list and graph container behaviors

## Data Modeling

Data modeling is one of the project’s strongest traits. The recursive graph approach is clean and appropriate.

## Rendering Architecture

Rendering architecture is thoughtful:
- ReactFlow handles graph interaction/rendering
- the app owns the semantic model
- node components stay focused on node-specific UI

## Performance Considerations

Good signs:
- memoized node components
- disabled animated edges on touch
- `will-change` promotion for ReactFlow layers
- requestAnimationFrame throttling for touch drag writes

Current risk:
- the production bundle is still large enough to trigger a chunk-size warning

## Testability

Weak area:
- no automated tests found

## Debuggability

Debuggability is fairly good because:
- state is centralized
- most logic is explicit
- interactions are understandable from source

## Production Readiness

Current maturity feels like prototype-to-alpha:
- build passes
- auth and sync exist
- interaction system is substantial
- but there are semantic gaps, no tests, and some data hygiene issues

## Technical Debt / Fragile Areas

- incomplete container status semantics
- non-recursive progress
- stale docs
- duplicated logic across list/canvas
- likely over-broad cloud sync payloads
- unused or underused viewport model

## What This Project Says About the Engineer

The codebase signals:
- strong product-minded frontend engineering
- comfort with domain modeling
- strong interaction design implementation ability
- pragmatic full-stack judgment
- ability to build tool-like interfaces, not just marketing pages or CRUD dashboards

Best role fit signals:
- product engineer
- frontend engineer for rich web apps
- interaction-heavy UI engineer
- startup full-stack/product-minded engineer
- productivity or creative tool engineer

Especially differentiated traits:
- recursive interaction model
- touch adaptation
- structured AI integration
- state architecture for complex UI

---

# 11. Visuals Worth Turning Into Infographics

## Proposed Visuals

| Title | Purpose | What it should show | Why recruiter-useful | Source support | Suggested structure |
|---|---|---|---|---|---|
| SpatialTasks at a glance | Fast product comprehension | Annotated product screenshot with nodes, edges, containers, progress, breadcrumbs | Makes the project instantly legible | `screenshot.png`, node components, top bar | Hero screenshot with labeled callouts |
| Recursive task graph model | Explain core concept | Root graph -> container -> child graph -> nested child graph | Highlights the strongest product idea | `src/types/index.ts`, `src/utils/generator.ts` | Layered drill-down diagram |
| Input -> state -> render -> sync | Explain architecture | User action -> store mutation -> ReactFlow render -> local persist -> Supabase upsert | Strong architecture slide | `src/components/Canvas/CanvasArea.tsx`, `src/store/workspaceStore.ts`, `src/hooks/useWorkspaceSync.ts` | Left-to-right pipeline |
| Desktop vs mobile interaction model | Show UX depth | Right-click/double-click/drag vs long-press/FAB/connect mode/select mode | Signals maturity beyond static responsiveness | `src/components/Canvas/CanvasArea.tsx`, `src/components/Layout/TopBar.tsx`, `src/index.css` | Split-screen comparison |
| Execution mode semantics | Show system intelligence | Blocked, actionable, done, highlighted next step | Shows workflow-aware UI | `src/utils/logic.ts`, node components | Before/after toggle illustration |
| Magic Expand pipeline | Show AI concretely | Container title -> Gemini JSON -> nodes/edges -> child graph | Makes AI feature honest and specific | `src/services/gemini.ts`, `src/components/Nodes/ContainerNode.tsx` | Four-stage transform |
| Same data, two views | Explain graph/list duality | Graph view and list view connected to one graph model | Strong product architecture story | `src/App.tsx`, `src/components/ListView/ListView.tsx` | Split view with shared model in center |
| Recursive delete safety | Show hidden sophistication | Container deletion pruning descendant graphs | Strong engineering callout | `src/store/workspaceStore.ts` | Tree-pruning diagram |
| Auth + sync architecture | Clarify full-stack scope | Browser app + Supabase auth + workspace blob + local-only Gemini key | Helps position the project accurately | `src/components/Auth/AuthGate.tsx`, `src/lib/workspaceSync.ts` | Service architecture diagram |
| What makes it different | Competitive framing | SpatialTasks vs to-do app vs kanban vs whiteboard | Great recruiter-facing differentiation | Report synthesis | Comparison matrix |
| Engineering skills demonstrated | Portfolio framing | Interaction design, state architecture, mobile UX, AI integration, BaaS sync | Makes the project legible as a hiring signal | Whole report | Skill map / matrix |
| Feature-to-code map | Traceability | Presentation claims mapped to files/modules | Builds trust | Whole report | Claim-to-code chart |

## Top 8 Visuals for an Infographic

1. SpatialTasks at a glance
2. Recursive task graph model
3. Input -> state -> render -> sync pipeline
4. Desktop vs mobile interaction model
5. Execution mode semantics
6. Magic Expand pipeline
7. Same data, two views
8. What makes it different

## Top 12 Slides for a PowerPoint

1. SpatialTasks in one sentence
2. The problem with flat task tools
3. Core user workflow
4. What the product looks like
5. Recursive subgraph model
6. Architecture overview
7. Canvas interaction system
8. Execution mode and dependency logic
9. AI Magic Expand
10. Mobile-first adaptation
11. Engineering assessment
12. Recruiter value and fit

---

# 12. Slide Deck Blueprint

## Slide 1. SpatialTasks

Goal:
- define the product quickly

Key bullets:
- spatial task-planning workspace
- recursive subgraphs
- execution-aware visual task management

Suggested visual:
- annotated hero screenshot

Speaker takeaway:
- this is a differentiated productivity interface, not a basic to-do app

## Slide 2. The Problem

Goal:
- establish user need

Key bullets:
- lists flatten structure
- dependencies disappear
- decomposition becomes hard to see

Suggested visual:
- list vs graph comparison panel

Speaker takeaway:
- complex work has shape, and the product is designed around that fact

## Slide 3. Core Workflow

Goal:
- show how the product works

Key bullets:
- create tasks and groups
- arrange them on a canvas
- drill into groups
- connect dependencies
- switch to execution mode

Suggested visual:
- 5-step workflow strip

Speaker takeaway:
- the interaction loop is easy to demo and explain

## Slide 4. What Makes It Different

Goal:
- position against alternatives

Key bullets:
- more structured than whiteboards
- more visual than task managers
- more recursive than kanban

Suggested visual:
- comparison matrix

Speaker takeaway:
- differentiation is concrete and evidence-backed

## Slide 5. Data Model

Goal:
- show the core system design

Key bullets:
- Workspace -> Project -> Graph -> Node/Edge
- container nodes link to child graphs
- same model powers multiple views

Suggested visual:
- recursive data model diagram

Speaker takeaway:
- the model is simple, extensible, and portfolio-worthy

## Slide 6. Architecture

Goal:
- show technical maturity

Key bullets:
- React + ReactFlow + Zustand + Supabase + Gemini
- frontend owns most product logic
- sync and auth stay lightweight

Suggested visual:
- architecture diagram

Speaker takeaway:
- the app is frontend-heavy but thoughtfully integrated

## Slide 7. Canvas Interaction System

Goal:
- show engineering depth

Key bullets:
- drag, resize, connect, multi-select
- context menu and touch action sheet
- coordinate-aware quick-add

Suggested visual:
- interaction callout diagram

Speaker takeaway:
- this is interaction engineering, not static UI assembly

## Slide 8. Execution Mode

Goal:
- show product intelligence

Key bullets:
- blocked vs actionable
- visual emphasis on next work
- progress surfaced on containers

Suggested visual:
- before/after execution mode

Speaker takeaway:
- the app adds workflow semantics on top of the canvas

## Slide 9. AI Magic Expand

Goal:
- show AI depth without hype

Key bullets:
- BYOK Gemini
- structured JSON response
- subtasks materialized as nodes and edges

Suggested visual:
- container -> AI -> subgraph pipeline

Speaker takeaway:
- AI here creates usable structure, not just text

## Slide 10. Mobile Adaptation

Goal:
- show UX breadth

Key bullets:
- long-press replaces right-click
- FAB replaces double-click quick-add
- connect and select become explicit touch modes

Suggested visual:
- desktop/mobile split view

Speaker takeaway:
- the engineer translated the interaction model across input systems

## Slide 11. Engineering Assessment

Goal:
- be honest and credible

Key bullets:
- strong architecture and interaction design
- no test suite yet
- some semantic and persistence gaps remain

Suggested visual:
- strengths/risks scorecard

Speaker takeaway:
- the project is impressive and honest, not inflated

## Slide 12. Recruiter Value

Goal:
- translate into hiring language

Key bullets:
- interactive UI systems
- state architecture
- mobile UX adaptation
- full-stack product judgment
- structured AI integration

Suggested visual:
- skills matrix

Speaker takeaway:
- this project signals product engineering maturity

---

# 13. Recruiter-Facing Soundbites

## 10 Short Portfolio Bullets

- Built a spatial task-planning app where projects are navigable node graphs instead of flat lists.
- Designed a recursive subgraph model so high-level tasks can expand into nested workspaces.
- Implemented dependency edges and execution-focused highlighting for blocked and actionable work.
- Added both canvas and list views over the same graph data.
- Integrated AI-generated task decomposition that materializes as structured nodes and edges.
- Built touch-specific interaction patterns instead of relying on desktop-only gestures.
- Used Zustand for centralized graph state, persistence, and undo/redo.
- Synced authenticated workspaces to Supabase while keeping AI API keys local-only.
- Added multi-select, batch actions, contextual menus, and destructive-action safeguards.
- Packaged the app as a polished React/Vite SPA with mobile/PWA-friendly behavior.

## 10 Recruiter-Friendly Technical Bullets

- Modeled the workspace as normalized `Project -> Graph -> Node/Edge` data with recursive `childGraphId` links.
- Used ReactFlow as an interaction engine while keeping domain state and mutations application-owned.
- Wrote a centralized workspace store with navigation, graph mutations, local persistence, and temporal undo history.
- Implemented coordinate-aware quick-add using screen-to-flow conversion and viewport-aware placement.
- Added requestAnimationFrame throttling for touch drag updates and disabled animated edges on touch devices.
- Designed a mobile interaction system with long-press action sheets, floating task creation, and tap-to-connect edge mode.
- Built a debounced Supabase sync layer that hydrates remote state after auth and falls back to local/default workspace generation.
- Isolated Gemini API keys from cloud sync by storing them separately in localStorage.
- Parsed structured JSON from Gemini and converted model-generated dependency slugs into internal UUID-based graphs.
- Supported inline node editing, resize controls, breadcrumb navigation, and graph/list parity across one shared data model.

## 5 “Impressive but Honest” One-Liners

- SpatialTasks shows how far a frontend-heavy product can go when state modeling and interaction design are treated as first-class engineering problems.
- The strongest part of the project is not the tech stack; it is the recursive task-graph product model built on top of it.
- This is a richer systems project than a typical productivity app because the UI is driven by graph structure, dependency semantics, and device-specific interaction logic.
- The codebase demonstrates strong product engineering judgment: use ReactFlow for leverage, own the domain model, and keep the backend surface minimal.
- The project is clearly beyond CRUD, even though it still has honest alpha-stage gaps in semantics, testing, and production hardening.

## 5 Concise Descriptions at Different Lengths

### 1 sentence

SpatialTasks is a React-based visual task workspace that lets users decompose projects into nested node graphs, connect dependencies, and switch between planning and execution-oriented views.

### 2 sentences

SpatialTasks turns task management into a navigable graph instead of a flat list. Users can place tasks on a canvas, open container nodes into nested subflows, connect dependencies, and sync their workspace through Supabase while optionally generating subgraphs with Gemini.

### 50 words

SpatialTasks is a canvas-based productivity tool for planning complex work as recursive task graphs. It combines draggable nodes, nested subgraphs, dependency edges, execution-focused highlighting, graph/list dual views, touch-friendly mobile interactions, and optional AI-generated subtask expansion in a compact React + TypeScript architecture.

### 100 words

SpatialTasks is a spatial task-planning application built with React, TypeScript, ReactFlow, Zustand, and Supabase. Instead of organizing work as flat checklists, it models projects as graphs of action nodes and container nodes, where containers open into nested child graphs. Users can place and connect tasks visually, switch to a list view when they want a simpler representation, and use execution mode to emphasize what is actionable versus blocked. The app also includes touch-specific interaction patterns, local persistence, authenticated cloud sync, and an optional BYOK Gemini feature that generates structured subtasks and dependency edges directly into the graph.

### 200 words

SpatialTasks is a frontend-heavy productivity system that explores a different interface for personal organization: a recursive task graph instead of a list or board. At the product level, it lets users represent tasks as action nodes, group higher-level work into container nodes, open those containers into nested subgraphs, and connect dependencies with edges. At the system level, it uses a normalized graph model in Zustand, translates that state into a ReactFlow canvas, and supports both graph and list views over the same underlying data. The app also includes an execution mode that changes visual emphasis based on dependency state, touch-friendly interaction fallbacks for mobile, and a Supabase-backed auth and workspace sync layer. A notable feature is Magic Expand, which sends a container title to Gemini, parses structured JSON subtasks, and converts them into a new child graph with nodes and edges. The project stands out because it combines interaction-rich frontend engineering, product UX thinking, state architecture, BaaS integration, and structured AI output, while still being honest about its current limitations in testing, deep container semantics, and production hardening.

---

# 14. Evidence Table

| Claim / Insight | Why it matters | Supporting files/modules | Confidence | Good candidate for slide/infographic? |
|---|---|---|---|---|
| SpatialTasks is fundamentally graph-based, not list-based | Core product differentiation | `src/types/index.ts`, `src/components/Canvas/CanvasArea.tsx` | High | Yes |
| The product supports recursive decomposition through child graphs | Strongest technical/product story | `src/types/index.ts`, `src/components/Nodes/ContainerNode.tsx`, `src/store/workspaceStore.ts` | High | Yes |
| The same data model powers both graph and list views | Signals strong information architecture | `src/App.tsx`, `src/components/ListView/ListView.tsx` | High | Yes |
| Mobile interaction design is intentionally different from desktop | Shows UX maturity | `src/components/Canvas/CanvasArea.tsx`, `src/components/Layout/TopBar.tsx`, `src/index.css` | High | Yes |
| Workspace sync is local-first plus authenticated cloud backup | Strong product engineering story | `src/store/workspaceStore.ts`, `src/hooks/useWorkspaceSync.ts`, `src/lib/workspaceSync.ts` | High | Yes |
| Gemini integration produces structured graph data, not just text | Makes the AI feature concrete | `src/services/gemini.ts`, `src/components/Nodes/ContainerNode.tsx` | High | Yes |
| Undo/redo is implemented through temporal middleware | Adds maturity to interaction-heavy UI | `src/store/workspaceStore.ts`, `src/components/Layout/TopBar.tsx` | High | Yes |
| The app now includes Supabase auth and sync despite stale docs saying otherwise | Important for accurate presentation | `src/components/Auth/AuthGate.tsx`, `src/lib/workspaceSync.ts`, `README.md`, `DEPLOYMENT_ASSESSMENT.md` | High | Yes |
| Container dependency semantics are incomplete | Important honest limitation | `src/utils/logic.ts`, `src/types/index.ts`, `src/utils/generator.ts` | High | Yes |
| Viewport persistence is modeled but not actually wired through ReactFlow | Honest architecture gap | `src/types/index.ts`, `src/components/Canvas/CanvasArea.tsx` | High | No |
| The repo has no automated tests | Engineering-quality caveat | repo search | High | No |
| The build works, but the bundle is large | Useful production-readiness note | verified via `npm run build` | High | Yes |

---

# 15. Gaps, Weaknesses, and Future Opportunities

## Honest Current Limitations

- Container dependency semantics are incomplete. `isNodeBlocked` relies on predecessor `status`, but containers do not currently have a consistent computed completion status.
- Container progress is not recursive. It only counts immediate child action nodes.
- Replacing existing child content through Magic Expand creates a new child graph but does not delete the old one.
- `Graph.viewport` exists in the model but is not restored or updated through ReactFlow.
- Undo history only tracks part of workspace state.
- Cloud sync likely includes some transient UI fields that should arguably remain local-only.
- Graph and list implementations duplicate some container and AI behavior.
- No automated tests are present.
- Export/share workflows are not implemented in the user-visible UI.
- The production bundle is large enough to trigger Vite’s chunk-size warning.

## Strong Next-Step Opportunities

- Add recursive container completion and unify it with blocked/actionable logic.
- Persist viewport per graph and restore it on re-entry.
- Extract shared container behaviors into graph-domain helpers to reduce duplication.
- Fix Magic Expand replacement to prune or migrate old child graphs.
- Introduce schema validation for imported and synced workspace payloads.
- Add a lightweight test suite around store mutations, dependency logic, and AI graph generation.
- Add export/import UI and read-only share workflows.
- Add snapping, alignment guides, or auto-layout helpers.
- Split the bundle or lazy-load heavier surfaces.
- Refresh stale repo docs to match the implementation.

## Portfolio-Enhancing Improvements

- Restored viewport-per-subgraph flow would make demos feel more polished.
- Recursive container status would make execution mode much stronger.
- Read-only share links would make the product easier to present externally.
- Even a small automated test suite would improve perceived engineering maturity significantly.
- A polished set of demo workspaces and screenshots would improve recruiter impact.

---

# 16. Final Presentation-Ready Extraction

## A. Best Recruiter Messages

- SpatialTasks demonstrates interaction-heavy frontend engineering through a recursive task-graph workspace built on ReactFlow and Zustand.
- The project shows strong product engineering judgment by combining canvas UX, dependency semantics, dual views, mobile adaptation, cloud sync, and AI generation without overbuilding the backend.
- It is clearly more than a task CRUD app because the main challenge is synchronizing spatial interactions, nested navigation, and workflow logic.

## B. Best Technical Highlights

- Normalized recursive graph model with `childGraphId`-based subflows
- ReactFlow adapter translating store state into draggable, resizable, connectable nodes
- Execution mode that visualizes blocked versus actionable work
- Touch-specific interaction redesign: long-press action sheet, FAB add, select/connect modes
- Debounced Supabase sync with local-only Gemini key isolation
- Structured AI expansion that converts JSON subtasks into graph nodes and dependency edges

## C. Best Visuals to Create

- Annotated hero screenshot of the workspace
- Recursive subgraph architecture diagram
- Input -> state -> render -> sync pipeline
- Desktop vs mobile interaction comparison
- Execution mode before/after view
- Magic Expand flow diagram
- Graph view vs list view panel
- “Why this is not a generic task app” comparison matrix

## D. Best Architecture Diagram to Draw

```text
AuthGate / Supabase session
-> App shell
-> Zustand workspace store
-> ReactFlow canvas or ListView
-> localStorage persist + undo history
-> debounced Supabase save

Side branch:
Container node
-> Gemini prompt
-> JSON subtasks
-> child graph creation
-> auto-navigation into subgraph
```

## E. Best Workflow Story to Tell

Tell the story of a user opening a project, laying out top-level tasks spatially, turning ambiguous work into container nodes, drilling down into those containers, connecting dependencies, switching into execution mode to see what is actionable, and then optionally using AI to instantly generate a structured subflow for one container.

## F. Best Evidence-Backed Claims

- SpatialTasks uses a recursive task-graph model rather than a flat task list.
- The same graph data powers both canvas and list interfaces.
- The mobile version intentionally changes interaction mechanics rather than just shrinking the desktop UI.
- AI output is parsed into structured graph data, not simply displayed as text.
- The current implementation includes Supabase auth and cloud sync, even though some docs still describe a local-only version.

## G. Best Concise Project Description

SpatialTasks is a visual task-planning system that models projects as recursive node graphs instead of flat lists. Users can arrange tasks spatially, drill into container nodes as nested subflows, connect dependencies, switch between canvas and list views, and use execution mode or AI-generated subtasks to move from planning into action.

---

# Stretch Goals

## What Makes SpatialTasks Different from a Generic Task Manager?

- It makes task structure visible through spatial layout, not just status labels.
- It supports recursive decomposition, so a task can become its own workspace instead of a long checklist.
- It layers dependency-aware execution semantics onto a freeform planning surface.

## What Technical Story Should I Tell About SpatialTasks in an Interview?

- Start with the product problem: complex work has shape, dependencies, and nested detail that flat lists hide.
- Explain the model: normalized graphs, action/container nodes, child graph recursion, and a shared store.
- Explain the interaction layer: ReactFlow canvas, coordinate transforms, drag/resize/connect, and mobile-specific interaction redesign.
- Explain the full-stack boundary: Supabase for auth and workspace storage, Gemini for structured subtask generation, no unnecessary custom backend.
- End with honest tradeoffs: strong frontend systems design, with known next steps around container semantics, viewport persistence, testing, and shareability.

## Which Parts of SpatialTasks Are Most Visually Impressive and Should Be Turned into Screenshots/Mockups First?

- The root graph with a mix of action and container nodes plus visible dependency edges
- A container node opened into a child graph to prove the recursive subflow concept
- Execution mode showing “next actionable” highlighting and blocked states
- A side-by-side graph view and list view of the same workspace
- A mobile mockup showing FAB add, long-press action sheet, and compact top-bar controls

---

# Verification Notes

- Implementation inspected directly from the source files listed at the top of this report
- Local app run verified the auth shell and runtime entry path
- `npm run build` succeeds
- Current production build emits a large bundle warning and no automated tests were found
