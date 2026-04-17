import type { Node, Edge } from '../../types';
import type { Positioned } from '../layoutTypes';
import { getNodeSize } from '../bboxUtils';
import { gridLayout } from './gridLayout';

interface HierarchyOpts {
    gutterX: number;
    gutterY: number;
    orientation: 'top-down' | 'left-right';
    originX?: number;
    originY?: number;
}

/**
 * Longest-path layering (Sugiyama-lite) with one barycenter ordering pass to
 * reduce edge crossings. Falls back to a grid when a cycle is detected.
 */
export function hierarchyLayout(nodes: Node[], edges: Edge[], opts: HierarchyOpts): Positioned[] {
    if (nodes.length === 0) return [];
    const nodeIds = new Set(nodes.map(n => n.id));
    const relevantEdges = edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));

    const incoming = new Map<string, string[]>();
    const outgoing = new Map<string, string[]>();
    nodes.forEach(n => { incoming.set(n.id, []); outgoing.set(n.id, []); });
    relevantEdges.forEach(e => {
        incoming.get(e.target)!.push(e.source);
        outgoing.get(e.source)!.push(e.target);
    });

    // Longest-path from sources via memoized DFS; detects cycles.
    const depth = new Map<string, number>();
    const visiting = new Set<string>();
    let cycleDetected = false;
    const computeDepth = (id: string): number => {
        if (cycleDetected) return 0;
        if (depth.has(id)) return depth.get(id)!;
        if (visiting.has(id)) { cycleDetected = true; return 0; }
        visiting.add(id);
        const preds = incoming.get(id) ?? [];
        let d = 0;
        for (const p of preds) d = Math.max(d, computeDepth(p) + 1);
        visiting.delete(id);
        depth.set(id, d);
        return d;
    };
    nodes.forEach(n => computeDepth(n.id));

    if (cycleDetected) {
        return gridLayout(nodes, { gutterX: opts.gutterX, gutterY: opts.gutterY, originX: opts.originX, originY: opts.originY });
    }

    // Bucket by depth.
    const layers: string[][] = [];
    for (const n of nodes) {
        const d = depth.get(n.id)!;
        (layers[d] ??= []).push(n.id);
    }

    // Barycenter ordering: order each layer by the mean position of its predecessors
    // in the previous layer. One forward pass is a good cheap heuristic.
    const orderIndex = new Map<string, number>();
    layers[0]?.sort((a, b) => a.localeCompare(b));
    layers[0]?.forEach((id, i) => orderIndex.set(id, i));
    for (let d = 1; d < layers.length; d++) {
        const layer = layers[d];
        layer.sort((a, b) => {
            const predsA = incoming.get(a) ?? [];
            const predsB = incoming.get(b) ?? [];
            const baryA = predsA.length ? predsA.reduce((s, p) => s + (orderIndex.get(p) ?? 0), 0) / predsA.length : 0;
            const baryB = predsB.length ? predsB.reduce((s, p) => s + (orderIndex.get(p) ?? 0), 0) / predsB.length : 0;
            if (baryA !== baryB) return baryA - baryB;
            return a.localeCompare(b);
        });
        layer.forEach((id, i) => orderIndex.set(id, i));
    }

    const nodeById = new Map(nodes.map(n => [n.id, n] as const));
    const originX = opts.originX ?? 0;
    const originY = opts.originY ?? 0;
    const isTopDown = opts.orientation === 'top-down';

    // Compute per-layer max size along the "stacking" axis; cross-axis uses
    // cumulative sizes for alignment.
    const result: Positioned[] = [];

    if (isTopDown) {
        // Layers stacked vertically; siblings in a layer spread horizontally.
        let cursorY = originY;
        for (const layer of layers) {
            const rowHeight = Math.max(...layer.map(id => getNodeSize(nodeById.get(id)!).h));
            const totalWidth = layer.reduce((s, id) => s + getNodeSize(nodeById.get(id)!).w, 0)
                + opts.gutterX * Math.max(0, layer.length - 1);
            let cursorX = originX - totalWidth / 2;
            for (const id of layer) {
                result.push({ id, x: cursorX, y: cursorY });
                cursorX += getNodeSize(nodeById.get(id)!).w + opts.gutterX;
            }
            cursorY += rowHeight + opts.gutterY;
        }
    } else {
        // Layers stacked horizontally; siblings spread vertically.
        let cursorX = originX;
        for (const layer of layers) {
            const colWidth = Math.max(...layer.map(id => getNodeSize(nodeById.get(id)!).w));
            const totalHeight = layer.reduce((s, id) => s + getNodeSize(nodeById.get(id)!).h, 0)
                + opts.gutterY * Math.max(0, layer.length - 1);
            let cursorY = originY - totalHeight / 2;
            for (const id of layer) {
                result.push({ id, x: cursorX, y: cursorY });
                cursorY += getNodeSize(nodeById.get(id)!).h + opts.gutterY;
            }
            cursorX += colWidth + opts.gutterX;
        }
    }

    return result;
}
