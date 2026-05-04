import { describe, it, expect } from 'vitest';
import { topoSortWithDepth } from '../graphTraversal';
import type { Graph, Node } from '../../types';

function action(id: string, overrides: Partial<Node> = {}): Node {
    return {
        id,
        graphId: 'g',
        type: 'action',
        title: id,
        x: 0,
        y: 0,
        status: 'todo',
        ...overrides,
    };
}

function graph(nodes: Node[], edges: Array<[string, string]>): Graph {
    return {
        id: 'g',
        projectId: 'p',
        title: 'g',
        nodes,
        edges: edges.map(([source, target], i) => ({
            id: `e${i}`,
            graphId: 'g',
            source,
            target,
        })),
    };
}

describe('topoSortWithDepth', () => {
    it('returns single root at depth 0', () => {
        const result = topoSortWithDepth(graph([action('a')], []));
        expect(result).toEqual([{ node: expect.objectContaining({ id: 'a' }), depth: 0 }]);
    });

    it('orders a linear chain by dependency depth', () => {
        // a -> b -> c
        const result = topoSortWithDepth(graph(
            [action('a'), action('b'), action('c')],
            [['a', 'b'], ['b', 'c']],
        ));
        expect(result.map(({ node, depth }) => [node.id, depth])).toEqual([
            ['a', 0],
            ['b', 1],
            ['c', 2],
        ]);
    });

    it('places parallel siblings at the same depth', () => {
        // a -> b1
        // a -> b2
        const result = topoSortWithDepth(graph(
            [action('a'), action('b1'), action('b2')],
            [['a', 'b1'], ['a', 'b2']],
        ));
        const depths = new Map(result.map(({ node, depth }) => [node.id, depth]));
        expect(depths.get('a')).toBe(0);
        expect(depths.get('b1')).toBe(1);
        expect(depths.get('b2')).toBe(1);
    });

    it('uses max-of-predecessors for diamond join (b and c both depth 1; d depth 2)', () => {
        //     a
        //    / \
        //   b   c
        //    \ /
        //     d
        const result = topoSortWithDepth(graph(
            [action('a'), action('b'), action('c'), action('d')],
            [['a', 'b'], ['a', 'c'], ['b', 'd'], ['c', 'd']],
        ));
        const depths = new Map(result.map(({ node, depth }) => [node.id, depth]));
        expect(depths.get('a')).toBe(0);
        expect(depths.get('b')).toBe(1);
        expect(depths.get('c')).toBe(1);
        expect(depths.get('d')).toBe(2);
    });

    it('takes max depth when one path is longer than another', () => {
        // a -> b -> c -> d
        // a -> d  (short path)
        // d should be depth 3 (via the long path), not depth 1.
        const result = topoSortWithDepth(graph(
            [action('a'), action('b'), action('c'), action('d')],
            [['a', 'b'], ['b', 'c'], ['c', 'd'], ['a', 'd']],
        ));
        const depths = new Map(result.map(({ node, depth }) => [node.id, depth]));
        expect(depths.get('d')).toBe(3);
    });

    it('appends disconnected nodes at depth 0', () => {
        const result = topoSortWithDepth(graph(
            [action('a'), action('b'), action('island')],
            [['a', 'b']],
        ));
        const depths = new Map(result.map(({ node, depth }) => [node.id, depth]));
        expect(depths.get('a')).toBe(0);
        expect(depths.get('b')).toBe(1);
        expect(depths.get('island')).toBe(0);
        expect(result).toHaveLength(3);
    });

    it('does not lose nodes that participate in a cycle', () => {
        // a -> b -> a   (full cycle, no acyclic root)
        const result = topoSortWithDepth(graph(
            [action('a'), action('b')],
            [['a', 'b'], ['b', 'a']],
        ));
        // Both nodes still present in output even though neither has in-degree 0;
        // the cycle-recovery path appends them at depth 0.
        const ids = result.map(r => r.node.id).sort();
        expect(ids).toEqual(['a', 'b']);
        for (const r of result) expect(r.depth).toBe(0);
    });

    it('ignores edges that reference nonexistent nodes', () => {
        // Only 'a' exists; the dangling edge to 'ghost' must not crash or affect depth.
        const result = topoSortWithDepth(graph(
            [action('a')],
            [['a', 'ghost'], ['ghost', 'a']],
        ));
        expect(result).toEqual([{ node: expect.objectContaining({ id: 'a' }), depth: 0 }]);
    });

    it('handles an empty graph', () => {
        expect(topoSortWithDepth(graph([], []))).toEqual([]);
    });
});
