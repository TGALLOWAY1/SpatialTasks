import seedrandom from 'seedrandom';
import type { Node, Edge } from '../../types';
import type { Positioned } from '../layoutTypes';
import { getNodeSize } from '../bboxUtils';
import { gridLayout } from './gridLayout';

interface ClusterOpts {
    gutterX: number;
    gutterY: number;
    clusterGap: number;
    seed: string;
    originX?: number;
    originY?: number;
}

/**
 * Union-find on edges to get connected components, then within each component
 * group by meta.color / meta.tags[0] for visual coherence. Clusters laid out
 * on an outer grid with extra spacing; members inside each cluster use the
 * grid strategy so everything stays aligned.
 */
export function clusterLayout(nodes: Node[], edges: Edge[], opts: ClusterOpts): Positioned[] {
    if (nodes.length === 0) return [];
    const nodeIds = new Set(nodes.map(n => n.id));
    const relevantEdges = edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
    const nodeById = new Map(nodes.map(n => [n.id, n] as const));

    // Union-find on connectivity.
    const parent = new Map<string, string>();
    nodes.forEach(n => parent.set(n.id, n.id));
    const find = (x: string): string => {
        let r = x;
        while (parent.get(r) !== r) r = parent.get(r)!;
        while (parent.get(x) !== r) { const next = parent.get(x)!; parent.set(x, r); x = next; }
        return r;
    };
    const union = (a: string, b: string) => { const ra = find(a); const rb = find(b); if (ra !== rb) parent.set(ra, rb); };
    relevantEdges.forEach(e => union(e.source, e.target));

    // Additionally, if there are no edges at all, group by color/tag so
    // similar-looking nodes still cluster together.
    if (relevantEdges.length === 0) {
        const byKey = new Map<string, string[]>();
        nodes.forEach(n => {
            const key = n.meta?.color ?? n.meta?.tags?.[0] ?? '__none__';
            (byKey.get(key) ?? byKey.set(key, []).get(key)!).push(n.id);
        });
        const components = Array.from(byKey.values());
        return layoutClusters(components, nodeById, opts);
    }

    // Gather components from union-find, stably sorted for determinism.
    const byRoot = new Map<string, string[]>();
    nodes.forEach(n => {
        const r = find(n.id);
        (byRoot.get(r) ?? byRoot.set(r, []).get(r)!).push(n.id);
    });

    // Within each component, sort by (color, tag, id) so same-colored nodes
    // sit together. Mental-map preservation happens later via preserveCentroid.
    const components: string[][] = Array.from(byRoot.values()).map(comp =>
        comp.sort((a, b) => {
            const na = nodeById.get(a)!; const nb = nodeById.get(b)!;
            const ca = na.meta?.color ?? ''; const cb = nb.meta?.color ?? '';
            if (ca !== cb) return ca.localeCompare(cb);
            const ta = na.meta?.tags?.[0] ?? ''; const tb = nb.meta?.tags?.[0] ?? '';
            if (ta !== tb) return ta.localeCompare(tb);
            return a.localeCompare(b);
        })
    );
    // Larger components first so the biggest cluster anchors the layout.
    components.sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]));

    return layoutClusters(components, nodeById, opts);
}

function layoutClusters(
    components: string[][],
    nodeById: Map<string, Node>,
    opts: ClusterOpts,
): Positioned[] {
    // Use seeded RNG for any future jitter (currently unused but reserved).
    // Calling rng() once keeps the seed advance consistent across runs.
    const rng = seedrandom(opts.seed);
    void rng();

    const result: Positioned[] = [];
    const originX = opts.originX ?? 0;
    const originY = opts.originY ?? 0;

    // Arrange clusters on an outer grid proportional to sqrt(cluster count).
    const outerCols = Math.max(1, Math.ceil(Math.sqrt(components.length)));
    const clusterBoxes: Array<{ ids: string[]; positions: Positioned[]; w: number; h: number }> = [];

    for (const comp of components) {
        const members: Node[] = comp.map(id => nodeById.get(id)!);
        const innerCols = Math.max(1, Math.ceil(Math.sqrt(members.length)));
        const positions = gridLayout(members, {
            gutterX: opts.gutterX,
            gutterY: opts.gutterY,
            columns: innerCols,
            originX: 0,
            originY: 0,
        });
        // Bounding box of this cluster.
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        positions.forEach(p => {
            const { w, h } = getNodeSize(nodeById.get(p.id)!);
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x + w);
            maxY = Math.max(maxY, p.y + h);
        });
        clusterBoxes.push({
            ids: comp,
            positions,
            w: maxX - minX,
            h: maxY - minY,
        });
    }

    // Outer grid packing — each row as tall as the tallest cluster in it.
    const rowHeights: number[] = [];
    const colWidths: number[] = new Array(outerCols).fill(0);
    clusterBoxes.forEach((cb, i) => {
        const row = Math.floor(i / outerCols);
        const col = i % outerCols;
        rowHeights[row] = Math.max(rowHeights[row] ?? 0, cb.h);
        colWidths[col] = Math.max(colWidths[col], cb.w);
    });

    let cursorY = originY;
    for (let row = 0; row * outerCols < clusterBoxes.length; row++) {
        let cursorX = originX;
        for (let col = 0; col < outerCols; col++) {
            const idx = row * outerCols + col;
            if (idx >= clusterBoxes.length) break;
            const cb = clusterBoxes[idx];
            cb.positions.forEach(p => result.push({ id: p.id, x: p.x + cursorX, y: p.y + cursorY }));
            cursorX += colWidths[col] + opts.clusterGap;
        }
        cursorY += (rowHeights[row] ?? 0) + opts.clusterGap;
    }

    return result;
}
