import type { Edge, Graph } from '../types';

export function validateEdgeConnection(
    graph: Graph,
    source: string,
    target: string,
    ignoreEdgeId?: string
): 'self-loop' | 'duplicate' | null {
    if (source === target) {
        return 'self-loop';
    }

    const duplicate = graph.edges.some(edge =>
        edge.id !== ignoreEdgeId && edge.source === source && edge.target === target
    );

    return duplicate ? 'duplicate' : null;
}

export function getReconnectedEdge(
    edge: Edge,
    endpoint: 'source' | 'target',
    nodeId: string
): Pick<Edge, 'source' | 'target'> {
    return endpoint === 'source'
        ? { source: nodeId, target: edge.target }
        : { source: edge.source, target: nodeId };
}
