import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { temporal } from 'zundo';
import { v4 as uuidv4 } from 'uuid';
import { Workspace, Node, Graph, Edge, Project, WorkspaceSettings } from '../types';
import { generateWorkspace } from '../utils/generator';
import { saveGeminiConfig, loadGeminiConfig } from '../lib/workspaceSync';

interface WorkspaceState extends Workspace {
    // Transient flags (not persisted)
    _hydrated: boolean;
    _supabaseLoaded: boolean;
    selectMode: boolean;
    _hasSelection: boolean;
    connectMode: { active: boolean; sourceNodeId?: string };
    sidebarOpen: boolean;
    viewMode: 'graph' | 'list';

    // Actions
    resetWorkspace: (seed?: string) => void;
    toggleSelectMode: () => void;
    setHasSelection: (v: boolean) => void;
    toggleConnectMode: () => void;
    setConnectSource: (nodeId: string) => void;
    clearConnectMode: () => void;
    toggleSidebar: () => void;
    closeSidebar: () => void;
    setViewMode: (mode: 'graph' | 'list') => void;
    loadProject: (projectId: string) => void;
    enterGraph: (graphId: string, nodeId: string, nodeLabel: string) => void;
    navigateBack: (steps?: number) => void;
    navigateToBreadcrumb: (index: number) => void;
    toggleExecutionMode: () => void;

    // Project management
    createProject: (title: string) => void;
    deleteProject: (projectId: string) => void;

    // Graph edits
    addNode: (node: Node) => void;
    updateNode: (nodeId: string, data: Partial<Node>) => void;
    removeNode: (nodeId: string) => void;
    removeEdge: (edgeId: string) => void;
    removeNodes: (nodeIds: string[]) => void;
    cycleNodeStatus: (nodeId: string) => void;
    batchUpdateNodes: (nodeIds: string[], data: Partial<Node>) => void;
    addGraph: (graph: Graph) => void;
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
            sidebarOpen: false,
            viewMode: 'graph' as const,

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

            toggleSidebar: () => {
                set(state => ({ sidebarOpen: !state.sidebarOpen }));
            },

            closeSidebar: () => {
                set({ sidebarOpen: false });
            },

            setViewMode: (mode) => {
                set({ viewMode: mode });
            },

            resetWorkspace: (seed = '42') => {
                set(generateWorkspace(seed));
            },

            toggleExecutionMode: () => {
                set(state => ({ executionMode: !state.executionMode }));
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

            createProject: (title) => {
                const { projects, graphs } = get();
                const projectId = uuidv4();
                const rootGraphId = uuidv4();
                const now = new Date().toISOString();

                const newProject: Project = {
                    id: projectId,
                    title,
                    rootGraphId,
                    createdAt: now,
                    updatedAt: now,
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

            addNode: (node) => {
                const { activeGraphId, graphs } = get();
                if (!activeGraphId) return;

                const graph = graphs[activeGraphId];
                const updatedGraph = { ...graph, nodes: [...graph.nodes, node] };

                set({
                    graphs: { ...graphs, [activeGraphId]: updatedGraph }
                });
            },

            updateNode: (nodeId, data) => {
                const { activeGraphId, graphs } = get();
                if (!activeGraphId) return;

                const graph = graphs[activeGraphId];
                const updatedNodes = graph.nodes.map(n => n.id === nodeId ? { ...n, ...data } : n);

                set({
                    graphs: { ...graphs, [activeGraphId]: { ...graph, nodes: updatedNodes } }
                });
            },

            removeNode: (nodeId) => {
                const { activeGraphId, graphs } = get();
                if (!activeGraphId) return;

                const graph = graphs[activeGraphId];
                const node = graph.nodes.find(n => n.id === nodeId);
                if (!node) return;

                // Collect descendant graph IDs for containers
                const graphIdsToDelete: string[] = [];
                const collectDescendantGraphIds = (graphId: string) => {
                    const g = graphs[graphId];
                    if (!g) return;
                    graphIdsToDelete.push(graphId);
                    g.nodes.forEach(n => {
                        if (n.childGraphId) collectDescendantGraphIds(n.childGraphId);
                    });
                };
                if (node.childGraphId) collectDescendantGraphIds(node.childGraphId);

                // Remove node and its connected edges from the active graph
                const updatedNodes = graph.nodes.filter(n => n.id !== nodeId);
                const updatedEdges = graph.edges.filter(e => e.source !== nodeId && e.target !== nodeId);

                const updatedGraphs = {
                    ...graphs,
                    [activeGraphId]: { ...graph, nodes: updatedNodes, edges: updatedEdges }
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

            cycleNodeStatus: (nodeId) => {
                const { activeGraphId, graphs } = get();
                if (!activeGraphId) return;

                const graph = graphs[activeGraphId];
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
                    graphs: { ...graphs, [activeGraphId]: { ...graph, nodes: updatedNodes } }
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

            addGraph: (graph) => {
                const { graphs } = get();
                set({
                    graphs: { ...graphs, [graph.id]: graph }
                });
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
                    // Sanitize: strip any prototype pollution
                    const clean = JSON.parse(JSON.stringify(data));
                    set(clean);
                } catch (e) {
                    console.error("Failed to import", e);
                }
            },

            // Supabase sync actions
            hydrateFromSupabase: (data) => {
                const geminiConfig = loadGeminiConfig();
                set({
                    ...data,
                    settings: {
                        ...data.settings,
                        geminiApiKey: geminiConfig.geminiApiKey,
                        geminiStatus: geminiConfig.geminiStatus,
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
                return { graphs: rest.graphs, projects: rest.projects } as WorkspaceState;
            },
            limit: 50,
        }
        ),
        {
            name: STORAGE_KEY,
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => {
                // Exclude transient flags and actions from localStorage
                const { _hydrated, _supabaseLoaded, selectMode, _hasSelection, connectMode, sidebarOpen, viewMode, ...rest } = state;
                return rest;
            },
            onRehydrateStorage: () => {
                return (state) => {
                    if (state) state._hydrated = true;
                };
            },
        }
    )
);
