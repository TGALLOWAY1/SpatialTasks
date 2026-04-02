import { Graph, Node, Workspace } from '../types';

/**
 * Checks whether a source node should be considered "done".
 * Action nodes use their persisted status; container nodes derive
 * completion from child-graph progress (all leaf children done).
 */
function isSourceDone(sourceNode: Node, workspace: Workspace): boolean {
    if (sourceNode.type === 'container') {
        return getContainerProgress(sourceNode, workspace) >= 1;
    }
    return sourceNode.status === 'done';
}

/**
 * Checks if a node is blocked by any incoming dependencies.
 * A node is blocked if it has any incoming edges from nodes that are NOT 'done'.
 */
export function isNodeBlocked(node: Node, graph: Graph, workspace?: Workspace): boolean {
    if (!graph) return false;

    const incomingEdges = graph.edges.filter(e => e.target === node.id);

    for (const edge of incomingEdges) {
        const sourceNode = graph.nodes.find(n => n.id === edge.source);

        if (sourceNode) {
            if (workspace) {
                if (!isSourceDone(sourceNode, workspace)) return true;
            } else {
                // Fallback when workspace is not provided: use persisted status
                if (sourceNode.status !== 'done') return true;
            }
        }
    }

    return false;
}

/**
 * Calculates the progress of a container node based on its child graph.
 * Returns a number between 0 and 1.
 */
export function getContainerProgress(containerNode: Node, workspace: Workspace): number {
    if (containerNode.type !== 'container' || !containerNode.childGraphId) return 0;

    const childGraph = workspace.graphs[containerNode.childGraphId];
    if (!childGraph) return 0;

    const leafNodes = childGraph.nodes.filter(n => n.type === 'action');
    if (leafNodes.length === 0) return 0; // Or 1? Empty graph = done? Let's say 0 for now.

    // Recursive progress? Or just immediate children?
    // "Roll-up: Progress = (# done leaf nodes) / (# total leaf nodes) in that subgraph"
    // "or include containers too"
    // Let's stick to simple leaf node count for now as per prompt example.

    const doneCount = leafNodes.filter(n => n.status === 'done').length;
    return doneCount / leafNodes.length;
}

/**
 * Determines if a node is "Actionable" (Next Action).
 * A node is actionable if:
 * 1. It is NOT done.
 * 2. It is NOT blocked.
 * 3. (Optional) It is NOT in_progress (depending on definition, usually in_progress is also 'actionable' but 'next' implies todo)
 */
export function isNodeActionable(node: Node, graph: Graph, workspace?: Workspace): boolean {
    if (node.type === 'container') {
        if (workspace && getContainerProgress(node, workspace) >= 1) return false;
    } else {
        if (node.status === 'done') return false;
    }
    if (isNodeBlocked(node, graph, workspace)) return false;
    return true;
}
