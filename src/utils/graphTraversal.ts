import type { Graph, Node } from '../types';

/**
 * Topological sort of nodes based on edges, grouping parallel tasks by depth.
 * Returns an array of { node, depth } where depth indicates dependency level.
 *
 * - Roots (no incoming edges) sit at depth 0.
 * - Each successor's depth is `max(predecessor depth) + 1`, so parallel siblings
 *   under the same predecessor share a depth.
 * - Disconnected nodes and any nodes left over from a cycle are appended at the
 *   end at depth 0 to keep the output stable and exhaustive.
 */
export function topoSortWithDepth(graph: Graph): { node: Node; depth: number }[] {
    const nodeMap = new Map(graph.nodes.map(n => [n.id, n]));
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();
    const depthMap = new Map<string, number>();

    for (const n of graph.nodes) {
        inDegree.set(n.id, 0);
        adj.set(n.id, []);
    }
    for (const e of graph.edges) {
        if (nodeMap.has(e.source) && nodeMap.has(e.target)) {
            adj.get(e.source)!.push(e.target);
            inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
        }
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree) {
        if (deg === 0) {
            queue.push(id);
            depthMap.set(id, 0);
        }
    }

    const sorted: string[] = [];
    while (queue.length > 0) {
        const id = queue.shift()!;
        sorted.push(id);
        const currentDepth = depthMap.get(id) ?? 0;
        for (const neighbor of adj.get(id) ?? []) {
            const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
            inDegree.set(neighbor, newDeg);
            depthMap.set(neighbor, Math.max(depthMap.get(neighbor) ?? 0, currentDepth + 1));
            if (newDeg === 0) {
                queue.push(neighbor);
            }
        }
    }

    const sortedSet = new Set(sorted);
    for (const n of graph.nodes) {
        if (!sortedSet.has(n.id)) {
            sorted.push(n.id);
            depthMap.set(n.id, 0);
        }
    }

    return sorted.map(id => ({
        node: nodeMap.get(id)!,
        depth: depthMap.get(id) ?? 0,
    }));
}
