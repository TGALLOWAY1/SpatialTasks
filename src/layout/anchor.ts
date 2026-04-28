import type { Node } from '../types';
import type { Positioned } from './layoutTypes';
import type { Size } from './sizeMap';

interface AnchorInput {
    /** The original nodes that were laid out (the subset, post-filter). */
    original: Node[];
    /** The freshly-computed layout. */
    computed: Positioned[];
    /** Lookup for measured sizes — used to compute the original bbox accurately. */
    sizeFor: (id: string) => Size;
    /** True when the user specified a selection. */
    isSelection: boolean;
    /** Viewport center in flow coords (fallback anchor). */
    viewportCenter?: { x: number; y: number };
}

/**
 * Translate the computed layout to a sensible anchor, replacing the old
 * centroid preservation that could throw small-selection layouts off-screen.
 *
 * Priority:
 *   1. Selection active → align top-left to the original selection's bounding box.
 *      The result stays exactly inside the rectangle the user is looking at,
 *      so unselected nodes never get visually displaced.
 *   2. Full graph → align top-left to the previous top-left of the same nodes,
 *      so the canvas stays anchored where the user last left it.
 *   3. Fallback → center on `viewportCenter`.
 */
export function anchorLayout(input: AnchorInput): Positioned[] {
    const { original, computed, sizeFor, isSelection, viewportCenter } = input;
    if (computed.length === 0) return computed;

    const newMinX = Math.min(...computed.map(p => p.x));
    const newMinY = Math.min(...computed.map(p => p.y));

    let targetX: number;
    let targetY: number;

    if (isSelection || original.length === computed.length) {
        // Both branches use the original bbox top-left. For selection it keeps
        // the user's current focus; for full-graph it preserves the canvas anchor.
        let oMinX = Infinity, oMinY = Infinity;
        for (const n of original) {
            if (n.x < oMinX) oMinX = n.x;
            if (n.y < oMinY) oMinY = n.y;
        }
        if (!Number.isFinite(oMinX)) oMinX = 0;
        if (!Number.isFinite(oMinY)) oMinY = 0;
        targetX = oMinX;
        targetY = oMinY;
    } else if (viewportCenter) {
        let maxX = -Infinity, maxY = -Infinity;
        for (const p of computed) {
            const { w, h } = sizeFor(p.id);
            if (p.x + w > maxX) maxX = p.x + w;
            if (p.y + h > maxY) maxY = p.y + h;
        }
        const width = maxX - newMinX;
        const height = maxY - newMinY;
        targetX = viewportCenter.x - width / 2;
        targetY = viewportCenter.y - height / 2;
    } else {
        return computed;
    }

    const dx = targetX - newMinX;
    const dy = targetY - newMinY;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return computed;
    return computed.map(p => ({ id: p.id, x: p.x + dx, y: p.y + dy }));
}
