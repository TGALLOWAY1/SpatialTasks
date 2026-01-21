# SpatialTasks 🌌

A professional, local-first node canvas application for planning and executing complex flows. Inspired by the visual logic of TouchDesigner, SpatialTasks introduces **recursive subgraphs**—allowing nodes to contain entire canvases within them.

<img width="3600" height="1470" alt="image" src="https://github.com/user-attachments/assets/aeb3ffd7-8f0b-4129-94f7-37f053ffa57f" />

## 🚀 Key Features

- **Nested views (Subgraphs)**: Drill into "Container" nodes to reveal infinite levels of nested logic.
- **Execution Mode**: Toggle to highlight "Next Actionable" nodes and dim blocked dependencies.
- **Local-First & Offline**: Data persists in LocalStorage/IndexedDB; no server required.
- **Deterministic Synthetic Data**: Instant demo via curated scenarios (Morning Flow, Landing Page, Mixdown Pipeline).
- **Progress Roll-up**: Container nodes automatically calculate status based on leaf node completion.
- **Premium UX**: Smooth pan/zoom, drag-and-drop handles, and a modern "dark glass" aesthetic.

## 🛠 Tech Stack

- **Framework**: React 18 + Vite + TypeScript
- **Canvas Engine**: [React Flow](https://reactflow.dev/) (xyflow)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) (with Persistence)
- **Styling**: TailwindCSS
- **Icons**: Lucide React

## 🏁 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/TGALLOWAY1/SpatialTasks.git
   cd SpatialTasks
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Navigate to the app**
   Open `http://localhost:5173` (or the port indicated in your terminal).

## 📊 Data Model

SpatialTasks uses a normalized flat-store for graphs.
- **Workspace**: Global state, project list, navigation stack.
- **Project**: A collection of graphs with one designated root.
- **Graph**: Container for nodes and edges.
- **Node**: Can be an `action` (leaf) or a `container` (linking to another `graphId`).

## 📜 License

MIT
