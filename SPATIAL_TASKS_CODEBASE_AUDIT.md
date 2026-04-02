# Spatial Tasks Codebase Audit

## 1. Executive Summary

Spatial Tasks is **strongly demo-ready** and arguably **portfolio-ready for a “product-thinking prototype”**, but it is **not yet fully real-product-ready** for daily use.

- **What it is now:** A polished, differentiated visual planning tool with impressive interaction depth (canvas, nested graphs, execution mode, markdown import, optional AI decomposition).
- **What it is not yet:** A robust, confidence-inspiring task manager you could depend on every day without friction.
- **Biggest strengths:** Clear visual identity, cohesive graph model, solid amount of feature surface for a solo app, and surprisingly strong mobile considerations.
- **Biggest concerns:**
  1. Task-management fundamentals are still uneven (status model and completion semantics are inconsistent).
  2. State architecture is fragile in a few core places (store-wide subscriptions, event-driven cross-component coordination, mixed transient/persisted concerns).
  3. UX discoverability is still “power-user by accident” in key flows (editing, spatial operations, mode semantics).
  4. Edge-case resilience and operational trust are not yet strong enough (failed sync visibility, malformed data handling, heavy-graph behavior).

Bluntly: **this feels like a very good prototype that can impress quickly, but sustained everyday use will expose product cracks within minutes.**

## 2. What Works Well

### Product concept and differentiation

- The core concept is differentiated and coherent: graph-native task planning with nested subflows rather than forcing lists into pseudo-graphs.
- The **container → child graph** pattern is compelling and gives genuine depth for complex projects.
- Execution mode is a strong concept for reducing “what should I do next?” paralysis.

### Interface strengths

- Visual hierarchy is clear: action vs container nodes are easy to distinguish.
- Interaction vocabulary is rich: drag/pan/zoom, connect mode, context menus, long-press sheets, floating action button on touch.
- Breadcrumb navigation and depth indicator reduce total disorientation in nested flows.
- Notes and verification in the step panel are a smart bridge between planning and execution.

### Technical strengths

- Normalized graph storage keyed by graph id is a good base for nested structures.
- Recursive deletion of descendant graphs exists (important for avoiding graph tree leaks).
- Undo/redo integration and keyboard guards (typing-safe undo behavior) indicate thoughtful interaction engineering.
- Markdown import + review-before-commit is one of the strongest “real utility” features in the app.

## 3. Critical Issues

### Issue 1 — Completion logic is conceptually inconsistent
- **Severity:** Critical
- **Where:** `logic.ts`, `StepDetailPanel.tsx`, node components/store status usage.
- **Why it matters:** Container completion is derived by child progress, but the app also writes `status: 'done'` to container nodes in execution flow. Blocking/actionable decisions rely heavily on `status`, yet container status is not consistently source-of-truth-derived.
- **User impact:** Users can see contradictory state (container looks complete by status while child graph state may diverge later).
- **Recommended fix:** Formalize a domain rule: either (A) containers are strictly derived (never persisted `status`) or (B) explicit status is authoritative and child progress is secondary. Right now it mixes both.

### Issue 2 — Store-wide save indicator causes false “Saving…” churn
- **Severity:** High
- **Where:** `SaveIndicator.tsx` subscribing to every workspace store mutation.
- **Why it matters:** Any transient UI mutation (selection, sidebar open, connect mode, etc.) can trigger saving indicator behavior even when no persisted data changed.
- **User impact:** Erodes trust in sync semantics (“why is it saving when I just opened a menu?”).
- **Recommended fix:** Drive save indicator from explicit persistence pipeline events (debounced save start/success/failure), not generic store subscription.

### Issue 3 — Event-bus style document custom events create hidden coupling
- **Severity:** High
- **Where:** `CanvasArea.tsx` and `TopBar.tsx` (`canvas:*` events), execution-mode advance flow.
- **Why it matters:** Cross-component behavior depends on stringly-typed DOM events rather than typed domain actions.
- **User impact:** Hard-to-reproduce bugs as features grow; brittle behavior during refactors.
- **Recommended fix:** Move these into store actions or a typed command layer.

### Issue 4 — Incomplete durability/feedback for sync failures
- **Severity:** High
- **Where:** `workspaceSync.ts`, `useWorkspaceSync.ts`.
- **Why it matters:** Save failures are logged but not surfaced persistently. App claims offline safety, but users get limited feedback about sync health.
- **User impact:** Users may assume cloud persistence succeeded when it did not.
- **Recommended fix:** Add persistent sync status state (`online/saving/error/lastSavedAt`) visible in top bar; retry strategy and surfaced failures.

### Issue 5 — Large-bundle and scalability warning already present
- **Severity:** Medium-High
- **Where:** Build output (single ~637KB JS bundle minified).
- **Why it matters:** Performance and initial load will degrade on slower devices/networks; this gets worse with more features.
- **User impact:** Slower first-use and degraded perceived quality.
- **Recommended fix:** Route/lazy split heavy modals/features (AI/import panels), and split canvas/editor runtime where practical.

## 4. UX Gaps and Friction Points

### Onboarding/orientation

- New-user onboarding is still implicit. The app assumes users already understand spatial planning, dependencies, container drill-in, and mode toggles.
- “Execution vs Planning” is visually present but conceptually ambiguous; mode consequences are not explained in-product.
- Advanced features (markdown import, AI expand, notes, verification) are strong but not progressively introduced.

### Interaction ambiguity

- Edit affordances rely on double-click patterns in key spots, which remain low-discoverability.
- Some state changes are hidden/indirect (e.g., completion propagation and auto-advance behavior).
- Spatial interactions can feel clever in demo flow but can be cognitively expensive for recurring daily task entry.

### Information architecture friction

- Graph vs list mode is useful but not deeply integrated: users can perform core operations in both, yet mental model transitions remain rough.
- Nested graphs are powerful, but repeated depth navigation can become disorienting without richer contextual anchors.

### Missing states/feedback

- Error and failure feedback is inconsistent (e.g., import parse failure logs vs rich UI feedback elsewhere).
- Empty states exist in places, but many are utilitarian rather than guiding (they don’t teach next action or best workflow).
- Persistence confidence is under-communicated in degraded network states.

### Mobile vs desktop concerns

- Mobile effort is good, but touch interaction density is still high in complex canvases.
- Long-press/context gestures are powerful but can be slow for frequent operations.
- Spatial manipulation on small screens remains inherently harder; current UI mitigates but doesn’t fully solve that core friction.

### Demo-successful, real-use-failing patterns

- “Wow” features (AI expand, nested drill-in, execution visuals) present very well in curated demos.
- Repeated daily use exposes missing operational safety: robust recovery flows, conflict handling, and scalable task management ergonomics.

## 5. Core Workflow Audit

| Workflow | Status | Why |
|---|---|---|
| Create task | **Solid** | Available in canvas/list/mobile FAB with low friction. |
| Edit task | **Partial** | Works, but discoverability/consistency is weak across views. |
| Delete task | **Partial** | Functional, but confirmation and bulk semantics vary by context/type. |
| Mark complete | **Partial** | Easy for actions; container semantics are inconsistent. |
| Reopen completed | **Partial** | Possible by status cycling, but not explicit, and dependency implications are opaque. |
| Organize spatially | **Solid (small/medium graphs)** | Core canvas interactions work well in normal graph sizes. |
| Group/categorize/prioritize | **Fragile** | Grouping via containers is strong; priority/tagging remains minimal/unstructured. |
| Navigate contexts/subflows | **Partial** | Breadcrumbs help, but deep graph orientation and context retention are weak. |
| Persist across sessions | **Partial** | Local persistence is strong; cloud sync confidence/error transparency is not. |
| Handle many tasks | **Fragile** | Performance/scannability concerns rise; list+graph bridging not sufficient for scale. |
| Recover from mistakes | **Partial** | Undo exists, but higher-order recovery (sync/import/state corruption) is limited. |
| Understand what changed | **Missing/Fragile** | No explicit activity/change history or robust change explanations. |

## 6. Data Flow / State Management Risks

1. **Mixed state responsibilities in a single large store**
   - Domain data, UI-transient state, sync flags, and interaction modes coexist in one store.
   - This simplifies bootstrapping but increases accidental coupling and broad re-render/subscription effects.

2. **Derived vs persisted ambiguity**
   - Container completion/progress/status logic is not fully normalized.
   - Risks stale or contradictory UI and hard-to-debug edge behavior.

3. **Event-driven side effects outside typed action boundaries**
   - Custom DOM events coordinate key behavior (delete selected, fit-view, advance).
   - Harder to reason about than explicit store/domain commands.

4. **Partialized undo history excludes important UI context**
   - Undo tracking only slices specific fields. Reasonable for data focus, but user experience can feel inconsistent when UI context doesn’t align with reverted data state.

5. **Supabase sync is debounced and optimistic without robust rollback/reporting**
   - Good for responsiveness, but failure visibility and reconciliation strategy are underdeveloped.

6. **JSON import replacement is high-risk**
   - Validation is basic; malformed-but-accepted structures can still introduce latent instability.
   - Error feedback is too weak for a destructive state replacement operation.

## 7. Edge Cases and Failure Modes

### Likely to confuse or degrade

- **Zero tasks:** acceptable visuals, but onboarding guidance is thin.
- **One task:** works, but execution/dependency features feel overbuilt and confusing.
- **Many tasks:** graph clutter, interaction overhead, and performance concerns emerge.
- **Long titles:** multiline editing exists, but dense canvases can quickly become visually noisy.
- **Rapid add/edit/delete:** mostly functional, but hidden coupling + debounce timing can expose racey-feeling UI.
- **Refresh during transient actions:** pending save and optimistic UI may create trust issues.
- **Browser resize/mobile rotations:** spatial layout and viewport continuity risk disorientation.
- **Offline/network failure:** local durability likely okay, but user confidence and conflict semantics are weak.
- **Malformed imported data:** can silently fail or partially succeed without enough user-facing diagnostics.
- **Layout corruption/overlap:** no robust auto-layout recovery path for messy graphs.

## 8. Maintainability Assessment

### What is healthy

- TypeScript usage is decent and entity modeling is understandable.
- Core domain entities (Workspace/Graph/Node/Edge/Project) are explicit.
- Functional decomposition exists, and feature files are generally readable.

### What is risky

- Several components are growing into “multi-concern orchestrators” (especially canvas and list flows).
- Logic duplication exists (notably around expand/generation paths), increasing regression risk.
- Domain rules are not centralized (status/progress/blocked semantics spread across utils/components/store behavior).
- Testing coverage is effectively absent for critical workflows (despite complexity level now demanding it).

**Bottom line:** The codebase is still evolvable, but velocity will degrade unless core domain logic and cross-component orchestration are tightened soon.

## 9. Prioritized Action Plan

### Fix Before Demo

1. Clarify mode language and interaction hints (Planning vs Executing semantics).
2. Improve editing discoverability (persistent affordances, not only double-click).
3. Ensure delete/complete behaviors are consistent and predictable across graph/list/mobile.
4. Add a reliable visible sync state indicator (not generic store-change indicator).
5. Validate large-graph demo scenarios (avoid cluttered first impression).

### Fix Before Real Users

1. Normalize completion model for containers vs actions (single source of truth).
2. Replace document custom-event coordination with typed store/domain commands.
3. Harden sync reliability UX: explicit save failure states, retry, last-synced timestamps.
4. Strengthen import safety and diagnostics for malformed data.
5. Add test coverage for critical workflows (create/edit/delete/move/dependency/undo/sync).
6. Introduce layout recovery tools (auto-layout, overlap reduction, fit/organize utilities).

### Backlog / Nice-to-Have

1. Richer prioritization model (tags/priority lanes/filters).
2. Better history/change explanation (activity timeline).
3. Smarter repeated-use ergonomics (quick keyboard command palette, bulk operations).
4. Performance optimizations and code-splitting for heavier features.

## 10. Final Verdict

**Blunt verdict:** Spatial Tasks is currently an **excellent interactive prototype and strong demo artifact**, not yet a fully trustworthy day-to-day task product.

It is **close to becoming** a genuinely compelling niche productivity app because the core model is meaningful, not gimmicky. The spatial interaction is not just visual novelty — but it still needs stronger usability guardrails and state integrity discipline to hold up under repetitive real use.

**Smallest high-leverage upgrade set to elevate meaningfully:**
1. Unify status/progress domain logic (especially containers).
2. Replace implicit coupling (DOM events) with explicit typed actions.
3. Improve onboarding/discoverability for core interactions.
4. Make sync state trustworthy and transparent.
5. Add regression tests for the 6–8 core workflows that matter.

If these are addressed, the app can move from “impressive prototype” to “credible product-grade portfolio piece.”
