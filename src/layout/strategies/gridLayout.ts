import type { Node } from '../../types';
import type { Positioned } from '../layoutTypes';
import { getNodeSize } from '../bboxUtils';

interface GridOpts {
    gutterX: number;
    gutterY: number;
    columns?: number;
    originX?: number;
    originY?: number;
}

/**
 * Row/column packing. Columns default to ceil(sqrt(n)) so the result is
 * roughly square. Each row is as tall as the tallest node in that row so
 * there's never vertical overlap with neighbors above.
 */
export function gridLayout(nodes: Node[], opts: GridOpts): Positioned[] {
    const { gutterX, gutterY } = opts;
    if (nodes.length === 0) return [];

    const cols = opts.columns ?? Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
    // Sort deterministically so repeated runs produce identical layouts.
    const ordered = [...nodes].sort((a, b) => a.id.localeCompare(b.id));

    // Pre-compute row heights and column widths for alignment.
    const rowHeights: number[] = [];
    const colWidths: number[] = new Array(cols).fill(0);
    ordered.forEach((n, i) => {
        const { w, h } = getNodeSize(n);
        const row = Math.floor(i / cols);
        const col = i % cols;
        rowHeights[row] = Math.max(rowHeights[row] ?? 0, h);
        colWidths[col] = Math.max(colWidths[col], w);
    });

    const result: Positioned[] = [];
    const originX = opts.originX ?? 0;
    const originY = opts.originY ?? 0;
    let cursorY = originY;

    for (let row = 0; row * cols < ordered.length; row++) {
        let cursorX = originX;
        for (let col = 0; col < cols; col++) {
            const idx = row * cols + col;
            if (idx >= ordered.length) break;
            const node = ordered[idx];
            result.push({ id: node.id, x: cursorX, y: cursorY });
            cursorX += colWidths[col] + gutterX;
        }
        cursorY += (rowHeights[row] ?? 0) + gutterY;
    }

    return result;
}
