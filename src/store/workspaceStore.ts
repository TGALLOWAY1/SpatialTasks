import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Workspace, Node, Graph, Edge, WorkspaceSettings } from '../types';
import { generateWorkspace } from '../utils/generator';
import { saveGeminiConfig, loadGeminiConfig } from '../lib/workspaceSync';

interface WorkspaceState extends Workspace {
    // Transient flags (not persisted)
    _hydrated: boolean;
    _supabaseLoaded: boolean;

    // Actions
    resetWorkspace: (seed?: string) => void;
    loadProject: (projectId: string) => void;
    enterGraph: (graphId: string, nodeId: string, nodeLabel: string) => void;
    navigateBack: (steps?: number) => void;
    navigateToBreadcrumb: (index: number) => void;
    toggleExecutionMode: () => void;

    // Graph edits
    addNode: (node: Node) => void;
    updateNode: (nodeId: string, data: Partial<Node>) => void;
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
        (set, get) => ({
            // Initial State (overridden by hydrate if exists, or generator)
            ...generateWorkspace('42'),
            _hydrated: false,
            _supabaseLoaded: false,

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
            name: STORAGE_KEY,
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => {
                // Exclude transient flags and actions from localStorage
                const { _hydrated, _supabaseLoaded, ...rest } = state;
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
