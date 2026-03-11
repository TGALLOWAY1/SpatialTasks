# Spatial Tasks Deployment Assessment

## Executive Summary

Spatial Tasks is a **frontend-only React SPA** built with Vite, ReactFlow, Zustand, and Tailwind CSS. It has **no backend, no database, no authentication, and no server-side code**. All data is persisted to `localStorage` in the browser.

**Current deployment status: Partially deployable.**

The static frontend can be deployed immediately to any static hosting provider (Vercel, Azure Static Web Apps, Netlify). However, deploying a **public product where users create accounts and persist data across devices** requires building an entire backend layer that does not currently exist.

**The fastest path to a V1 launch is: Vercel (frontend) + Supabase (auth + database).** Azure is feasible but significantly more complex for a solo developer.

Key findings:
- Build succeeds cleanly (368KB total output)
- Zero backend code exists — no API routes, no server, no database client
- All state lives in browser localStorage via Zustand persist
- Gemini AI integration uses BYOK (bring-your-own-key) directly from the browser — no backend proxy
- No authentication of any kind
- No environment variables are required (nothing server-side exists)
- The app is ready for static deployment today, but not for multi-user production use

---

## Current Architecture

```
┌─────────────────────────────────────────────┐
│               Browser (Client)              │
│                                             │
│  React 18 + Vite 5 + TypeScript 5          │
│  ┌─────────────────────────────────────┐    │
│  │  Zustand Store (workspaceStore.ts)  │    │
│  │  └── persist → localStorage         │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │  ReactFlow Canvas (CanvasArea.tsx)  │    │
│  │  ├── ActionNode.tsx                 │    │
│  │  └── ContainerNode.tsx              │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │  Gemini API (gemini.ts)             │    │
│  │  └── Direct browser → Google API    │    │
│  │      (BYOK: user provides key)      │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Layout: Sidebar + TopBar + Canvas          │
│  Styling: Tailwind CSS 3.4                  │
│  UI: lucide-react icons                     │
└─────────────────────────────────────────────┘
```

### Framework & Libraries

| Component | Technology | Version |
|-----------|-----------|---------|
| Frontend framework | React | 18.2.0 |
| Build tool | Vite | 5.2.0 |
| Language | TypeScript | 5.2.2 |
| Canvas/graph | ReactFlow | 11.11.4 |
| State management | Zustand | 5.0.10 |
| Styling | Tailwind CSS | 3.4.3 |
| Icons | lucide-react | 0.562.0 |
| IDs | uuid | 13.0.0 |
| Seeded RNG | seedrandom | 3.0.5 |

### Data Model

The app uses a hierarchical task structure:

- **Workspace** → contains Projects, Graphs, Settings
- **Project** → has a root Graph
- **Graph** → contains Nodes (action/container) and Edges
- **Container Node** → links to a child Graph (enabling nested task hierarchies)
- **Action Node** → leaf task with status (todo/in_progress/done)

All data is stored as a single JSON blob in `localStorage` under key `spatialtasks-workspace`.

### Key Files

| File | Purpose |
|------|---------|
| `src/store/workspaceStore.ts` | Zustand store with localStorage persistence — the entire data layer |
| `src/services/gemini.ts` | Direct browser-to-Google Gemini API calls (BYOK) |
| `src/types/index.ts` | TypeScript types for the data model |
| `src/utils/generator.ts` | Demo data generator (3 sample projects) |
| `src/utils/logic.ts` | Dependency blocking and progress computation |
| `src/components/Canvas/CanvasArea.tsx` | ReactFlow canvas integration |
| `src/components/Nodes/ContainerNode.tsx` | Container node with Magic Expand AI feature |
| `src/components/Nodes/ActionNode.tsx` | Action/task node |
| `src/components/Layout/Sidebar.tsx` | Project list + settings panel (Gemini key config) |
| `vercel.json` | SPA rewrite rule for Vercel deployment |

---

## Deployment Blockers

### Build Issues
**None.** The project builds cleanly.
- `tsc` passes with zero errors
- `vite build` produces a 368KB production bundle
- No missing dependencies or type errors

### Backend/API Issues
**Critical: No backend exists.**
- There is no server, no API routes, no serverless functions
- The Zustand store persists exclusively to `localStorage`
- There is no mechanism to save data to a server
- No REST or GraphQL API layer
- For multi-user deployment, an entire backend must be built

### Authentication Issues
**Critical: No authentication exists.**
- No login, signup, or session management
- No user model or concept of user identity
- No auth library integrated (no Clerk, Supabase Auth, Firebase Auth, NextAuth, etc.)
- The Gemini API key is stored in localStorage (per-browser, not per-user)

### Database/Data Persistence
**Critical: No persistent database.**
- All data lives in `localStorage` — it is browser-specific and ephemeral
- Clearing browser data destroys all user work
- No cross-device access
- No backup or export to server
- The `jsonImport` method exists but is client-side only

### Environment Configuration
**Minimal concern currently.**
- No `.env` file is needed (no server-side secrets)
- The Gemini API key is user-provided (BYOK) and stored client-side
- A `vercel.json` already exists with correct SPA routing
- `.gitignore` correctly excludes `node_modules/`, `dist/`, `.env`

### Security Risks
**Medium risk areas:**
1. **Gemini API key in localStorage**: The BYOK key is stored in plaintext in `localStorage`. This is the intended design (user owns the key), but it means any XSS vulnerability would expose the key.
2. **`jsonImport` accepts arbitrary JSON**: `workspaceStore.ts:158-165` — the `jsonImport` method calls `JSON.parse` and directly calls `set(data)` on the Zustand store with no validation. This could inject arbitrary state.
3. **No CSP headers**: No Content-Security-Policy configured.
4. **No rate limiting on Gemini calls**: Users can spam the Magic Expand button (though this costs them their own API quota).

### Scalability Concerns
**Not applicable yet** — the app is entirely client-side. Once a backend is added:
- The graph data model (nested graphs with edges) could produce large payloads
- localStorage has a ~5-10MB limit per origin, which could be hit with many projects
- ReactFlow performance may degrade with very large graphs (hundreds of nodes)

---

## Deployment Architecture Options

### Option A: Vercel + Supabase (Recommended)

```
┌──────────────────┐
│   Vercel (CDN)   │  ← Static React SPA hosting
│   Frontend SPA   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│    Supabase      │  ← Auth + Database + Realtime
│  ┌────────────┐  │
│  │ Auth       │  │  ← Email/password, OAuth (Google, GitHub)
│  │ PostgreSQL │  │  ← Workspace data, user profiles
│  │ Row-Level  │  │  ← Per-user data isolation via RLS
│  │ Security   │  │
│  └────────────┘  │
└──────────────────┘
         │
         ▼
┌──────────────────┐
│  Google Gemini   │  ← Direct from browser (BYOK unchanged)
│  API (optional)  │
└──────────────────┘
```

**Why this option:**
- Supabase provides auth + database + Row-Level Security in one service
- Supabase JS client works directly from the browser (no backend needed)
- Free tier: 500MB database, 50K monthly active users, 1GB storage
- Vercel free tier: unlimited static deployments, global CDN
- Total cost: **$0/month** for V1 at low scale
- Minimal code changes: replace `localStorage` persistence with Supabase client calls
- Built-in email/password auth and OAuth providers

### Option B: Azure Static Web Apps + Azure Functions + CosmosDB

```
┌─────────────────────────┐
│ Azure Static Web Apps   │  ← Static hosting + CDN
│ (Frontend)              │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Azure Functions          │  ← API layer (Node.js)
│ (Serverless Backend)     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Azure CosmosDB          │  ← Document database
│ (Serverless tier)       │
└─────────────────────────┘

Auth: Azure Entra ID / Azure Static Web Apps built-in auth
```

**Why this might work:**
- Azure SWA has built-in auth (GitHub, Microsoft, Google via Entra)
- CosmosDB serverless tier is pay-per-request
- Integrated deployment from GitHub
- Good for organizations already using Azure

**Why it's harder:**
- Requires writing Azure Functions for every CRUD operation
- CosmosDB has a learning curve and higher minimum cost ($0 serverless but with per-RU charges)
- Azure auth configuration is more complex than Supabase
- More infrastructure to manage for a solo developer
- Azure SWA built-in auth is limited (no email/password by default, needs Entra B2C for that)

### Option C: Render + PostgreSQL

```
┌──────────────────┐
│ Render (Static)  │  ← Static site hosting
│ Frontend SPA     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Render (Web Svc) │  ← Express.js / Hono API
│ Backend API      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Render PostgreSQL│  ← Managed Postgres
└──────────────────┘

Auth: Custom (Passport.js / Lucia) or Clerk
```

**Why it's an option:**
- Simple, all-in-one platform
- Free tier available (with limitations: services spin down after inactivity)

**Why it's worse for this project:**
- Requires writing a full Express.js backend from scratch
- Render free tier spins down after 15 min inactivity (slow cold starts)
- More operational complexity than Supabase's client-side approach

---

## Azure Feasibility

### 1. Is Azure a good fit for this project?

**No, Azure is not ideal for a solo developer launching V1 of this app.** It is a viable option but adds unnecessary complexity compared to Vercel + Supabase.

### 2. Recommended Azure Architecture (if forced to use Azure)

```
Azure Static Web Apps (Free tier)
    ├── Built-in auth (GitHub, Microsoft providers)
    ├── Linked Azure Functions (API routes)
    │   └── CRUD operations for workspaces
    └── Custom domain support

Azure CosmosDB for NoSQL (Serverless)
    └── JSON document storage for workspace data
        (natural fit for the nested graph/node structure)

Azure Entra ID B2C (if email/password auth needed)
    └── User registration and login flows
```

**Estimated Azure cost:**
- Static Web Apps: Free (100GB bandwidth/month)
- Functions: Free (1M executions/month)
- CosmosDB Serverless: ~$0.25 per million RUs (likely $1-5/month for low usage)
- Entra B2C: Free for first 50K auth/month
- **Total: ~$1-5/month**

### 3. Azure vs Vercel + Supabase

| Factor | Azure | Vercel + Supabase |
|--------|-------|-------------------|
| Setup complexity | High — multiple services to configure | Low — 2 services, quick setup |
| Auth setup | Complex — Entra B2C for email/password | Simple — `supabase.auth.signUp()` |
| Backend code needed | Yes — Azure Functions for all CRUD | No — Supabase JS client from browser |
| Database | CosmosDB (powerful but complex) | PostgreSQL (familiar, mature) |
| Row-level security | Manual implementation in Functions | Built-in RLS policies |
| Cost at V1 scale | $1-5/month | $0/month |
| Deployment | GitHub Actions / SWA CLI | `git push` to Vercel |
| Documentation | Enterprise-focused, verbose | Developer-focused, concise |
| Scaling ceiling | Very high (enterprise grade) | High (sufficient for years) |
| Solo dev experience | Mediocre | Excellent |

**Verdict:** Use Azure only if there is an organizational requirement. For a solo developer, Vercel + Supabase is faster to launch, cheaper, and simpler to maintain.

---

## Recommended Stack

### Vercel + Supabase (Option A)

**Why it is best:**
1. **Zero backend code for V1**: Supabase JS client calls the database directly from the browser using auto-generated REST APIs, protected by Row-Level Security. No need to write API routes.
2. **Auth in 30 minutes**: Supabase Auth provides email/password + OAuth (Google, GitHub) with prebuilt UI components (`@supabase/auth-ui-react`).
3. **Natural data model fit**: The workspace JSON blob can be stored as a JSONB column in PostgreSQL, requiring minimal schema design for V1.
4. **Free at launch scale**: Both Vercel and Supabase free tiers are generous enough for thousands of users.
5. **Vercel already configured**: `vercel.json` exists with correct SPA routing.
6. **Minimal code changes**: The Zustand store's `persist` middleware can be swapped to save/load from Supabase instead of localStorage.

**Expected cost:**
- Vercel Pro (if needed): $20/month (free tier sufficient for V1)
- Supabase Pro (if needed): $25/month (free tier sufficient for V1)
- **V1 launch: $0/month**

**Complexity:** Low. ~2-3 days of development for a capable solo developer.

**Scalability:** Supabase free tier supports 500MB database and 50K MAU. Pro tier at $25/month supports 8GB database and 100K MAU. This is sufficient for years of growth.

---

## Step-by-Step Deployment Plan

### Phase 1: Immediate Static Deploy (Day 1)

Deploy the current app as-is to validate the build pipeline.

- [ ] **1.1** Create a Vercel account and connect the GitHub repository
- [ ] **1.2** Set the build command to `npm run build` and output directory to `dist`
- [ ] **1.3** Deploy — the app will work immediately with localStorage persistence
- [ ] **1.4** Verify the deployment at the Vercel URL
- [ ] **1.5** (Optional) Configure a custom domain in Vercel settings

### Phase 2: Supabase Setup (Day 1-2)

- [ ] **2.1** Create a Supabase project at [supabase.com](https://supabase.com)
- [ ] **2.2** Create the database schema:

```sql
-- Users table is auto-created by Supabase Auth

-- Workspaces table: stores the entire workspace JSON per user
CREATE TABLE workspaces (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    data JSONB NOT NULL,  -- The full workspace state
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Row-Level Security: users can only access their own data
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own workspaces"
    ON workspaces FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workspaces"
    ON workspaces FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workspaces"
    ON workspaces FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workspaces"
    ON workspaces FOR DELETE
    USING (auth.uid() = user_id);
```

- [ ] **2.3** Enable email/password auth in Supabase Dashboard → Authentication → Providers
- [ ] **2.4** (Optional) Enable Google and/or GitHub OAuth providers
- [ ] **2.5** Note the Supabase project URL and anon key (these are public, safe for frontend)

### Phase 3: Install Dependencies (Day 2)

- [ ] **3.1** Install Supabase client:
  ```bash
  npm install @supabase/supabase-js
  ```
- [ ] **3.2** (Optional) Install auth UI components:
  ```bash
  npm install @supabase/auth-ui-react @supabase/auth-ui-shared
  ```

### Phase 4: Add Supabase Client (Day 2)

- [ ] **4.1** Create `src/lib/supabase.ts`:
  ```typescript
  import { createClient } from '@supabase/supabase-js';

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  export const supabase = createClient(supabaseUrl, supabaseAnonKey);
  ```

- [ ] **4.2** Create `.env.local` (git-ignored):
  ```
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key
  ```

- [ ] **4.3** Add these environment variables in Vercel project settings

### Phase 5: Add Authentication (Day 2-3)

- [ ] **5.1** Create `src/components/Auth/AuthGate.tsx` — a wrapper that shows login/signup when not authenticated and the app when authenticated
- [ ] **5.2** Use Supabase's `onAuthStateChange` listener to track auth state
- [ ] **5.3** Wrap the `<App />` component with `<AuthGate>` in `main.tsx`
- [ ] **5.4** Add a sign-out button to the Sidebar
- [ ] **5.5** Test login, signup, and session persistence

### Phase 6: Connect Data to Supabase (Day 3)

- [ ] **6.1** Modify `workspaceStore.ts` to load workspace data from Supabase on auth
- [ ] **6.2** Replace the Zustand `persist` localStorage middleware with custom sync:
  - On login: fetch workspace from Supabase, hydrate Zustand store
  - On state change: debounced save to Supabase (e.g., 2-second debounce)
  - On logout: clear Zustand store
- [ ] **6.3** Keep localStorage as a fallback/cache for offline resilience
- [ ] **6.4** Handle first-time users: generate default workspace and save to Supabase

### Phase 7: Security & Polish (Day 3)

- [ ] **7.1** Validate the `jsonImport` function (add schema validation or remove it for V1)
- [ ] **7.2** Ensure the Gemini API key remains in localStorage (BYOK — it should NOT be sent to your server)
- [ ] **7.3** Add `<meta>` tags for SEO/social sharing
- [ ] **7.4** Add a loading state while workspace data loads from Supabase
- [ ] **7.5** Add error handling for Supabase network failures (show toast)
- [ ] **7.6** Test that RLS policies prevent cross-user data access

### Phase 8: Production Deployment (Day 3)

- [ ] **8.1** Set environment variables in Vercel (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- [ ] **8.2** Deploy to Vercel via `git push`
- [ ] **8.3** Test full flow: signup → create project → add tasks → logout → login → verify data persists
- [ ] **8.4** Configure custom domain (if desired)
- [ ] **8.5** Enable Supabase email confirmations (optional for V1, can skip for faster onboarding)

---

## V1 Simplifications

To launch quickly, the following simplifications are recommended:

### Keep for V1
- Single workspace per user (store the entire workspace as one JSONB blob)
- BYOK Gemini integration (no backend proxy needed)
- Email/password auth (simplest to implement)
- Dark theme only (current design)
- All current features: canvas, nodes, edges, navigation, execution mode

### Defer to V2
- **Collaborative/shared workspaces** — adds major complexity (realtime sync, permissions)
- **Granular database schema** — for V1, store the whole workspace as JSON; normalize tables later
- **Server-side Gemini proxy** — BYOK from browser is fine for V1
- **Email verification** — skip for V1, enable later
- **Password reset flow** — Supabase provides this but can be polished in V2
- **Data export/import UI** — the `jsonImport` method exists but doesn't need a UI for V1
- **Light theme** — only dark theme exists currently
- **Multiple projects per workspace** — this already works but is not critical to limit

### Features to Disable for V1 (if needed for speed)
- **`resetWorkspace` / "Regenerate Data" button** — this makes sense for a demo but is confusing for real users with real data. Consider removing or hiding it behind a confirmation.
- **`jsonImport` function** — unvalidated JSON import is a security concern. Disable or validate.

---

## Estimated Cost

### V1 Launch (0-1,000 users)

| Service | Tier | Monthly Cost |
|---------|------|-------------|
| Vercel | Free (Hobby) | $0 |
| Supabase | Free | $0 |
| Domain | .com registration | ~$12/year |
| **Total** | | **~$1/month** |

### Growth Phase (1,000-10,000 users)

| Service | Tier | Monthly Cost |
|---------|------|-------------|
| Vercel | Pro | $20 |
| Supabase | Pro | $25 |
| **Total** | | **~$45/month** |

### Azure Equivalent (for comparison)

| Service | Tier | Monthly Cost |
|---------|------|-------------|
| Static Web Apps | Free | $0 |
| Functions | Consumption | ~$0-2 |
| CosmosDB | Serverless | ~$1-5 |
| Entra B2C | Free tier | $0 |
| **Total** | | **~$1-7/month** |

Azure is slightly cheaper at scale but requires significantly more development time (writing API routes, configuring auth, managing infrastructure).

---

## Final Recommendation

**Deploy with Vercel + Supabase.**

The rationale is straightforward:

1. **The app has zero backend code today.** Supabase eliminates the need to write one — its JS client can query the database directly from the browser, secured by Row-Level Security. This turns a "build an entire backend" task into a "configure a database table and write a few client calls" task.

2. **The data model is a natural fit for JSONB storage.** For V1, store the entire workspace as a single JSON blob per user. This requires one database table and zero schema migrations. Normalize later if needed.

3. **Auth is solved in hours, not days.** Supabase Auth + `@supabase/auth-ui-react` provides a drop-in login/signup form with email/password and OAuth support.

4. **Vercel is already configured.** The `vercel.json` file exists with correct SPA routing. Deployment is `git push`.

5. **Cost is $0 for V1.** Both free tiers are generous enough for initial launch and early growth.

6. **The Gemini BYOK pattern requires no changes.** The direct browser-to-Google-API call with user-provided keys works perfectly without a backend.

**Estimated development time: 2-3 focused days** to go from current state to a deployed V1 with auth and persistent data storage.

**Azure is a reasonable choice only if** there is an organizational mandate, existing Azure credits, or a compliance requirement that necessitates it. For a solo developer optimizing for speed and simplicity, it adds friction without meaningful benefit at V1 scale.
