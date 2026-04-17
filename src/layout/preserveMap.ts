import type { Node } from '../types';
import type { Positioned } from './layoutTypes';

/**
 * Given the original node positions and a freshly-computed layout, translate
 * the computed layout so its centroid matches the original centroid. Keeps
 * the result anchored near where the user's eyes already are, preserving the
 * mental map.
 */
export function preserveCentroid(original: Node[], computed: Positioned[]): Positioned[] {
    if (computed.length === 0) return computed;

    const origById = new Map(original.map(n => [n.id, n] as const));
    const common = computed.filter(p => origById.has(p.id));
    if (common.length === 0) return computed;

    let ox = 0, oy = 0, cx = 0, cy = 0;
    for (const p of common) {
        const orig = origById.get(p.id)!;
        ox += orig.x; oy += orig.y;
        cx += p.x;   cy += p.y;
    }
    ox /= common.length; oy /= common.length;
    cx /= common.length; cy /= common.length;

    const dx = ox - cx;
    const dy = oy - cy;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return computed;

    return computed.map(p => ({ id: p.id, x: p.x + dx, y: p.y + dy }));
}
