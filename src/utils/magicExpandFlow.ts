import { v4 as uuidv4 } from 'uuid';
import { Node as SpatialNode, Graph, Edge } from '../types';
import { magicExpand, GeminiError } from '../services/gemini';

const WIDTH = 200;
const HEIGHT = 80;
const PADDING_X = 50;

export interface MagicExpandParams {
    apiKey: string;
    nodeTitle: string;
    nodeNotes?: string;
    nodeId: string;
    existingChildGraphId?: string;
    ownerGraphId: string;
    graphs: Record<string, Graph>;
    removeGraphTree: (id: string) => void;
    addGraph: (graph: Graph) => void;
    updateNode: (id: string, data: Partial<SpatialNode>, graphId?: string) => void;
    enterGraph: (graphId: string, nodeId: string, label: string) => void;
}

export interface MagicExpandResult {
    subtaskCount: number;
}

export async function executeMagicExpand(params: MagicExpandParams): Promise<MagicExpandResult> {
    const {
        apiKey, nodeTitle, nodeNotes, nodeId,
        existingChildGraphId, ownerGraphId, graphs,
        removeGraphTree, addGraph, updateNode, enterGraph,
    } = params;

    const result = await magicExpand(apiKey, nodeTitle, nodeNotes);

    // Clean up old child graph tree to prevent orphans
    if (existingChildGraphId) {
        removeGraphTree(existingChildGraphId);
    }

    const currentGraph = ownerGraphId ? graphs[ownerGraphId] : null;
    const projectId = currentGraph?.projectId || '';
    const childGraphId = uuidv4();
    const childGraph: Graph = {
        id: childGraphId,
        projectId,
        title: nodeTitle,
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
    };

    // Map Gemini slug IDs to real UUIDs
    const idMap: Record<string, string> = {};

    result.subtasks.forEach((subtask, index) => {
        const nodeId = uuidv4();
        idMap[subtask.id] = nodeId;

        const node: SpatialNode = {
            id: nodeId,
            graphId: childGraphId,
            type: 'action',
            title: subtask.title,
            x: index * (WIDTH + PADDING_X),
            y: (index % 2 === 0) ? 0 : 50,
            width: WIDTH,
            height: HEIGHT,
            status: 'todo',
        };
        childGraph.nodes.push(node);
    });

    result.subtasks.forEach((subtask) => {
        const targetId = idMap[subtask.id];
        subtask.dependsOn.forEach((depSlug) => {
            const sourceId = idMap[depSlug];
            if (sourceId && targetId) {
                const edge: Edge = {
                    id: uuidv4(),
                    graphId: childGraphId,
                    source: sourceId,
                    target: targetId,
                };
                childGraph.edges.push(edge);
            }
        });
    });

    addGraph(childGraph);
    updateNode(nodeId, { childGraphId }, ownerGraphId);
    enterGraph(childGraphId, nodeId, nodeTitle);

    return { subtaskCount: result.subtasks.length };
}

export type { GeminiError };
