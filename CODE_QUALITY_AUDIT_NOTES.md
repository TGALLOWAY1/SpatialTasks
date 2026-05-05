# Code Quality Audit Notes

## Repository Map
- `src/main.tsx` bootstraps React and wraps app with `ErrorBoundary` + `AuthGate`.
- `src/App.tsx` is the main shell routing among canvas/list/focus views and lazy AI/import modals.
- `src/components/*` contains UI feature areas (Canvas, FlowGenerator, Nodes, ExecutionPanel, Layout, Auth, shared UI).
- `src/store/*` holds Zustand state for auth + workspace domain.
- `src/services/gemini.ts` contains Gemini API integration for workflow generation and task expansion.
- `src/utils/*` contains parsing/graph/markdown and domain helpers plus Vitest unit tests in `src/utils/__tests__`.
- `src/lib/*` contains Supabase integration and sync plumbing.

## Main Execution Paths
- Startup: `src/main.tsx` → `AuthGate` → `App`.
- Auth/session: `src/components/Auth/*` + `src/store/authStore.ts` + `src/lib/supabase.ts`.
- Workspace/project interactions: `src/store/workspaceStore.ts` + UI surfaces (`CanvasArea`, `ListView`, `FocusView`).
- AI-assisted flow creation: `FlowGenerator` / `MarkdownImporter` → `src/services/gemini.ts` + draft utils.

## Build / Test / Lint Commands
- `npm run lint`
- `npm run test`
- `npm run build`

## Initial Risk Areas
- Gemini integration had duplicated request/error handling and weak response-shape assumptions.
- AI response parsing previously depended on direct nested indexing without guards.
- Type safety around parsed JSON objects in Gemini service used broad casts.

## Dead Code Removed
| File / Symbol | Reason Removed | Verification |
|---|---|---|
| None removed | No confidently-dead runtime code identified during this pass. | Checked imports/usages across `src` with `rg` and reviewed candidate low-reference files before deciding to keep. |

## Duplicate Logic Refactored
| Area | Before | After | Reason |
|---|---|---|---|
| Gemini request/error handling | `generateFlow` and `magicExpand` each repeated fetch body, network catch, and HTTP status mapping. | Extracted shared `requestGemini` + `buildGeminiError`. | Removes duplication and ensures consistent error behavior. |
| Gemini response extraction | Both functions duplicated `data.candidates[0]...text` access. | Added `getCandidateText` helper with explicit missing-text failure. | Centralizes fragile shape handling and improves readability. |

## Simplicity Refactors
| File | Problem | Change Made | Why It Is Simpler |
|---|---|---|---|
| `src/services/gemini.ts` | Mixed concerns (prompting, transport, status mapping, payload parsing) inside each exported function. | Moved HTTP transport and candidate text extraction into small helpers; kept domain validation local to each flow. | Main functions now read linearly and are easier to reason about. |
| `src/services/gemini.ts` | Verbose post-processing for node ordering used mutable second-pass loops. | Added `toDraftNodes` helper with index-driven ordering in one pass. | Reduces mutable bookkeeping and clarifies output shape. |

## Naming Consistency Changes
| Old Name | New Name | Reason |
|---|---|---|
| inline status mapping branches | `buildGeminiError` | Gives explicit domain name for API status translation responsibility. |
| direct nested text reads | `getCandidateText` | Makes response extraction intent explicit. |

## Type Safety Improvements
| Area | Issue | Change |
|---|---|---|
| Gemini API payload shape | Implicit `any` JSON envelope access for candidate text extraction. | Added `GeminiResponseEnvelope` and optional-chain guard helper. |
| Flow node normalization | `any` casts while mapping generated nodes/children. | Switched to `unknown[]` input and constrained shape coercion in `toDraftNodes`. |

## Error Handling Improvements
| Area | Issue | Change |
|---|---|---|
| Gemini HTTP errors | Duplicated status mapping increased drift risk. | Centralized mapping in `buildGeminiError` used by both calls. |
| Gemini parse failures | Candidate text access could throw unclear runtime errors. | Added `getCandidateText` and normalized parse failures to `parse_error`. |

## Tests Added or Updated
| Test | Behavior Protected |
|---|---|
| None added | Existing test suite still validates current utility and graph behavior; this pass focused on low-risk service simplification with unchanged external behavior. |

## Quality Gate Results
| Command | Result | Notes |
|---|---|---|
| `npm run lint` | Pass | No lint violations after refactor. |
| `npm run test` | Pass | Existing unit tests pass. |
| `npm run build` | Pass | TypeScript and Vite production build succeed. |

# Open Questions for Project Owner

## Product Direction
1. Should Gemini-assisted generation remain a hard dependency for flow creation, or should there be a first-class non-AI fallback path in production?

## Architecture
1. Should external API transport logic (Gemini, future providers) live in a small shared client module, or remain colocated per-service?

## Data Model
1. Is `DraftNode.children` intentionally optional vs. always an empty array for leaf nodes? A canonical choice would reduce conditional handling.

## UX Behavior
1. Should parse failures from AI responses include a recovery hint (for example: “try simpler prompt”), or stay generic?

## Cleanup Decisions
1. Should low-reference utility modules that are only used in one view remain split for readability, or be collapsed into feature-local files?

## Deployment / Production Readiness
1. Are there environment-level rate-limit/backoff requirements for Gemini calls beyond current one-shot request behavior?

# Code Quality Refactor Summary

## What Changed
- Simplified Gemini service with shared request, error-mapping, and response-text helpers.
- Tightened response typing and reduced unsafe nested payload access.
- Streamlined draft node normalization into a dedicated helper.

## What Was Removed
- Removed duplicated HTTP/request and status-handling branches in Gemini generation paths.

## What Was Simplified
- `generateFlow` and `magicExpand` now focus on prompt + domain validation only.

## Risks / Follow-ups
- AI responses remain untrusted free-form JSON; current validation is better but still intentionally lightweight.

## Open Questions
- See `CODE_QUALITY_AUDIT_NOTES.md`.

## Verification
- Verified with lint, tests, and production build.
