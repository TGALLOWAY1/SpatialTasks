import { v4 as uuidv4 } from 'uuid';
import { DraftNode, Node, Graph, Edge, Project } from '../types';
import { splitDescriptionAndVerification } from './markdownParser';
import { useWorkspaceStore } from '../store/workspaceStore';

const SPACING_X = 280;
const START_X = 100;
const START_Y = 100;
const CHILD_SPACING_X = 250;
const CHILD_START_X = 80;
const CHILD_START_Y = 80;

/**
 * Convert draft outline → canvas nodes/edges/graphs.
 * Enhanced to populate meta.notes and meta.verification from DraftNode.description.
 */
export function draftToCanvas(
    draftNodes: DraftNode[],
    projectId: string,
    rootGraphId: string,
): { nodes: Node[]; edges: Edge[]; childGraphs: Graph[] } {
    const canvasNodes: Node[] = [];
    const canvasEdges: Edge[] = [];
    const childGraphs: Graph[] = [];

    draftNodes.forEach((draftNode, i) => {
        const nodeId = uuidv4();
        const hasChildren = draftNode.children && draftNode.children.length > 0;

        // Parse description for notes and verification
        const { notes, verification } = splitDescriptionAndVerification(draftNode.description);
        const meta: Record<string, any> = {};
        if (notes) meta.notes = notes;
        if (verification) meta.verification = verification;
        const hasMeta = Object.keys(meta).length > 0;

        if (hasChildren) {
            // Container node with child graph
            const childGraphId = uuidv4();
            const childGraph: Graph = {
                id: childGraphId,
                projectId,
                title: draftNode.label,
                nodes: [],
                edges: [],
            };

            // Create child action nodes inside the child graph
            let prevChildId: string | null = null;
            draftNode.children!.forEach((child, ci) => {
                const childNodeId = uuidv4();
                const childMeta: Record<string, any> = {};
                if (child.description) {
                    const { notes: childNotes, verification: childVerification } =
                        splitDescriptionAndVerification(child.description);
                    if (childNotes) childMeta.notes = childNotes;
                    if (childVerification) childMeta.verification = childVerification;
                }

                childGraph.nodes.push({
                    id: childNodeId,
                    graphId: childGraphId,
                    type: 'action',
                    title: child.label,
                    x: CHILD_START_X + ci * CHILD_SPACING_X,
                    y: CHILD_START_Y,
                    width: 200,
                    height: 50,
                    status: 'todo',
                    ...(Object.keys(childMeta).length > 0 ? { meta: childMeta } : {}),
                });
                // Sequential edges between children
                if (prevChildId) {
                    childGraph.edges.push({
                        id: uuidv4(),
                        graphId: childGraphId,
                        source: prevChildId,
                        target: childNodeId,
                    });
                }
                prevChildId = childNodeId;
            });

            childGraphs.push(childGraph);

            canvasNodes.push({
                id: nodeId,
                graphId: rootGraphId,
                type: 'container',
                title: draftNode.label,
                x: START_X + i * SPACING_X,
                y: START_Y,
                width: 200,
                height: 80,
                childGraphId,
                ...(hasMeta ? { meta } : {}),
            });
        } else {
            // Simple action node
            canvasNodes.push({
                id: nodeId,
                graphId: rootGraphId,
                type: 'action',
                title: draftNode.label,
                x: START_X + i * SPACING_X,
                y: START_Y,
                width: 200,
                height: 50,
                status: 'todo',
                ...(hasMeta ? { meta } : {}),
            });
        }

        // Sequential edges between top-level nodes
        if (i > 0 && canvasNodes.length >= 2) {
            canvasEdges.push({
                id: uuidv4(),
                graphId: rootGraphId,
                source: canvasNodes[canvasNodes.length - 2].id,
                target: nodeId,
            });
        }
    });

    return { nodes: canvasNodes, edges: canvasEdges, childGraphs };
}

/**
 * Create a full project from draft nodes and add it to the store.
 * Returns the created project ID.
 */
export function createProjectFromDraft(
    title: string,
    draftNodes: DraftNode[],
): string {
    const store = useWorkspaceStore.getState();

    const projectId = uuidv4();
    const rootGraphId = uuidv4();
    const now = new Date().toISOString();

    const { nodes, edges, childGraphs } = draftToCanvas(draftNodes, projectId, rootGraphId);

    const rootGraph: Graph = {
        id: rootGraphId,
        projectId,
        title,
        nodes,
        edges,
    };

    const newProject: Project = {
        id: projectId,
        title,
        rootGraphId,
        createdAt: now,
        updatedAt: now,
    };

    // Build updated graphs map
    const updatedGraphs = { ...store.graphs, [rootGraphId]: rootGraph };
    childGraphs.forEach(cg => { updatedGraphs[cg.id] = cg; });

    // Atomic state update
    useWorkspaceStore.setState({
        projects: [...store.projects, newProject],
        graphs: updatedGraphs,
        activeProjectId: projectId,
        activeGraphId: rootGraphId,
        navStack: [{ graphId: rootGraphId, label: title }],
        executionMode: false,
    });

    return projectId;
}
