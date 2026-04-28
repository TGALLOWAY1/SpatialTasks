import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '../../types';
import type { Positioned } from '../layoutTypes';
import type { Size } from '../sizeMap';
import { gridPackByComponent } from './gridPack';

interface TidyOpts {
    gutterX: number;
    gutterY: number;
    orientation: 'top-down' | 'left-right';
    componentGap: number;
    originX?: number;
    originY?: number;
}

/**
 * Tidy = dagre Sugiyama layout when the subset has internal edges; otherwise
 * a deterministic component-packed grid (no fake "cluster by color" heuristic).
 *
 * Dagre handles cycles via greedy feedback-arc-set, so no separate cycle
 * fallback is needed. Output rectangles are guaranteed non-overlapping.
 */
export function tidyLayout(
    nodes: Node[],
    edges: Edge[],
    sizeFor: (id: string) => Size,
    opts: TidyOpts,
): Positioned[] {
    if (nodes.length === 0) return [];
    const subset = new Set(nodes.map(n => n.id));
    const internalEdges = edges.filter(e => subset.has(e.source) && subset.has(e.target));

    if (internalEdges.length === 0) {
        return gridPackByComponent(nodes, [], sizeFor, {
            gutterX: opts.gutterX,
            gutterY: opts.gutterY,
            componentGap: opts.componentGap,
            originX: opts.originX,
            originY: opts.originY,
        });
    }

    const g = new dagre.graphlib.Graph({ multigraph: false, compound: false });
    g.setGraph({
        rankdir: opts.orientation === 'left-right' ? 'LR' : 'TB',
        ranker: 'network-simplex',
        nodesep: opts.gutterX,
        ranksep: opts.gutterY,
        marginx: 0,
        marginy: 0,
    });
    g.setDefaultEdgeLabel(() => ({}));

    for (const n of nodes) {
        const { w, h } = sizeFor(n.id);
        g.setNode(n.id, { width: w, height: h });
    }
    for (const e of internalEdges) {
        g.setEdge(e.source, e.target);
    }

    dagre.layout(g);

    // Dagre returns CENTER coords; ReactFlow expects top-left.
    const result: Positioned[] = nodes.map(n => {
        const d = g.node(n.id);
        const s = sizeFor(n.id);
        return { id: n.id, x: d.x - s.w / 2, y: d.y - s.h / 2 };
    });

    // Translate so the top-left corner of the result matches the requested origin.
    const minX = Math.min(...result.map(p => p.x));
    const minY = Math.min(...result.map(p => p.y));
    const dx = (opts.originX ?? 0) - minX;
    const dy = (opts.originY ?? 0) - minY;
    if (dx === 0 && dy === 0) return result;
    return result.map(p => ({ id: p.id, x: p.x + dx, y: p.y + dy }));
}
