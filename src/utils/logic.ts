import { Graph, Node, Workspace } from '../types';

/**
 * Whether an upstream node is "complete" for dependency purposes.
 * Action nodes use `status === 'done'`. Containers often omit `status`; treat them as
 * complete when rolled-up leaf progress is 100% (matches list/canvas progress UI).
 */
function isDependencySatisfied(sourceNode: Node, graphs?: Record<string, Graph>): boolean {
    if (sourceNode.status === 'done') return true;
    if (sourceNode.type === 'container' && graphs) {
        const progress = getContainerProgress(sourceNode, { graphs } as Workspace);
        if (progress >= 1) return true;
    }
    return false;
}

/**
 * Checks if a node is blocked by any incoming dependencies.
 * A node is blocked if it has any incoming edges from nodes that are not yet satisfied.
 *
 * @param graphs - Pass workspace `graphs` so container predecessors can be evaluated by child progress.
 */
export function isNodeBlocked(node: Node, graph: Graph, graphs?: Record<string, Graph>): boolean {
    if (!graph) return false;

    const incomingEdges = graph.edges.filter(e => e.target === node.id);

    for (const edge of incomingEdges) {
        const sourceNode = graph.nodes.find(n => n.id === edge.source);

        if (sourceNode && !isDependencySatisfied(sourceNode, graphs)) {
            return true;
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
export function isNodeActionable(node: Node, graph: Graph, graphs?: Record<string, Graph>): boolean {
    if (node.status === 'done') return false;
    if (isNodeBlocked(node, graph, graphs)) return false;
    return true;
}
