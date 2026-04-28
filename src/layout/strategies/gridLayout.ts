import type { Node } from '../../types';
import type { Positioned } from '../layoutTypes';
import type { Size } from '../sizeMap';
import { gridPack } from './gridPack';

interface GridOpts {
    gutterX: number;
    gutterY: number;
    columns?: number;
    originX?: number;
    originY?: number;
}

/**
 * Public Grid strategy. Sorts nodes by their CURRENT (y, x) so the result
 * preserves the user's mental map — a node already at the top-left ends up
 * in row 0, column 0. The previous implementation sorted by UUID, which
 * scattered visually adjacent nodes to random cells.
 */
export function gridLayout(nodes: Node[], sizeFor: (id: string) => Size, opts: GridOpts): Positioned[] {
    if (nodes.length === 0) return [];
    const ordered = [...nodes].sort((a, b) => (a.y - b.y) || (a.x - b.x) || a.id.localeCompare(b.id));
    return gridPack(ordered, sizeFor, opts);
}
