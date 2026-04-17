export type NodeStatus = 'todo' | 'in_progress' | 'done';
export type NodeType = 'action' | 'container';

export interface ImageAttachment {
    id: string;             // crypto.randomUUID()
    dataUrl: string;        // base64 data URL (V1 storage strategy)
    name?: string;          // original filename, used for display / alt text
    mimeType?: string;      // e.g. 'image/png'
    addedAt: number;        // Date.now() — stable ordering for V1
    // Reserved for future use (not wired in V1):
    // caption?: string;
    // hidden?: boolean;
}

/**
 * Closed enum of accent colors for a node. Used purely for at-a-glance
 * categorization — no semantic meaning, no filtering. Closed set (vs.
 * arbitrary hex) keeps Tailwind's JIT happy and preserves theme compatibility.
 */
export type AccentColor = 'gray' | 'red' | 'amber' | 'green' | 'blue' | 'purple' | 'pink';

export interface NodeMeta {
    notes?: string;
    tags?: string[];
    verification?: string;
    images?: ImageAttachment[];
    imagesOpen?: boolean; // persisted open/closed state of the Visual References section
    color?: AccentColor;  // optional accent color shown as a left-edge bar and list dot
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

export type GeminiConnectionStatus = 'no_key' | 'configured' | 'error';

export interface GeminiSubtask {
    id: string;
    title: string;
    dependsOn: string[];
}

// AI Flow Generation types
export interface DraftNode {
    id: string;
    label: string;
    description?: string;
    children?: DraftNode[];
    order: number;
}

export interface FlowDraft {
    id: string;
    title: string;
    sourcePrompt: string;
    status: 'draft' | 'accepted' | 'discarded';
    nodes: DraftNode[];
    createdAt: string;
}

export interface WorkspaceSettings {
    theme?: 'dark' | 'light';
    geminiApiKey?: string;
    geminiStatus?: GeminiConnectionStatus;
    /** Once a user has seen (or dismissed) the empty-canvas onboarding, never show it again. */
    hasSeenOnboarding?: boolean;
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
