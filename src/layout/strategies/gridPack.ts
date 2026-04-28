import type { Node, Edge } from '../../types';
import type { Positioned } from '../layoutTypes';
import type { Size } from '../sizeMap';

interface PackOpts {
    gutterX: number;
    gutterY: number;
    columns?: number;
    originX?: number;
    originY?: number;
}

/**
 * Deterministic row-packed layout using measured sizes. Each row is exactly as
 * tall as its tallest member, each column exactly as wide as its widest, so
 * heterogeneous nodes (e.g. a resized container next to action nodes) pack
 * without overlap by construction — no post-hoc nudging needed.
 *
 * Order is taken from the input `nodes` array; callers should pre-sort to
 * preserve mental map (current y, then current x).
 */
export function gridPack(nodes: Node[], sizeFor: (id: string) => Size, opts: PackOpts): Positioned[] {
    if (nodes.length === 0) return [];
    const { gutterX, gutterY } = opts;
    const cols = opts.columns ?? Math.max(1, Math.ceil(Math.sqrt(nodes.length)));

    const rowHeights: number[] = [];
    const colWidths: number[] = new Array(cols).fill(0);
    nodes.forEach((n, i) => {
        const { w, h } = sizeFor(n.id);
        const row = Math.floor(i / cols);
        const col = i % cols;
        rowHeights[row] = Math.max(rowHeights[row] ?? 0, h);
        colWidths[col] = Math.max(colWidths[col], w);
    });

    const colX: number[] = new Array(cols).fill(0);
    const originX = opts.originX ?? 0;
    let acc = originX;
    for (let c = 0; c < cols; c++) {
        colX[c] = acc;
        acc += colWidths[c] + gutterX;
    }

    const result: Positioned[] = [];
    const originY = opts.originY ?? 0;
    let cursorY = originY;
    for (let row = 0; row * cols < nodes.length; row++) {
        for (let col = 0; col < cols; col++) {
            const idx = row * cols + col;
            if (idx >= nodes.length) break;
            result.push({ id: nodes[idx].id, x: colX[col], y: cursorY });
        }
        cursorY += (rowHeights[row] ?? 0) + gutterY;
    }
    return result;
}

interface ComponentPackOpts extends PackOpts {
    componentGap: number;
}

/**
 * Pack each weakly-connected component (or unconnected node) on its own with
 * `gridPack`, then arrange the component bounding boxes left-to-right
 * (sorted by smallest current x of their members) with `componentGap` spacing.
 * Used as the fallback inside Tidy when the laid-out subset has no internal edges.
 */
export function gridPackByComponent(
    nodes: Node[],
    edges: Edge[],
    sizeFor: (id: string) => Size,
    opts: ComponentPackOpts,
): Positioned[] {
    if (nodes.length === 0) return [];
    const subset = new Set(nodes.map(n => n.id));
    const internal = edges.filter(e => subset.has(e.source) && subset.has(e.target));

    // Union-find on weakly-connected components.
    const parent = new Map<string, string>();
    nodes.forEach(n => parent.set(n.id, n.id));
    const find = (x: string): string => {
        let r = x;
        while (parent.get(r) !== r) r = parent.get(r)!;
        while (parent.get(x) !== r) { const next = parent.get(x)!; parent.set(x, r); x = next; }
        return r;
    };
    const union = (a: string, b: string) => {
        const ra = find(a); const rb = find(b);
        if (ra !== rb) parent.set(ra, rb);
    };
    internal.forEach(e => union(e.source, e.target));

    const byRoot = new Map<string, Node[]>();
    for (const n of nodes) {
        const r = find(n.id);
        const arr = byRoot.get(r) ?? [];
        arr.push(n);
        byRoot.set(r, arr);
    }

    // Sort components by leftmost original x (mental-map preservation).
    const components = Array.from(byRoot.values()).sort((a, b) => {
        const ax = Math.min(...a.map(n => n.x));
        const bx = Math.min(...b.map(n => n.x));
        return ax - bx;
    });

    const result: Positioned[] = [];
    let cursorX = opts.originX ?? 0;
    const baseY = opts.originY ?? 0;

    for (const comp of components) {
        // Within the component, sort by current (y, x) for stability.
        const ordered = [...comp].sort((a, b) => (a.y - b.y) || (a.x - b.x));
        const positions = gridPack(ordered, sizeFor, {
            gutterX: opts.gutterX,
            gutterY: opts.gutterY,
            originX: cursorX,
            originY: baseY,
        });
        let maxX = cursorX;
        for (const p of positions) {
            const { w } = sizeFor(p.id);
            if (p.x + w > maxX) maxX = p.x + w;
            result.push(p);
        }
        cursorX = maxX + opts.componentGap;
    }
    return result;
}
