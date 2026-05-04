import { describe, it, expect } from 'vitest';
import {
    getBlockingNodes,
    isNodeBlocked,
    getContainerProgress,
    isNodeActionable,
    getActionableLeafTasks,
    getNextFocusTasks,
} from '../logic';
import type { Graph, Node } from '../../types';

// ---------- fixture helpers ----------

function action(id: string, status: Node['status'] = 'todo', overrides: Partial<Node> = {}): Node {
    return {
        id,
        graphId: overrides.graphId ?? 'g',
        type: 'action',
        title: id,
        x: 0,
        y: 0,
        status,
        ...overrides,
    };
}

function container(id: string, childGraphId: string | undefined, overrides: Partial<Node> = {}): Node {
    return {
        id,
        graphId: overrides.graphId ?? 'g',
        type: 'container',
        title: id,
        x: 0,
        y: 0,
        childGraphId,
        ...overrides,
    };
}

function graph(id: string, projectId: string, nodes: Node[], edges: Array<[string, string]>): Graph {
    return {
        id,
        projectId,
        title: id,
        nodes: nodes.map(n => ({ ...n, graphId: id })),
        edges: edges.map(([source, target], i) => ({
            id: `e${i}`,
            graphId: id,
            source,
            target,
        })),
    };
}

// ---------- getContainerProgress ----------

describe('getContainerProgress', () => {
    it('returns 0 for action nodes', () => {
        expect(getContainerProgress(action('a'), {})).toBe(0);
    });

    it('returns 0 for container without childGraphId', () => {
        expect(getContainerProgress(container('c', undefined), {})).toBe(0);
    });

    it('returns 0 when childGraphId is not present in graphs map', () => {
        expect(getContainerProgress(container('c', 'missing'), {})).toBe(0);
    });

    it('returns 0 for empty child graph', () => {
        const child = graph('child', 'p', [], []);
        expect(getContainerProgress(container('c', 'child'), { child })).toBe(0);
    });

    it('returns 0 for child graph containing only nested containers (no action leaves)', () => {
        // Documented behavior: only immediate action leaves count toward progress.
        const inner = graph('inner', 'p', [action('a1', 'done')], []);
        const child = graph('child', 'p', [container('cc', 'inner')], []);
        expect(getContainerProgress(container('c', 'child'), { child, inner })).toBe(0);
    });

    it('returns done/total fraction over immediate action leaves', () => {
        const child = graph('child', 'p', [
            action('a1', 'done'),
            action('a2', 'todo'),
            action('a3', 'in_progress'),
            action('a4', 'done'),
        ], []);
        expect(getContainerProgress(container('c', 'child'), { child })).toBe(0.5);
    });

    it('does not recurse into nested container leaves (rollup is shallow)', () => {
        const inner = graph('inner', 'p', [action('a1', 'done'), action('a2', 'done')], []);
        const child = graph('child', 'p', [
            action('a3', 'todo'),
            container('cc', 'inner'),
        ], []);
        // Only a3 (todo) is an immediate action leaf -> 0/1
        expect(getContainerProgress(container('c', 'child'), { child, inner })).toBe(0);
    });
});

// ---------- getBlockingNodes / isNodeBlocked ----------

describe('getBlockingNodes', () => {
    it('returns empty for node with no incoming edges', () => {
        const g = graph('g', 'p', [action('a1')], []);
        expect(getBlockingNodes(g.nodes[0], g)).toEqual([]);
        expect(isNodeBlocked(g.nodes[0], g)).toBe(false);
    });

    it('returns predecessor with reason=incomplete when source action is not done', () => {
        const g = graph('g', 'p', [action('a1', 'todo'), action('a2', 'todo')], [['a1', 'a2']]);
        const blockers = getBlockingNodes(g.nodes[1], g);
        expect(blockers).toEqual([{ nodeId: 'a1', reason: 'incomplete' }]);
        expect(isNodeBlocked(g.nodes[1], g)).toBe(true);
    });

    it('skips predecessor when source action is done', () => {
        const g = graph('g', 'p', [action('a1', 'done'), action('a2', 'todo')], [['a1', 'a2']]);
        expect(getBlockingNodes(g.nodes[1], g)).toEqual([]);
    });

    it('skips container predecessor when its progress is >= 1', () => {
        const childG = graph('child', 'p', [action('a1', 'done')], []);
        const g = graph('g', 'p', [container('c', 'child'), action('a2', 'todo')], [['c', 'a2']]);
        const target = g.nodes[1];
        expect(getBlockingNodes(target, g, { g, child: childG })).toEqual([]);
    });

    it('returns container predecessor as partial-container with progress when incomplete', () => {
        const childG = graph('child', 'p', [action('a1', 'done'), action('a2', 'todo')], []);
        const g = graph('g', 'p', [container('c', 'child'), action('a2', 'todo')], [['c', 'a2']]);
        const target = g.nodes[1];
        const blockers = getBlockingNodes(target, g, { g, child: childG });
        expect(blockers).toEqual([
            { nodeId: 'c', reason: 'partial-container', progress: 0.5 },
        ]);
    });

    it('returns container predecessor as plain incomplete when graphs map is not supplied', () => {
        const g = graph('g', 'p', [container('c', 'child'), action('a2', 'todo')], [['c', 'a2']]);
        const target = g.nodes[1];
        // Without graphs, container progress can't be computed -> isDependencySatisfied is false,
        // and the partial-container branch (which requires graphs) is skipped, so reason=incomplete.
        expect(getBlockingNodes(target, g)).toEqual([{ nodeId: 'c', reason: 'incomplete' }]);
    });

    it('returns multiple blockers when multiple incoming edges are unmet', () => {
        const g = graph('g', 'p', [
            action('a1', 'todo'),
            action('a2', 'done'),
            action('a3', 'todo'),
            action('target', 'todo'),
        ], [
            ['a1', 'target'],
            ['a2', 'target'],
            ['a3', 'target'],
        ]);
        const target = g.nodes.find(n => n.id === 'target')!;
        const blockerIds = getBlockingNodes(target, g).map(b => b.nodeId).sort();
        expect(blockerIds).toEqual(['a1', 'a3']);
    });
});

// ---------- isNodeActionable ----------

describe('isNodeActionable', () => {
    it('is false for a done action', () => {
        const g = graph('g', 'p', [action('a1', 'done')], []);
        expect(isNodeActionable(g.nodes[0], g)).toBe(false);
    });

    it('is true for a todo action with no incoming edges', () => {
        const g = graph('g', 'p', [action('a1', 'todo')], []);
        expect(isNodeActionable(g.nodes[0], g)).toBe(true);
    });

    it('is false when a predecessor is incomplete', () => {
        const g = graph('g', 'p', [action('a1', 'todo'), action('a2', 'todo')], [['a1', 'a2']]);
        expect(isNodeActionable(g.nodes[1], g)).toBe(false);
    });

    it('is false for a container at 100% progress (nothing left to do)', () => {
        const child = graph('child', 'p', [action('a1', 'done')], []);
        const g = graph('g', 'p', [container('c', 'child')], []);
        expect(isNodeActionable(g.nodes[0], g, { g, child })).toBe(false);
    });

    it('is true for a container with progress < 1 and no blockers', () => {
        const child = graph('child', 'p', [action('a1', 'todo')], []);
        const g = graph('g', 'p', [container('c', 'child')], []);
        expect(isNodeActionable(g.nodes[0], g, { g, child })).toBe(true);
    });
});

// ---------- getActionableLeafTasks ----------

describe('getActionableLeafTasks', () => {
    it('returns no containers, only leaf actions', () => {
        const child = graph('child', 'p', [action('leaf', 'todo')], []);
        const g = graph('g', 'p', [container('c', 'child'), action('top', 'todo')], []);
        const refs = getActionableLeafTasks(g, { g, child });
        expect(refs.map(r => r.node.id).sort()).toEqual(['leaf', 'top']);
    });

    it('skips done leaves', () => {
        const g = graph('g', 'p', [action('done1', 'done'), action('todo1', 'todo')], []);
        expect(getActionableLeafTasks(g, { g }).map(r => r.node.id)).toEqual(['todo1']);
    });

    it('skips leaves that are blocked', () => {
        const g = graph('g', 'p', [action('a1', 'todo'), action('a2', 'todo')], [['a1', 'a2']]);
        expect(getActionableLeafTasks(g, { g }).map(r => r.node.id)).toEqual(['a1']);
    });

    it('does not drill into containers that are blocked', () => {
        const child = graph('child', 'p', [action('inside', 'todo')], []);
        const g = graph('g', 'p', [
            action('blocker', 'todo'),
            container('c', 'child'),
        ], [['blocker', 'c']]);
        const refs = getActionableLeafTasks(g, { g, child });
        // Only the unblocked top-level blocker action — the container is blocked so we don't drill in.
        expect(refs.map(r => r.node.id)).toEqual(['blocker']);
    });

    it('builds breadcrumb of container titles when drilling', () => {
        const inner = graph('inner', 'p', [action('deep', 'todo')], []);
        const middle = graph('middle', 'p', [container('cc', 'inner', { title: 'Middle' })], []);
        const g = graph('g', 'p', [container('c', 'middle', { title: 'Outer' })], []);
        const refs = getActionableLeafTasks(g, { g, middle, inner });
        expect(refs).toHaveLength(1);
        expect(refs[0].node.id).toBe('deep');
        expect(refs[0].breadcrumb).toEqual(['Outer', 'Middle']);
    });
});

// ---------- getNextFocusTasks ----------

describe('getNextFocusTasks', () => {
    it('returns direct successors that are now actionable', () => {
        // Pretend a1 was just completed; a2 was its only successor and is now unblocked.
        const g = graph('g', 'p', [action('a1', 'done'), action('a2', 'todo')], [['a1', 'a2']]);
        const refs = getNextFocusTasks('a1', 'g', g, { g });
        expect(refs.map(r => r.node.id)).toEqual(['a2']);
    });

    it('falls back to global actionable when no direct successors are actionable', () => {
        // a1 was completed but its only successor a2 is still blocked by a3 (todo).
        // Fallback should return all currently actionable leaves except a1.
        const g = graph('g', 'p', [
            action('a1', 'done'),
            action('a2', 'todo'),
            action('a3', 'todo'),
            action('elsewhere', 'todo'),
        ], [
            ['a1', 'a2'],
            ['a3', 'a2'],
        ]);
        const refs = getNextFocusTasks('a1', 'g', g, { g });
        const ids = refs.map(r => r.node.id).sort();
        expect(ids).toEqual(['a3', 'elsewhere']);
        expect(ids).not.toContain('a1');
    });

    it('falls back to global actionable when completedGraphId is missing from graphs', () => {
        const g = graph('g', 'p', [action('a1', 'todo')], []);
        const refs = getNextFocusTasks('whatever', 'gone', g, { g });
        expect(refs.map(r => r.node.id)).toEqual(['a1']);
    });
});
