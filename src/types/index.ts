export type NodeStatus = 'todo' | 'in_progress' | 'done';
export type NodeType = 'action' | 'container';

export interface NodeMeta {
    notes?: string;
    tags?: string[];
    [key: string]: any;
}

export interface Node {
    id: string;
    graphId: string;
    type: NodeType;
    title: string;
    x: number;
    y: number;
    width?: number;
    height?: number;

    // For leaf nodes (Action)
    status?: NodeStatus;

    // For container nodes (Container)
    childGraphId?: string;

    meta?: NodeMeta;
}

export interface Edge {
    id: string;
    graphId: string;
    source: string; // ReactFlow uses 'source' and 'target'
    target: string;
}

export interface Viewport {
    x: number;
    y: number;
    zoom: number;
}

export interface Graph {
    id: string;
    projectId: string;
    title: string;
    nodes: Node[];
    edges: Edge[];
    viewport?: Viewport;
}

export interface Project {
    id: string;
    title: string;
    rootGraphId: string;
    createdAt: string;
    updatedAt: string;
}

export interface WorkspaceSettings {
    theme?: 'dark' | 'light';
    [key: string]: any;
}

export interface Workspace {
    version: number;
    projects: Project[];
    activeProjectId: string | null;
    activeGraphId: string | null;
    // Navigation stack: array of { graphId, title } or just graphIds to build breadcrumbs
    navStack: { graphId: string; nodeId?: string; label: string }[];
    graphs: Record<string, Graph>; // Normalized store of all graphs by ID
    settings: WorkspaceSettings;
    executionMode?: boolean; // New Flag
}
