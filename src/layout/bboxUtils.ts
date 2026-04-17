import type { Node } from '../types';
import type { Positioned } from './layoutTypes';

const ACTION_DEFAULT_W = 200;
const ACTION_DEFAULT_H = 50;
const CONTAINER_DEFAULT_W = 200;
const CONTAINER_DEFAULT_H = 80;

export interface Size {
    w: number;
    h: number;
}

export function getNodeSize(node: Node): Size {
    if (node.width && node.height) return { w: node.width, h: node.height };
    if (node.type === 'container') {
        return { w: node.width ?? CONTAINER_DEFAULT_W, h: node.height ?? CONTAINER_DEFAULT_H };
    }
    return { w: node.width ?? ACTION_DEFAULT_W, h: node.height ?? ACTION_DEFAULT_H };
}

export function buildSizeMap(nodes: Node[]): Map<string, Size> {
    const map = new Map<string, Size>();
    nodes.forEach(n => map.set(n.id, getNodeSize(n)));
    return map;
}

/**
 * Sweep-line overlap resolver. For any two AABBs that intersect, nudges the
 * later-sorted one down (or right, on second pass) by enough to clear the
 * collision plus `padding`. Two passes (by x then by y) catches the common
 * residual overlaps after a strategy runs.
 */
export function resolveOverlaps(
    positioned: Positioned[],
    sizes: Map<string, Size>,
    padding: number,
): Positioned[] {
    if (positioned.length < 2) return positioned;
    const out = positioned.map(p => ({ ...p }));

    const intersects = (a: Positioned, b: Positioned): boolean => {
        const sa = sizes.get(a.id); const sb = sizes.get(b.id);
        if (!sa || !sb) return false;
        return (
            a.x < b.x + sb.w + padding &&
            a.x + sa.w + padding > b.x &&
            a.y < b.y + sb.h + padding &&
            a.y + sa.h + padding > b.y
        );
    };

    for (let pass = 0; pass < 2; pass++) {
        out.sort((a, b) => (pass === 0 ? a.x - b.x : a.y - b.y));
        for (let i = 0; i < out.length; i++) {
            for (let j = i + 1; j < out.length; j++) {
                if (!intersects(out[i], out[j])) continue;
                const sa = sizes.get(out[i].id)!;
                if (pass === 0) {
                    out[j].y = out[i].y + sa.h + padding;
                } else {
                    out[j].x = out[i].x + sa.w + padding;
                }
            }
        }
    }

    return out;
}
