# Spatial Tasks — Feature Opportunity Analysis

> **Version note:** Analysis written against `origin/main @ 9fa07d8` (2026-04-15). Some recommendations from earlier drafts have since been shipped — see "Recently Shipped" below. Features referenced here live alongside the canonical UI contract in [EXPECTED_UI_BEHAVIORS.md](EXPECTED_UI_BEHAVIORS.md).

## Context

This is a product strategy deliverable, not an implementation plan. Spatial Tasks today is a ReactFlow-based canvas with two node types (action + container), hard-dependency edges, three view modes (graph / list / focus), BYOK Gemini AI for flow generation and magic-expand, image attachments on nodes, debounced single-user Supabase sync, and a mobile-friendly touch layer.

### Recently shipped (no longer opportunities)
- **Focus View mode** — single-task card UI with Space/Enter status cycling, ←/→ prev/skip, ParallelChooser for branching successors, celebration screen ([FocusView.tsx](src/components/FocusView/FocusView.tsx)).
- **List View routing** — segmented control in TopBar switches graph / list / focus ([TopBar.tsx:88](src/components/Layout/TopBar.tsx:88)).
- **Image attachments** — base64 images on nodes with inline thumbnail grid and fullscreen lightbox ([ImagesEditor.tsx](src/components/Nodes/ImagesEditor.tsx)).
- **UI behavior spec** — canonical [EXPECTED_UI_BEHAVIORS.md](EXPECTED_UI_BEHAVIORS.md) now exists; further work should conform to it.

### Remaining ground-truth observations
- **Blocked state is silent.** `isNodeBlocked()` in [src/utils/logic.ts](src/utils/logic.ts) returns a boolean — users see a lock icon but never learn *which* predecessor is blocking them.
- **AI is one-shot and layout-blind.** `generateFlow` and `magicExpand` in [src/services/gemini.ts](src/services/gemini.ts) return full JSON with no streaming, no refinement, no spatial layout suggestions; generated nodes land in a crude grid.
- **Spatial memory is fragile.** Nodes have free positions but no grouping, snapping, regions, or landmarks. Containers force hierarchy; there's no middle ground between "same canvas" and "child graph."
- **Notes are plain text.** Despite images now shipping, the notes field itself is still a textarea — no markdown, no links, no checklists.
- **Multi-select is limited.** Multi-select exists but only supports Delete; no bulk status change, color, region, or group.
- **No persistence beyond undo.** zundo is session-scoped; closing the tab loses history. No snapshots or restore points.

The opportunity: tighten the mental model, make spatial relationships load-bearing, and finish scaffolded affordances (`FlowDraft` types in [src/types/index.ts](src/types/index.ts) remain unused; `Node.meta` has room for tags/custom fields with no UI).

---

## SECTION 1 — Top Feature Opportunities (HIGH PRIORITY)

### 1.1 "Why is this blocked?" — Predecessor Trace
**Problem:** Users hit a lock icon and don't know what to do next. `isNodeBlocked()` returns true but offers no explanation, and there are often 2–5 incoming edges.

**Solution:** Tapping the lock (or hovering on desktop) highlights the offending predecessor(s) in the graph with a pulsing red outline, auto-pans the viewport to include them, and shows a breadcrumb-style chip bar: `Blocked by: "Draft RFC" → "Get approval"`. Clicking a chip jumps to that node. In Focus View, the equivalent is a "Blocked by" section above the hero card, tap-to-navigate.

**Why it's high-leverage:** This is the single biggest mental-model fix. It converts the dependency graph from decorative into *useful*, and it costs ~1 day of work because `isNodeBlocked` already walks incoming edges — just return the offending node IDs instead of a boolean.

**UX concept:** Persistent lock badge on blocked nodes. Tap → red "spotlight" animation on predecessors + auto-zoom-to-fit on the blocking subset. Mobile: bottom sheet listing blockers with tap-to-navigate.

**Technical complexity:** **Low.** Refactor `isNodeBlocked` → `getBlockingNodes(nodeId): NodeId[]`. Add spotlight overlay + smooth fitView. Focus View already routes to successors after completion; reusing that affordance for blockers is natural.

---

### 1.2 Spatial Regions (Named Areas / "Rooms")
**Problem:** Containers force hierarchy. Users often want to *visually* group related tasks without nesting them into a subgraph. Today there's no middle ground between "same canvas" and "child graph."

**Solution:** Draggable, resizable, semi-transparent background regions with a title and optional color. Nodes inside a region move with it. Regions have no semantic effect on dependencies — they're purely spatial landmarks ("Q2 Launch", "Research", "Ideas Parking Lot").

**Why it's high-leverage:** Regions turn the canvas into a real workspace. They give spatial memory hooks ("the thing in the red zone upper-left"), reduce the pressure to over-nest into containers, and provide a surface for zoom-dependent labeling.

**UX concept:** Hold-drag on empty canvas with a modifier (or two-finger drag on touch) → region appears. Double-click to name. Regions render *behind* nodes with ~15% fill opacity. When zoomed out, region titles grow larger and node details fade — the regions become your map.

**Technical complexity:** **Medium.** New primitive in the store (regions array on Graph), custom ReactFlow node type with lowest z-index, drag-in/drag-out detection, zoom-dependent CSS.

---

### 1.3 Smart Layout (Auto-Arrange Selection)
**Problem:** After `magicExpand` or markdown import, generated nodes land in a crude grid. Users spend minutes re-arranging. The canvas lacks snapping, alignment, or tidy-up.

**Solution:** Two commands: **(a) Auto-layout selection** (dagre/ELK top-to-bottom flow respecting edges) and **(b) Tidy** (align on invisible grid without re-flowing dependencies). Both animate to final position so users preserve spatial memory.

**Why it's high-leverage:** Makes AI generation usable. Removes the #1 friction after any flow import. Pairs with Regions — tidy within a region.

**UX concept:** Select nodes → "Tidy ⌥T" in context menu. Animated 400ms transition. For mobile, bottom-sheet with "Auto-arrange" button appears after AI generation completes.

**Technical complexity:** **Medium.** Add `dagre` (well-trodden). Complication: containers are nested graphs, so layout runs per-graph only.

---

### 1.4 Rich Notes (Markdown, Links, Checklists)
**Problem:** Images shipped, but `meta.notes` is still a plain textarea. Users paste URLs that don't render, can't write `- [ ]` sub-checklists, can't format. Notes are the second-densest content surface on a node (after the title) and deserve first-class treatment.

**Solution:** Upgrade notes to markdown with inline rendering: auto-link detection, `**bold**`/`_italic_`, and `- [ ]` checkbox syntax that renders as interactive checkboxes (tapping toggles — stored in the markdown source). Keep a toggle between edit and preview modes.

**Why it's high-leverage:** Nodes become real containers of *context*. Most tasks have an associated link or a handful of sub-items that don't warrant their own node. Checklist syntax in particular lets users handle micro-tasks without polluting the graph.

**UX concept:** Notes editor gains a minimal toolbar (bold, link, checklist). When viewing (not editing), markdown renders inline. Checkbox toggles persist back to the source text. Preview renders in list view and Focus View too.

**Technical complexity:** **Medium.** Markdown renderer (e.g. `react-markdown` with a checkbox plugin). The round-trip of checkbox toggles back to source text requires a small parser tweak. No new infrastructure — images already set the pattern for persistence.

---

### 1.5 AI Refinement Loop (Conversational Edits)
**Problem:** `magicExpand` and `generateFlow` are one-shot. If the user doesn't like the output, they discard and re-prompt. No "make these more technical", "split task 3 into two", "add testing phase." The `FlowDraft` type in [src/types/index.ts](src/types/index.ts) is defined but unused — suggesting this direction was scoped and dropped.

**Solution:** After generation, a collapsible AI chat rail lets the user issue follow-up instructions that operate on the *current draft*. The LLM returns diffs (add/remove/modify node), not a full replace. Users can accept/reject per-diff.

**Why it's high-leverage:** Huge quality lift for AI features without rebuilding them. Uses existing prompts + a diff format. Activates the already-defined `FlowDraft` scaffolding.

**UX concept:** DraftReviewPanel gains a chat input at bottom. Each LLM turn produces highlighted diffs on the draft tree (green add, red remove, amber modify). Accept/reject individually or in bulk.

**Technical complexity:** **Medium.** Requires a structured diff output format (JSON patch-like) and prompt engineering. No new infrastructure.

---

### 1.6 Multi-Select Bulk Operations
**Problem:** Multi-select exists but only supports Delete. Users can't bulk-edit status, move into container, assign color, or apply region membership. Refactoring a flow after AI generation is one-by-one.

**Solution:** When multiple nodes are selected, a contextual floating toolbar appears with: status change, color/tag, group into new container, move to region, align, distribute, duplicate.

**Why it's high-leverage:** Power-user lift with no conceptual debt. Enables the "refactor a flow" workflow after AI generation or after a project pivots.

**UX concept:** Floating toolbar near selection centroid. On mobile, bottom action sheet triggered by long-press after multi-tap.

**Technical complexity:** **Low–Medium.** Store actions already exist per-node; wrap in batched versions for undo/redo correctness.

---

### 1.7 Presence + Shared Links (Lightweight Multiplayer)
**Problem:** `useWorkspaceSync` is debounced single-user. No way to show a graph to a collaborator, no read-only link, no "who's looking at this" awareness. Sharing is the #1 request in any spatial tool.

**Solution:** Ship **read-only share links first** (generate signed URL → anonymous read access via Supabase RLS). Follow with Supabase Realtime presence: live cursors and avatars, no live editing yet. Full collaborative editing is v3.

**Why it's high-leverage:** Read-only share is a small lift and unblocks an entire use case (sharing plans in a meeting, getting feedback). Presence is a clear differentiator vs typical task apps.

**UX concept:** "Share" button in TopBar → modal with toggle ("Anyone with link can view"), copy URL. Viewers see watermark + grayed toolbar. Later: colored cursors + avatar stack in TopBar showing who's here.

**Technical complexity:** **Medium.** RLS policies + signed URL signing first. Realtime presence is a separate add-on.

---

### 1.8 Version History / Snapshots
**Problem:** Undo/redo is session-scoped (zundo). If the user closes the tab or an AI generation overwrites their work, it's gone. `magicExpand` already has a "replace children?" confirm modal — admission that destructive AI is scary.

**Solution:** Auto-snapshot on significant events (AI generation, import, bulk delete, daily). Timeline UI in Sidebar shows snapshots with labels. Restore = load snapshot into scratch workspace for comparison, then accept.

**Why it's high-leverage:** Makes aggressive AI features feel safe. Table stakes for a tool where work lives across weeks/months.

**UX concept:** Clock icon in TopBar opens snapshot drawer. Each snapshot is a miniature canvas preview. Hover/tap to preview, "Restore" button to load.

**Technical complexity:** **Medium.** Snapshot = JSON blob per workspace in Supabase. Retention policy (keep 20, thin after 30 days). Preview rendering is the fiddly part.

---

## SECTION 2 — Spatial-Native Features (DIFFERENTIATION)

These are the features that cannot exist — or feel fundamentally worse — in a list-based app. These are what justify the canvas.

### 2.1 Semantic Zoom
Zoom level changes *what's shown*, not just size. Zoomed out: region titles prominent, only container summaries visible. Mid-zoom: node titles. Zoomed in: notes, thumbnails, subtask checkboxes inline on the canvas. This turns zoom into a level-of-detail control, mirroring how architects read a floor plan.

### 2.2 Spatial Bookmarks (Named Views)
Save a `(viewport, zoom, visible regions)` tuple as a named view: "Sprint Review", "Research Corner", "Morning Standup". Jumping between views is an instant pan/zoom animation. This builds on the user's *spatial memory* rather than fighting it.

### 2.3 Magnetic Grouping
When you drag a node within ~40px of another, they "snap" into a lightweight group with a soft outline. Dragging the group moves both. Groups are not containers — they're fluid, ephemeral, dissolve when you pull a node out. Like magnets on a whiteboard.

### 2.4 Spatial Search (Locate, Don't List)
Cmd-K opens search. Typing highlights matching nodes *in place* on the canvas with everything else dimmed, and auto-pans to frame them. Unlike a list-based search result, users see *where things are* — reinforcing the spatial map.

### 2.5 Dependency Gravity (Auto-Suggest Positions)
When adding a new node connected to an existing one, the new node's suggested position respects flow direction (downstream = below/right). A soft visual "ghost" slot appears during connection drag, indicating where it'll land.

### 2.6 Pinch-to-Peek Containers
On touch, pinching *in* on a container without fully drilling shows a live preview of its children in a floating card. Releasing dismisses; tapping the card commits to navigation. A fundamentally mobile-native interaction.

---

## SECTION 3 — Quick Wins (LOW EFFORT, HIGH IMPACT)

1. **Blocked-by chip bar.** Render the blocking node titles on the lock tooltip. Full Feature 1.1 is bigger, but just *naming* the blocker is a half-day win.
2. **Theme toggle.** The type already has `theme: 'dark' | 'light'` in [src/types/index.ts](src/types/index.ts). Add a sidebar switch and CSS variable swap.
3. **Keyboard shortcuts cheatsheet.** `?` opens a modal listing the shortcuts in [CanvasArea.tsx](src/components/Canvas/CanvasArea.tsx) — they're invisible today.
4. **Node color/accent.** One field in `meta`, one swatch picker. Immediate visual expression boost; enables at-a-glance categorization without a tag system.
5. **Export JSON/Markdown.** Import exists, export is asymmetric. "Download workspace" in Sidebar settings.
6. **Empty-state onboarding.** New canvases show ghost nodes with example text ("double-click here to add a task"). Most users bounce at the empty canvas.
7. **Stream AI generation.** [gemini.ts](src/services/gemini.ts) uses `generateContent`, not streaming. Switching to stream + partial render reduces the 5–8s wait to perceived-instant.
8. **Selection-sync across views.** Selecting a node in graph view should pre-select it in list or Focus View on switch. Small, reinforces the "same data, different lens" story.

---

## SECTION 4 — Experimental / Novel Ideas

### 4.1 "Time Lens" — Slider Through History
A scrubbable timeline at the bottom of the canvas replays node creation/completion over time. Pulls from snapshot history (Feature 1.8). Helps users reflect on how a project actually unfolded. Doubles as a retrospective tool.

### 4.2 AI Spatial Layout Critic
After the user manually arranges nodes, an optional AI pass proposes layout improvements ("move 'Research' above 'Design' to match flow direction", "cluster these three — they share a predecessor"). Non-destructive suggestions with accept/reject. Teaches spatial discipline.

### 4.3 Photo → Graph (Whiteboard OCR)
Take a photo of a whiteboard or sticky-note wall → Gemini vision extracts boxes, arrows, and text → renders as a starter graph. Massive "wow" moment and the definitive migration path from analog to Spatial Tasks. Leverages the image-attachment primitive already shipped.

### 4.4 Voice-First Node Creation
Hold the FAB on mobile → record → Gemini transcribes *and* parses into nodes ("I need to draft the RFC, get it approved by legal, and then schedule the review meeting — legal blocks scheduling"). Returns 3 connected nodes. Fundamentally mobile-native.

### 4.5 Ambient Mode (Always-Open Background View)
A "dashboard" mode where the canvas renders with a specific region at large zoom, updated in realtime. Meant to be pinned to a second monitor or iPad. Acts as an active, evolving team wall rather than a doc you open.

### 4.6 Graph Embeddings → "Similar Tasks"
Hash each task's title+notes into an embedding. When the user creates a new node, softly surface similar existing nodes ("You have 3 open tasks that look related"). Reduces duplicate work; leverages accumulated graph as institutional memory.

### 4.7 Constraint-Based Scheduling (Soft)
Add optional `estimatedMinutes` to nodes. A "Fit today" command visualizes which chains of actionable tasks fit your available time (e.g., 3 hours) given the dependency graph. Not a calendar — a spatial filter.

---

## SECTION 5 — What NOT to Build

### 5.1 Don't build assignees + comments + @-mentions (yet).
Every task app converges on this. It turns Spatial Tasks into a Jira-lite and forces a permissions model it can't afford. Ship read-only sharing (1.7) first; resist full multiplayer until there's clear pull.

### 5.2 Don't add due dates as a first-class field.
Due dates pressure the tool toward calendar/Gantt/reminder territory — the opposite of "thinking surface." If time is needed, do it through regions ("Q2") or Feature 4.7's soft scheduling. A `dueDate` field on every node is a trap.

### 5.3 Don't build a native mobile app.
The current touch layer is genuinely good. A PWA with install prompt + offline-first (already partial) will match 80% of native UX at 10% of the cost. Only revisit if usage data proves otherwise.

### 5.4 Don't add custom fields / formulas / databases.
Notion and Airtable own that space. Going there dilutes the spatial identity. `Node.meta` should stay a place for *first-class opinionated features* (color, image, checklist), not a user-configurable schema.

### 5.5 Don't over-model dependency types.
The current "hard blocker" edge is enough. Adding "soft dependency", "informs", "related-to" turns edges into a taxonomy project. If needed, use edge labels as freeform annotations — not typed relationships.

### 5.6 Don't pivot AI into an autonomous agent.
`magicExpand` and Focus View's next-task routing are scoped and useful. Don't build "AI project manager that edits your graph while you sleep." The graph is the user's thought — AI should *serve* the spatial model, not own it.

### 5.7 Don't add integrations (Slack/GitHub/Linear).
Every integration is a promise of support forever. Ship clean JSON/Markdown export (Quick Win #5) and let users Zapier it themselves. Integrations are a post-PMF concern.

---

## Visual UI Concepts (for design tool handoff)

- **Blocked-by spotlight (Feature 1.1):** Dim canvas to ~30% opacity, blocker nodes keep full color with a 2px red ring + subtle pulse animation (1.5s). A 12px rounded chip bar floats at the bottom of the selected node showing blocker titles. In Focus View, a "Blocked by" section above the hero card.
- **Region primitive (Feature 1.2):** Rounded-rect, 24px corner radius, 12% fill of a palette color, 2px dashed border when selected else borderless. Title is top-left, 14px at base zoom, scales to 48px when zoomed out <0.4x.
- **Semantic zoom (Feature 2.1):** Three thresholds — <0.4x shows region titles only, 0.4–1.0x shows container + node titles, >1.0x shows notes thumbnails inline. Transitions cross-fade over 150ms as zoom crosses threshold.

## Interaction Metaphors

- **Magnetic grouping (2.3):** Physics-like snap with a subtle haptic on mobile. Visual: 4px dashed unifying outline that fades after 2s if undisturbed.
- **Spatial bookmarks (2.2):** Like keyboard tabs for viewports. Thumbnail strip at the bottom of the sidebar.
- **Pinch-to-peek (2.6):** iOS Safari 3D Touch preview inspiration — held pinch shows a card, release dismisses, tap-through commits.

---

## Prioritization Summary

| Tier | Features | Rationale |
|------|----------|-----------|
| **Ship next** | 1.1, Quick Wins 1–4, 6, 8 | Fix the blocking-state mental-model gap + finish obvious UX polish. |
| **Next quarter** | 1.2, 1.3, 1.4, 1.6 | Core spatial lift: regions, layout, rich notes, bulk ops. |
| **Differentiation** | 1.5, 1.7, 2.1, 2.2, 4.3, 4.4 | AI refinement, sharing, semantic zoom, voice/photo capture. |
| **Defer** | 1.8, 4.1, 4.5, 4.6, 4.7 | Valuable but depend on product maturity/usage data. |
| **Avoid** | All of Section 5 | Active tradeoffs, not omissions. |

---

## Relationship to existing docs

- **[EXPECTED_UI_BEHAVIORS.md](EXPECTED_UI_BEHAVIORS.md)** — canonical UI contract; any feature here that ships should extend that spec.
- **[SPATIAL_TASKS_QA_GUIDE.md](SPATIAL_TASKS_QA_GUIDE.md)** and **[QA_INVENTORY.md](QA_INVENTORY.md)** — per CLAUDE.md, each shipped feature should update both.

## Next steps

- Review with product/design lead before any feature is promoted to an implementation ticket.
- Each "Ship next" item should be broken into its own implementation plan when prioritized.
- Re-audit against `main` before building — this analysis decays quickly as features land.
