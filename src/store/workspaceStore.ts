import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { temporal } from 'zundo';
import { v4 as uuidv4 } from 'uuid';
import { Workspace, Node, Graph, Edge, Project, Folder, WorkspaceSettings, AccentColor } from '../types';
import type { LayoutStrategy, LayoutOrientation } from '../layout/layoutTypes';
import { migrateStrategy, migrateOrientation } from '../layout/layoutTypes';
import { generateWorkspace } from '../utils/generator';
import { saveGeminiConfig, loadGeminiConfig } from '../lib/workspaceSync';

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error';
export type CanvasAction =
    | { type: 'delete-selected' }
    | { type: 'fit-view' }
    | { type: 'advance-next'; fromNodeId: string }
    | { type: 'spotlight-blockers'; sourceNodeId: string; blockerIds: string[] }
    | { type: 'select-and-frame'; nodeId: string }
    | { type: 'auto-organize'; strategy: LayoutStrategy; orientation?: LayoutOrientation; nodeIds?: string[] };

interface WorkspaceState extends Workspace {
    // Transient flags (not persisted)
    _hydrated: boolean;
    _supabaseLoaded: boolean;
    selectMode: boolean;
    _hasSelection: boolean;
    connectMode: { active: boolean; sourceNodeId?: string };
    autoEditNodeId: string | null;
    sidebarOpen: boolean;
    viewMode: 'graph' | 'list' | 'focus';

    // Focus view session state (transient)
    focusNodeId: string | null;
    focusContextGraphId: string | null;

    // Sync status (transient)
    syncStatus: SyncStatus;
    syncError: string | null;
    lastSavedAt: number | null;

    // Canvas command queue (transient)
    pendingCanvasAction: CanvasAction | null;

    // Actions
    resetWorkspace: (seed?: string) => void;
    toggleSelectMode: () => void;
    setHasSelection: (v: boolean) => void;
    toggleConnectMode: () => void;
    setConnectSource: (nodeId: string) => void;
    clearConnectMode: () => void;
    setAutoEditNodeId: (nodeId: string | null) => void;
    toggleSidebar: () => void;
    closeSidebar: () => void;
    setViewMode: (mode: 'graph' | 'list' | 'focus') => void;
    setFocusTask: (nodeId: string, graphId: string) => void;
    clearFocusTask: () => void;
    loadProject: (projectId: string) => void;
    enterGraph: (graphId: string, nodeId: string, nodeLabel: string) => void;
    navigateBack: (steps?: number) => void;
    navigateToBreadcrumb: (index: number) => void;
    toggleExecutionMode: () => void;

    // Sync status actions
    setSyncStatus: (status: SyncStatus, error?: string | null) => void;

    // Canvas command actions
    dispatchCanvasAction: (action: CanvasAction) => void;
    clearCanvasAction: () => void;

    // Project management
    createProject: (title: string, folderId?: string) => void;
    renameProject: (projectId: string, title: string) => void;
    deleteProject: (projectId: string) => void;

    // Folder management
    createFolder: (title: string) => string;
    renameFolder: (folderId: string, title: string) => void;
    deleteFolder: (folderId: string, opts: { deleteProjects: boolean }) => boolean;
    toggleFolderCollapsed: (folderId: string) => void;
    moveProjectToFolder: (projectId: string, folderId: string | null) => void;

    // Graph edits
    addNode: (node: Node) => void;
    updateNode: (nodeId: string, data: Partial<Node>, graphId?: string) => void;
    setNodeColor: (nodeId: string, color: AccentColor | null, graphId?: string) => void;
    removeNode: (nodeId: string, graphId?: string) => void;
    removeEdge: (edgeId: string) => void;
    removeNodes: (nodeIds: string[]) => void;
    cycleNodeStatus: (nodeId: string, graphId?: string) => void;
    batchUpdateNodes: (nodeIds: string[], data: Partial<Node>) => void;
    batchUpdatePositions: (updates: Array<{ id: string; x: number; y: number }>) => void;
    addGraph: (graph: Graph) => void;
    removeGraphTree: (graphId: string) => void;
    addEdge: (edge: Edge) => void;
    updateSettings: (settings: Partial<WorkspaceSettings>) => void;
    onNodesChange: (changes: any[]) => void; // ReactFlow hook
    onEdgesChange: (changes: any[]) => void; // ReactFlow hook
    jsonImport: (json: string) => void;

    // Supabase sync
    hydrateFromSupabase: (data: Workspace) => void;
    setSupabaseLoaded: (loaded: boolean) => void;
}

const STORAGE_KEY = 'spatialtasks-workspace';

export const useWorkspaceStore = create<WorkspaceState>()(
    persist(
        temporal(
        (set, get) => ({
            // Initial State (overridden by hydrate if exists, or generator)
            ...generateWorkspace('42'),
            _hydrated: false,
            _supabaseLoaded: false,
            selectMode: false,
            _hasSelection: false,
            connectMode: { active: false },
            autoEditNodeId: null,
            sidebarOpen: false,
            viewMode: 'graph' as const,
            focusNodeId: null,
            focusContextGraphId: null,
            syncStatus: 'idle' as SyncStatus,
            syncError: null,
            lastSavedAt: null,
            pendingCanvasAction: null,

            toggleSelectMode: () => {
                set(state => ({ selectMode: !state.selectMode }));
            },

            setHasSelection: (v: boolean) => {
                set({ _hasSelection: v });
            },

            toggleConnectMode: () => {
                set(state => ({
                    connectMode: state.connectMode.active
                        ? { active: false }
                        : { active: true },
                }));
            },

            setConnectSource: (nodeId: string) => {
                set({ connectMode: { active: true, sourceNodeId: nodeId } });
            },

            clearConnectMode: () => {
                set({ connectMode: { active: false } });
            },

            setAutoEditNodeId: (nodeId: string | null) => {
                set({ autoEditNodeId: nodeId });
            },

            toggleSidebar: () => {
                set(state => ({ sidebarOpen: !state.sidebarOpen }));
            },

            closeSidebar: () => {
                set({ sidebarOpen: false });
            },

            setViewMode: (mode) => {
                set({ viewMode: mode });
            },

            setFocusTask: (nodeId, graphId) => {
                set({ focusNodeId: nodeId, focusContextGraphId: graphId });
            },

            clearFocusTask: () => {
                set({ focusNodeId: null, focusContextGraphId: null });
            },

            resetWorkspace: (seed = '42') => {
                set(generateWorkspace(seed));
            },

            toggleExecutionMode: () => {
                set(state => ({ executionMode: !state.executionMode }));
            },

            setSyncStatus: (status, error = null) => {
                set({
                    syncStatus: status,
                    syncError: error,
                    ...(status === 'saved' ? { lastSavedAt: Date.now() } : {}),
                });
            },

            dispatchCanvasAction: (action) => {
                set({ pendingCanvasAction: action });
            },

            clearCanvasAction: () => {
                set({ pendingCanvasAction: null });
            },

            loadProject: (projectId) => {
                const { projects, graphs } = get();
                const project = projects.find(p => p.id === projectId);
                if (!project) return;

                const rootGraph = graphs[project.rootGraphId];
                set({
                    activeProjectId: projectId,
                    activeGraphId: project.rootGraphId,
                    navStack: [{ graphId: rootGraph.id, label: rootGraph.title }],
                    executionMode: false // Reset execution mode on project load
                });
            },

            enterGraph: (graphId, nodeId, nodeLabel) => {
                const { graphs, navStack } = get();
                if (!graphs[graphId]) return;

                set({
                    activeGraphId: graphId,
                    navStack: [...navStack, { graphId, nodeId, label: nodeLabel }]
                });
            },

            navigateBack: (steps = 1) => {
                const { navStack } = get();
                if (navStack.length <= 1) return;

                const newStack = navStack.slice(0, navStack.length - steps);
                const target = newStack[newStack.length - 1];

                set({
                    activeGraphId: target.graphId,
                    navStack: newStack
                });
            },

            navigateToBreadcrumb: (index) => {
                const { navStack } = get();
                if (index < 0 || index >= navStack.length) return;

                const newStack = navStack.slice(0, index + 1);
                const target = newStack[index];

                set({
                    activeGraphId: target.graphId,
                    navStack: newStack
                });
            },

            createProject: (title, folderId) => {
                const { projects, graphs, folders } = get();
                const projectId = uuidv4();
                const rootGraphId = uuidv4();
                const now = new Date().toISOString();

                // Only attach folderId if it references an existing folder
                const validFolderId = folderId && folders.some(f => f.id === folderId) ? folderId : undefined;

                const newProject: Project = {
                    id: projectId,
                    title,
                    rootGraphId,
                    createdAt: now,
                    updatedAt: now,
                    folderId: validFolderId,
                };

                const rootGraph: Graph = {
                    id: rootGraphId,
                    projectId,
                    title,
                    nodes: [],
                    edges: [],
                };

                set({
                    projects: [...projects, newProject],
                    graphs: { ...graphs, [rootGraphId]: rootGraph },
                    activeProjectId: projectId,
                    activeGraphId: rootGraphId,
                    navStack: [{ graphId: rootGraphId, label: title }],
                    executionMode: false,
                });
            },

            renameProject: (projectId, title) => {
                const { projects } = get();
                set({
                    projects: projects.map(p =>
                        p.id === projectId ? { ...p, title, updatedAt: new Date().toISOString() } : p
                    ),
                });
            },

            deleteProject: (projectId) => {
                const { projects, graphs, activeProjectId } = get();
                const project = projects.find(p => p.id === projectId);
                if (!project || projects.length <= 1) return; // Prevent deleting the last project

                // Collect all graph IDs belonging to this project
                const graphIdsToDelete: string[] = [];
                const collectDescendantGraphIds = (graphId: string) => {
                    const g = graphs[graphId];
                    if (!g) return;
                    graphIdsToDelete.push(graphId);
                    g.nodes.forEach(n => {
                        if (n.childGraphId) collectDescendantGraphIds(n.childGraphId);
                    });
                };
                collectDescendantGraphIds(project.rootGraphId);

                // Remove graphs
                const updatedGraphs = { ...graphs };
                graphIdsToDelete.forEach(id => delete updatedGraphs[id]);

                // Remove project
                const updatedProjects = projects.filter(p => p.id !== projectId);

                // If deleting the active project, switch to another one
                const updates: Partial<WorkspaceState> = {
                    projects: updatedProjects,
                    graphs: updatedGraphs,
                };

                if (activeProjectId === projectId) {
                    const next = updatedProjects[0];
                    const nextRoot = updatedGraphs[next.rootGraphId];
                    updates.activeProjectId = next.id;
                    updates.activeGraphId = next.rootGraphId;
                    updates.navStack = [{ graphId: nextRoot.id, label: nextRoot.title }];
                    updates.executionMode = false;
                }

                set(updates);
            },

            createFolder: (title) => {
                const { folders } = get();
                const id = uuidv4();
                const now = new Date().toISOString();
                const newFolder: Folder = {
                    id,
                    title: title.trim() || 'Untitled Folder',
                    collapsed: false,
                    order: folders.length,
                    createdAt: now,
                    updatedAt: now,
                };
                set({ folders: [...folders, newFolder] });
                return id;
            },

            renameFolder: (folderId, title) => {
                const trimmed = title.trim();
                if (!trimmed) return;
                const { folders } = get();
                set({
                    folders: folders.map(f =>
                        f.id === folderId ? { ...f, title: trimmed, updatedAt: new Date().toISOString() } : f
                    ),
                });
            },

            toggleFolderCollapsed: (folderId) => {
                const { folders } = get();
                set({
                    folders: folders.map(f =>
                        f.id === folderId ? { ...f, collapsed: !f.collapsed } : f
                    ),
                });
            },

            moveProjectToFolder: (projectId, folderId) => {
                const { projects, folders } = get();
                const project = projects.find(p => p.id === projectId);
                if (!project) return;
                const targetFolderId = folderId && folders.some(f => f.id === folderId) ? folderId : undefined;
                if ((project.folderId ?? undefined) === targetFolderId) return;
                set({
                    projects: projects.map(p =>
                        p.id === projectId
                            ? { ...p, folderId: targetFolderId, updatedAt: new Date().toISOString() }
                            : p
                    ),
                });
            },

            deleteFolder: (folderId, { deleteProjects }) => {
                const { projects, folders, graphs, activeProjectId } = get();
                const folder = folders.find(f => f.id === folderId);
                if (!folder) return false;

                const projectsInFolder = projects.filter(p => p.folderId === folderId);

                if (!deleteProjects) {
                    // Move inner projects to root, then remove folder
                    set({
                        projects: projects.map(p =>
                            p.folderId === folderId
                                ? { ...p, folderId: undefined, updatedAt: new Date().toISOString() }
                                : p
                        ),
                        folders: folders.filter(f => f.id !== folderId),
                    });
                    return true;
                }

                // Deleting projects too — guard against emptying the workspace
                if (projects.length - projectsInFolder.length < 1) {
                    return false;
                }

                // Collect all descendant graph IDs for every project we're about to delete
                const graphIdsToDelete: string[] = [];
                const collect = (graphId: string) => {
                    const g = graphs[graphId];
                    if (!g) return;
                    graphIdsToDelete.push(graphId);
                    g.nodes.forEach(n => {
                        if (n.childGraphId) collect(n.childGraphId);
                    });
                };
                projectsInFolder.forEach(p => collect(p.rootGraphId));

                const updatedGraphs = { ...graphs };
                graphIdsToDelete.forEach(id => delete updatedGraphs[id]);

                const deletedIds = new Set(projectsInFolder.map(p => p.id));
                const updatedProjects = projects.filter(p => !deletedIds.has(p.id));
                const updatedFolders = folders.filter(f => f.id !== folderId);

                const updates: Partial<WorkspaceState> = {
                    projects: updatedProjects,
                    folders: updatedFolders,
                    graphs: updatedGraphs,
                };

                if (activeProjectId && deletedIds.has(activeProjectId)) {
                    const next = updatedProjects[0];
                    const nextRoot = updatedGraphs[next.rootGraphId];
                    updates.activeProjectId = next.id;
                    updates.activeGraphId = next.rootGraphId;
                    updates.navStack = [{ graphId: nextRoot.id, label: nextRoot.title }];
                    updates.executionMode = false;
                }

                set(updates);
                return true;
            },

            addNode: (node) => {
                const { activeGraphId, graphs } = get();
                if (!activeGraphId) return;

                const graph = graphs[activeGraphId];
                const updatedGraph = { ...graph, nodes: [...graph.nodes, node] };

                set({
                    graphs: { ...graphs, [activeGraphId]: updatedGraph }
                });
            },

            updateNode: (nodeId, data, graphId?) => {
                const { activeGraphId, graphs } = get();
                const targetGraphId = graphId || activeGraphId;
                if (!targetGraphId) return;

                const graph = graphs[targetGraphId];
                if (!graph) return;
                const updatedNodes = graph.nodes.map(n => n.id === nodeId ? { ...n, ...data } : n);

                set({
                    graphs: { ...graphs, [targetGraphId]: { ...graph, nodes: updatedNodes } }
                });
            },

            setNodeColor: (nodeId, color, graphId?) => {
                const { activeGraphId, graphs } = get();
                const targetGraphId = graphId || activeGraphId;
                if (!targetGraphId) return;

                const graph = graphs[targetGraphId];
                if (!graph) return;
                const updatedNodes = graph.nodes.map(n => {
                    if (n.id !== nodeId) return n;
                    const { color: _drop, ...restMeta } = n.meta ?? {};
                    const nextMeta = color ? { ...restMeta, color } : restMeta;
                    return { ...n, meta: nextMeta };
                });
                set({
                    graphs: { ...graphs, [targetGraphId]: { ...graph, nodes: updatedNodes } }
                });
            },

            removeNode: (nodeId, graphId?) => {
                const { activeGraphId, graphs } = get();
                const targetGraphId = graphId || activeGraphId;
                if (!targetGraphId) return;

                const graph = graphs[targetGraphId];
                if (!graph) return;
                const node = graph.nodes.find(n => n.id === nodeId);
                if (!node) return;

                // Collect descendant graph IDs for containers
                const graphIdsToDelete: string[] = [];
                const collectDescendantGraphIds = (gId: string) => {
                    const g = graphs[gId];
                    if (!g) return;
                    graphIdsToDelete.push(gId);
                    g.nodes.forEach(n => {
                        if (n.childGraphId) collectDescendantGraphIds(n.childGraphId);
                    });
                };
                if (node.childGraphId) collectDescendantGraphIds(node.childGraphId);

                // Remove node and its connected edges from the target graph
                const updatedNodes = graph.nodes.filter(n => n.id !== nodeId);
                const updatedEdges = graph.edges.filter(e => e.source !== nodeId && e.target !== nodeId);

                const updatedGraphs = {
                    ...graphs,
                    [targetGraphId]: { ...graph, nodes: updatedNodes, edges: updatedEdges }
                };

                // Delete descendant graphs
                graphIdsToDelete.forEach(id => delete updatedGraphs[id]);

                set({ graphs: updatedGraphs });
            },

            removeEdge: (edgeId) => {
                const { activeGraphId, graphs } = get();
                if (!activeGraphId) return;

                const graph = graphs[activeGraphId];
                set({
                    graphs: {
                        ...graphs,
                        [activeGraphId]: {
                            ...graph,
                            edges: graph.edges.filter(e => e.id !== edgeId)
                        }
                    }
                });
            },

            removeNodes: (nodeIds) => {
                const { activeGraphId, graphs } = get();
                if (!activeGraphId) return;

                const graph = graphs[activeGraphId];
                const nodeIdSet = new Set(nodeIds);

                // Collect all descendant graph IDs
                const graphIdsToDelete: string[] = [];
                const collectDescendantGraphIds = (graphId: string) => {
                    const g = graphs[graphId];
                    if (!g) return;
                    graphIdsToDelete.push(graphId);
                    g.nodes.forEach(n => {
                        if (n.childGraphId) collectDescendantGraphIds(n.childGraphId);
                    });
                };
                graph.nodes.forEach(n => {
                    if (nodeIdSet.has(n.id) && n.childGraphId) {
                        collectDescendantGraphIds(n.childGraphId);
                    }
                });

                const updatedNodes = graph.nodes.filter(n => !nodeIdSet.has(n.id));
                const updatedEdges = graph.edges.filter(e => !nodeIdSet.has(e.source) && !nodeIdSet.has(e.target));

                const updatedGraphs = {
                    ...graphs,
                    [activeGraphId]: { ...graph, nodes: updatedNodes, edges: updatedEdges }
                };
                graphIdsToDelete.forEach(id => delete updatedGraphs[id]);

                set({ graphs: updatedGraphs });
            },

            cycleNodeStatus: (nodeId, graphId?) => {
                const { activeGraphId, graphs } = get();
                const targetGraphId = graphId || activeGraphId;
                if (!targetGraphId) return;

                const graph = graphs[targetGraphId];
                if (!graph) return;
                const node = graph.nodes.find(n => n.id === nodeId);
                if (!node || !node.status) return;

                const cycle: Record<string, string> = {
                    todo: 'in_progress',
                    in_progress: 'done',
                    done: 'todo'
                };
                const nextStatus = cycle[node.status] || 'todo';

                const updatedNodes = graph.nodes.map(n =>
                    n.id === nodeId ? { ...n, status: nextStatus as any } : n
                );
                set({
                    graphs: { ...graphs, [targetGraphId]: { ...graph, nodes: updatedNodes } }
                });
            },

            batchUpdateNodes: (nodeIds, data) => {
                const { activeGraphId, graphs } = get();
                if (!activeGraphId) return;

                const graph = graphs[activeGraphId];
                const nodeIdSet = new Set(nodeIds);
                const updatedNodes = graph.nodes.map(n =>
                    nodeIdSet.has(n.id) ? { ...n, ...data } : n
                );
                set({
                    graphs: { ...graphs, [activeGraphId]: { ...graph, nodes: updatedNodes } }
                });
            },

            batchUpdatePositions: (updates) => {
                const { activeGraphId, graphs } = get();
                if (!activeGraphId || updates.length === 0) return;

                const graph = graphs[activeGraphId];
                const posMap = new Map(updates.map(u => [u.id, u]));
                const updatedNodes = graph.nodes.map(n => {
                    const pos = posMap.get(n.id);
                    return pos ? { ...n, x: pos.x, y: pos.y } : n;
                });
                set({
                    graphs: { ...graphs, [activeGraphId]: { ...graph, nodes: updatedNodes } }
                });
            },

            addGraph: (graph) => {
                const { graphs } = get();
                set({
                    graphs: { ...graphs, [graph.id]: graph }
                });
            },

            removeGraphTree: (graphId) => {
                const { graphs } = get();
                const idsToDelete: string[] = [];
                const collect = (gid: string) => {
                    const g = graphs[gid];
                    if (!g) return;
                    idsToDelete.push(gid);
                    g.nodes.forEach(n => {
                        if (n.childGraphId) collect(n.childGraphId);
                    });
                };
                collect(graphId);
                if (idsToDelete.length === 0) return;
                const updatedGraphs = { ...graphs };
                idsToDelete.forEach(id => delete updatedGraphs[id]);
                set({ graphs: updatedGraphs });
            },

            addEdge: (edge) => {
                const { graphs } = get();
                const targetGraphId = edge.graphId;
                if (!targetGraphId) return;

                const graph = graphs[targetGraphId];
                if (!graph) return;

                set({
                    graphs: {
                        ...graphs,
                        [targetGraphId]: {
                            ...graph,
                            edges: [...graph.edges, edge]
                        }
                    }
                });
            },

            updateSettings: (newSettings) => {
                const { settings } = get();
                const merged = { ...settings, ...newSettings };
                set({ settings: merged });

                // Persist Gemini keys to localStorage separately (never sent to Supabase)
                if ('geminiApiKey' in newSettings || 'geminiStatus' in newSettings) {
                    saveGeminiConfig({
                        geminiApiKey: merged.geminiApiKey,
                        geminiStatus: merged.geminiStatus,
                    });
                }
            },

            // Placeholders for RF hooks component integration
            onNodesChange: () => {
                // This logic is usually handled inside the component with applyNodeChanges from RF
                // But we need to sync it to our store.
                // For now, we'll let the component handle the RF specific logic and call updateNode/setNodes
            },

            onEdgesChange: () => { },

            jsonImport: (json) => {
                try {
                    const data = JSON.parse(json);
                    if (typeof data !== 'object' || !data) throw new Error('Invalid JSON');
                    if (!Array.isArray(data.projects)) throw new Error('Missing projects');
                    if (typeof data.graphs !== 'object') throw new Error('Missing graphs');
                    if (typeof data.version !== 'number') throw new Error('Missing version');

                    // Validate project shape
                    for (const p of data.projects) {
                        if (!p.id || !p.title || !p.rootGraphId) throw new Error('Invalid project');
                    }

                    // Folders are optional for backward compatibility
                    if (data.folders !== undefined && !Array.isArray(data.folders)) {
                        throw new Error('Invalid folders');
                    }

                    // Validate graph/node/edge shape
                    for (const [gid, g] of Object.entries(data.graphs)) {
                        const graph = g as any;
                        if (!graph.id || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
                            throw new Error(`Invalid graph: ${gid}`);
                        }
                        for (const n of graph.nodes) {
                            if (!n.id || !n.type || !n.title || typeof n.x !== 'number' || typeof n.y !== 'number') {
                                throw new Error(`Invalid node in graph ${gid}`);
                            }
                        }
                        for (const e of graph.edges) {
                            if (!e.id || !e.source || !e.target) {
                                throw new Error(`Invalid edge in graph ${gid}`);
                            }
                        }
                    }

                    // Sanitize: strip any prototype pollution
                    const clean = JSON.parse(JSON.stringify(data));
                    // Default folders to [] for pre-v2 imports
                    if (!Array.isArray(clean.folders)) clean.folders = [];
                    set(clean);
                } catch (e) {
                    console.error("Failed to import", e);
                }
            },

            // Supabase sync actions
            hydrateFromSupabase: (data) => {
                const geminiConfig = loadGeminiConfig();
                const legacy = data.settings?.preferredLayoutStrategy;
                set({
                    ...data,
                    folders: Array.isArray(data.folders) ? data.folders : [],
                    settings: {
                        ...data.settings,
                        geminiApiKey: geminiConfig.geminiApiKey,
                        geminiStatus: geminiConfig.geminiStatus,
                        preferredLayoutStrategy: migrateStrategy(legacy),
                        preferredLayoutOrientation: migrateOrientation(
                            legacy,
                            data.settings?.preferredLayoutOrientation,
                        ),
                    },
                    _supabaseLoaded: true,
                });
            },

            setSupabaseLoaded: (loaded) => {
                set({ _supabaseLoaded: loaded });
            },
        }),
        {
            partialize: (state) => {
                const { _hydrated, _supabaseLoaded, ...rest } = state;
                // Only track data fields for undo/redo, not transient flags
                return { graphs: rest.graphs, projects: rest.projects, folders: rest.folders } as WorkspaceState;
            },
            limit: 50,
        }
        ),
        {
            name: STORAGE_KEY,
            storage: createJSONStorage(() => localStorage),
            version: 2,
            migrate: (persistedState: any, fromVersion: number) => {
                if (!persistedState || typeof persistedState !== 'object') return persistedState;
                if (fromVersion < 2) {
                    return {
                        ...persistedState,
                        version: 2,
                        folders: Array.isArray(persistedState.folders) ? persistedState.folders : [],
                        projects: Array.isArray(persistedState.projects)
                            ? persistedState.projects.map((p: any) => ({ ...p, folderId: p.folderId ?? undefined }))
                            : [],
                    };
                }
                return persistedState;
            },
            partialize: (state) => {
                // Exclude transient flags and actions from localStorage
                const { _hydrated, _supabaseLoaded, selectMode, _hasSelection, connectMode, autoEditNodeId, sidebarOpen, viewMode, focusNodeId, focusContextGraphId, syncStatus, syncError, lastSavedAt, pendingCanvasAction, ...rest } = state;
                return rest;
            },
            onRehydrateStorage: () => {
                return (state) => {
                    if (state) {
                        state._hydrated = true;
                        // Safety net: if rehydration produced a workspace without folders (older save), heal it.
                        if (!Array.isArray(state.folders)) {
                            state.folders = [];
                        }
                        // Migrate legacy layout strategy values (cluster/hierarchy/flow → tidy).
                        const legacy = state.settings?.preferredLayoutStrategy;
                        if (state.settings) {
                            state.settings.preferredLayoutStrategy = migrateStrategy(legacy);
                            state.settings.preferredLayoutOrientation = migrateOrientation(
                                legacy,
                                state.settings.preferredLayoutOrientation,
                            );
                        }
                    }
                };
            },
        }
    )
);
