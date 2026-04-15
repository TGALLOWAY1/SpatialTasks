import { Graph, Node, Workspace } from '../types';

/**
 * Whether an upstream node is "complete" for dependency purposes.
 * Action nodes use `status === 'done'`. Containers derive completion
 * from child-graph progress — they are complete when all leaf children are done.
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
 * 1. It is NOT done (for containers: all children done = not actionable).
 * 2. It is NOT blocked.
 */
export function isNodeActionable(node: Node, graph: Graph, graphs?: Record<string, Graph>): boolean {
    if (node.type === 'container' && graphs) {
        const progress = getContainerProgress(node, { graphs } as Workspace);
        if (progress >= 1) return false;
    } else {
        if (node.status === 'done') return false;
    }
    if (isNodeBlocked(node, graph, graphs)) return false;
    return true;
}

/**
 * Reference to a leaf action task discovered via container drill-in.
 * `breadcrumb` lists the chain of container titles leading to this task
 * so the focus view can present "Project > Container > Subcontainer".
 */
export interface FocusTaskRef {
    node: Node;
    graphId: string;
    breadcrumb: string[];
}

/**
 * Walks a graph (and any actionable containers' child graphs, recursively)
 * collecting every leaf action node that is currently actionable. Containers
 * themselves are never returned — focus view only presents leaf tasks.
 *
 * Order matches a depth-first traversal of the input graph's node array so
 * containers are explored as we encounter them.
 */
export function getActionableLeafTasks(
    graph: Graph,
    graphs: Record<string, Graph>,
    breadcrumb: string[] = []
): FocusTaskRef[] {
    if (!graph) return [];
    const results: FocusTaskRef[] = [];
    for (const node of graph.nodes) {
        if (node.type === 'action') {
            if (isNodeActionable(node, graph, graphs)) {
                results.push({ node, graphId: graph.id, breadcrumb });
            }
        } else if (node.type === 'container' && node.childGraphId) {
            // Only drill into containers that are themselves actionable
            // (i.e. not blocked by external dependencies and not fully done).
            if (!isNodeActionable(node, graph, graphs)) continue;
            const childGraph = graphs[node.childGraphId];
            if (!childGraph) continue;
            results.push(
                ...getActionableLeafTasks(childGraph, graphs, [...breadcrumb, node.title])
            );
        }
    }
    return results;
}

/**
 * Given a just-completed leaf node, determine the next focus task(s).
 *
 * Returns:
 *  - 0 entries → nothing left actionable in the active project (show "all done")
 *  - 1 entry   → auto-advance to that task
 *  - 2+ entries → render the parallel chooser
 *
 * Strategy: collect actionable successors of the completed node (including
 * drilling into actionable containers). If none of the direct successors are
 * actionable (e.g. they're still blocked by *other* incomplete predecessors),
 * fall back to the global actionable set in the root graph.
 */
export function getNextFocusTasks(
    completedNodeId: string,
    completedGraphId: string,
    rootGraph: Graph,
    graphs: Record<string, Graph>
): FocusTaskRef[] {
    const completedGraph = graphs[completedGraphId];
    if (!completedGraph) {
        return getActionableLeafTasks(rootGraph, graphs);
    }

    const successors = completedGraph.edges
        .filter(e => e.source === completedNodeId)
        .map(e => completedGraph.nodes.find(n => n.id === e.target))
        .filter((n): n is Node => !!n);

    const direct: FocusTaskRef[] = [];
    for (const s of successors) {
        if (s.type === 'action') {
            if (isNodeActionable(s, completedGraph, graphs)) {
                direct.push({ node: s, graphId: completedGraph.id, breadcrumb: [] });
            }
        } else if (s.type === 'container' && s.childGraphId) {
            if (!isNodeActionable(s, completedGraph, graphs)) continue;
            const childGraph = graphs[s.childGraphId];
            if (!childGraph) continue;
            direct.push(...getActionableLeafTasks(childGraph, graphs, [s.title]));
        }
    }

    if (direct.length > 0) return direct;

    // No direct successors actionable (blocked by other things, or none exist).
    // Fall back to the next actionable task anywhere in the root graph,
    // excluding the just-completed node.
    return getActionableLeafTasks(rootGraph, graphs)
        .filter(t => t.node.id !== completedNodeId);
}
