import { describe, expect, it } from 'vitest';
import type { Edge, Graph, Node } from '../../types';
import { getReconnectedEdge, validateEdgeConnection } from '../edgeEditing';

function action(id: string): Node {
    return {
        id,
        graphId: 'g',
        type: 'action',
        title: id,
        x: 0,
        y: 0,
        status: 'todo',
    };
}

function edge(id: string, source: string, target: string): Edge {
    return { id, graphId: 'g', source, target };
}

function graph(nodes: Node[], edges: Edge[]): Graph {
    return {
        id: 'g',
        projectId: 'p',
        title: 'g',
        nodes,
        edges,
    };
}

describe('validateEdgeConnection', () => {
    it('rejects self-loops', () => {
        const g = graph([action('a1')], []);
        expect(validateEdgeConnection(g, 'a1', 'a1')).toBe('self-loop');
    });

    it('rejects duplicates unless replacing the same edge', () => {
        const g = graph(
            [action('a1'), action('a2'), action('a3')],
            [edge('e1', 'a1', 'a2'), edge('e2', 'a1', 'a3')]
        );

        expect(validateEdgeConnection(g, 'a1', 'a3')).toBe('duplicate');
        expect(validateEdgeConnection(g, 'a1', 'a3', 'e2')).toBeNull();
    });

    it('accepts a unique connection', () => {
        const g = graph([action('a1'), action('a2')], []);
        expect(validateEdgeConnection(g, 'a1', 'a2')).toBeNull();
    });
});

describe('getReconnectedEdge', () => {
    it('rewires the source endpoint', () => {
        expect(getReconnectedEdge(edge('e1', 'a1', 'a3'), 'source', 'a2')).toEqual({
            source: 'a2',
            target: 'a3',
        });
    });

    it('rewires the target endpoint', () => {
        expect(getReconnectedEdge(edge('e1', 'a1', 'a3'), 'target', 'a2')).toEqual({
            source: 'a1',
            target: 'a2',
        });
    });
});
