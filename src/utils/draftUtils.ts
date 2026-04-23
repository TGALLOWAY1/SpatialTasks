import { v4 as uuidv4 } from 'uuid';
import { DraftNode, Node, Graph, Edge, Project } from '../types';
import { splitDescriptionAndVerification } from './markdownParser';
import { useWorkspaceStore } from '../store/workspaceStore';

const SPACING_X = 280;
const START_X = 100;
const START_Y = 100;
const CHILD_SPACING_X = 250;
const CHILD_SPACING_Y = 110;
const CHILD_START_X = 80;
const CHILD_START_Y = 80;

// Normalize labels so depends_on lookups are lenient (case + whitespace).
const normalizeLabel = (s: string): string => s.trim().toLowerCase();

/**
 * Resolve depends_on labels within a sibling group into edges.
 * Unresolved references are reported via the warnings array.
 */
function resolveDependencyEdges(
    siblings: DraftNode[],
    idByIndex: string[],
    graphId: string,
    warnings: string[],
    scopeLabel: string,
): Edge[] {
    const edges: Edge[] = [];
    const labelMap = new Map<string, string>();
    siblings.forEach((s, i) => labelMap.set(normalizeLabel(s.label), idByIndex[i]));

    siblings.forEach((sibling, i) => {
        if (!sibling.dependsOn || sibling.dependsOn.length === 0) return;
        const targetId = idByIndex[i];
        sibling.dependsOn.forEach(dep => {
            const sourceId = labelMap.get(normalizeLabel(dep));
            if (!sourceId) {
                warnings.push(
                    `${scopeLabel}: "${sibling.label}" depends on "${dep}" but no sibling with that label was found.`,
                );
                return;
            }
            if (sourceId === targetId) return; // ignore self-reference
            edges.push({ id: uuidv4(), graphId, source: sourceId, target: targetId });
        });
    });

    return edges;
}

/**
 * Convert draft outline → canvas nodes/edges/graphs.
 * Enhanced to populate meta.notes and meta.verification from DraftNode.description,
 * honor parallel groups (no sequential edges), and resolve depends_on cross-edges.
 */
export function draftToCanvas(
    draftNodes: DraftNode[],
    projectId: string,
    rootGraphId: string,
): { nodes: Node[]; edges: Edge[]; childGraphs: Graph[]; warnings: string[] } {
    const canvasNodes: Node[] = [];
    const canvasEdges: Edge[] = [];
    const childGraphs: Graph[] = [];
    const warnings: string[] = [];
    const topLevelIds: string[] = [];

    draftNodes.forEach((draftNode, i) => {
        const nodeId = uuidv4();
        topLevelIds.push(nodeId);
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

            const children = draftNode.children!;
            const parallelGroup = draftNode.parallel === true;
            const childIds: string[] = [];

            // Create child action nodes inside the child graph
            let prevChildId: string | null = null;
            children.forEach((child, ci) => {
                const childNodeId = uuidv4();
                childIds.push(childNodeId);

                const childMeta: Record<string, any> = {};
                if (child.description) {
                    const { notes: childNotes, verification: childVerification } =
                        splitDescriptionAndVerification(child.description);
                    if (childNotes) childMeta.notes = childNotes;
                    if (childVerification) childMeta.verification = childVerification;
                }

                // Parallel groups stack vertically; default groups stack horizontally.
                const x = parallelGroup ? CHILD_START_X : CHILD_START_X + ci * CHILD_SPACING_X;
                const y = parallelGroup ? CHILD_START_Y + ci * CHILD_SPACING_Y : CHILD_START_Y;

                childGraph.nodes.push({
                    id: childNodeId,
                    graphId: childGraphId,
                    type: 'action',
                    title: child.label,
                    x,
                    y,
                    width: 200,
                    height: 50,
                    status: 'todo',
                    ...(Object.keys(childMeta).length > 0 ? { meta: childMeta } : {}),
                });

                // Sequential chain between children, skipped for parallel groups
                // and for children that declare explicit depends_on (their edges come
                // from dependency resolution instead).
                const hasExplicitDeps = Array.isArray(child.dependsOn) && child.dependsOn.length > 0;
                if (!parallelGroup && !hasExplicitDeps && prevChildId) {
                    childGraph.edges.push({
                        id: uuidv4(),
                        graphId: childGraphId,
                        source: prevChildId,
                        target: childNodeId,
                    });
                }
                prevChildId = childNodeId;
            });

            // Resolve depends_on edges among the children of this container
            const depEdges = resolveDependencyEdges(
                children,
                childIds,
                childGraphId,
                warnings,
                `In "${draftNode.label}"`,
            );
            childGraph.edges.push(...depEdges);

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

        // Sequential edge between top-level nodes, skipped when this node is marked parallel
        // or has explicit depends_on. A node flagged `parallel` means it runs alongside its
        // predecessor rather than after it.
        const hasExplicitTopDeps = Array.isArray(draftNode.dependsOn) && draftNode.dependsOn.length > 0;
        const skipTopChain = draftNode.parallel === true || hasExplicitTopDeps;
        if (i > 0 && !skipTopChain) {
            canvasEdges.push({
                id: uuidv4(),
                graphId: rootGraphId,
                source: topLevelIds[i - 1],
                target: nodeId,
            });
        }
    });

    // Resolve depends_on edges among top-level nodes
    const topDepEdges = resolveDependencyEdges(
        draftNodes,
        topLevelIds,
        rootGraphId,
        warnings,
        'Top-level',
    );
    canvasEdges.push(...topDepEdges);

    return { nodes: canvasNodes, edges: canvasEdges, childGraphs, warnings };
}

/**
 * Create a full project from draft nodes and add it to the store.
 * Returns the created project ID and any import-time warnings (e.g. unresolved depends_on).
 */
export function createProjectFromDraft(
    title: string,
    draftNodes: DraftNode[],
): { projectId: string; warnings: string[] } {
    const store = useWorkspaceStore.getState();

    const projectId = uuidv4();
    const rootGraphId = uuidv4();
    const now = new Date().toISOString();

    const { nodes, edges, childGraphs, warnings } = draftToCanvas(draftNodes, projectId, rootGraphId);

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

    return { projectId, warnings };
}
