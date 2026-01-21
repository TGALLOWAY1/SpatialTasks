import { Graph, Node, Edge, NodeStatus, Workspace } from '../types';

/**
 * Checks if a node is blocked by any incoming dependencies.
 * A node is blocked if it has any incoming edges from nodes that are NOT 'done'.
 */
export function isNodeBlocked(node: Node, graph: Graph): boolean {
    if (!graph) return false;

    const incomingEdges = graph.edges.filter(e => e.target === node.id);

    for (const edge of incomingEdges) {
        const sourceNode = graph.nodes.find(n => n.id === edge.source);
        // If source node not found (weird), ignore.
        // If source node is NOT done, then we are blocked.
        // Note: Container nodes don't have a simple 'status' field usually, 
        // but we might compute it or assume 'done' means something else.
        // For now, let's assume all nodes can check 'status' or computed status.

        if (sourceNode) {
            // Check explicit status
            if (sourceNode.status !== 'done') {
                // If it's a container, we might need to check its computed status
                // For MVP, let's treat container status as derived-only or stored?
                // The requirements say: "Container nodes... status/progress is computed... 
                // They can still be blocked... A node is blocked if any predecessor is not done."

                // If the source is a container, we need to know if IT is done.
                // For now, let's assume we rely on the stored 'status' field being kept up to date
                // OR we need to compute it recursively. To avoid perf issues, relying on stored status is better,
                // provided we update it correctly.
                return true;
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
export function isNodeActionable(node: Node, graph: Graph): boolean {
    if (node.status === 'done') return false;
    if (isNodeBlocked(node, graph)) return false;
    return true;
}
