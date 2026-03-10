# SpatialTasks

A spatial, node-based task management system. Organize projects as connected nodes on a canvas, open nodes into nested subflows, and navigate through work visually.

![SpatialTasks Screenshot](screenshot.png)

## Features

- **Spatial Canvas** — Drag-and-drop nodes on an infinite canvas with pan and zoom
- **Nested Subflows** — Open container nodes to dive into nested workspaces
- **Visual Progress** — Track completion with progress rings and status indicators
- **Execution Mode** — Highlights actionable next steps and dims completed/blocked work
- **Dependency Tracking** — Edges between nodes enforce task ordering
- **Magic Expand (AI)** — Optionally use your own Gemini API key to auto-decompose tasks into subtask subflows
- **Persistent State** — All work is saved locally in the browser

## Tech Stack

- React 18 + TypeScript
- ReactFlow (node-flow canvas)
- Zustand (state management with localStorage persistence)
- Tailwind CSS
- Vite

## Getting Started

```bash
npm install
npm run dev
```

## Gemini AI Setup (Optional)

SpatialTasks supports an optional AI feature called **Magic Expand** that uses Google's Gemini 2.5 Flash to automatically break down a task into subtasks. This is a bring-your-own-key (BYOK) feature — no API key is required for core functionality.

### Step 1: Get a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click **Create API Key**
4. Select or create a Google Cloud project when prompted
5. Copy the generated API key

> Google offers a free tier for Gemini API usage. Limits vary by model and tier — check [Google's pricing page](https://ai.google.dev/pricing) for current details.

### Step 2: Add the Key to SpatialTasks

1. Open SpatialTasks in your browser
2. Click the **gear icon** in the top-left sidebar header
3. Paste your API key into the input field
4. Click **Save Key**
5. The status indicator will turn green showing "Key configured"

### Step 3: Use Magic Expand

1. Navigate to any project with container nodes (the purple nodes with a layer icon)
2. A **sparkle icon** will now appear on each container node next to the enter arrow
3. Click the sparkle icon on a container node
4. Gemini will generate 3–7 subtasks with dependencies and wire them into a nested subflow
5. The app automatically navigates into the new subgraph

### Troubleshooting

| Issue | Solution |
|-------|----------|
| No sparkle button visible | Open Settings and verify your key is saved (green status dot) |
| "Invalid API key" error | Double-check the key in Settings; regenerate it in AI Studio if needed |
| "Quota exceeded" error | You've hit your Gemini free-tier limit — wait or upgrade your plan |
| "Network error" | Check your internet connection and try again |

### Removing or Replacing Your Key

Open Settings (gear icon) and click **Remove** to delete your key, or paste a new one and click **Save Key** to replace it. Your key is stored locally in your browser's localStorage and is only sent to Google's Gemini API endpoint.

## Deployment

Configured for Vercel. Push to deploy or run:

```bash
npm run build
```
