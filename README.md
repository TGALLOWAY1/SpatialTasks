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

## Gemini AI (Optional)

Click the gear icon in the sidebar to add your own [Gemini API key](https://aistudio.google.com/apikey). Once configured, container nodes show a sparkle button that uses Gemini 2.5 Flash to automatically break down tasks into connected subtasks.

No API key is required for core functionality.

## Deployment

Configured for Vercel. Push to deploy or run:

```bash
npm run build
```
