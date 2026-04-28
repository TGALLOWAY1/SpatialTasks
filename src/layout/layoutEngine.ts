import type { LayoutInput, LayoutOptions, LayoutStrategy, Positioned } from './layoutTypes';
import { resolveOptions } from './layoutTypes';
import { gridLayout } from './strategies/gridLayout';
import { tidyLayout } from './strategies/tidyLayout';
import { buildSizeFor } from './sizeMap';
import { anchorLayout } from './anchor';

/**
 * Pure function: given the same input + options it returns the same output.
 * The caller is responsible for applying positions via the store.
 *
 * The engine guarantees no overlapping AABBs in its output:
 *   - Tidy uses dagre (Sugiyama), which is overlap-free by construction
 *   - Grid is a row-packed bin-pack that reserves measured w/h + gutter per cell
 *
 * No post-hoc overlap resolver runs; the previous one mangled column alignment.
 */
export function computeLayout(
    input: LayoutInput,
    strategy: LayoutStrategy,
    options?: LayoutOptions,
): Positioned[] {
    const opts = resolveOptions(options);
    const subset = opts.selectedNodeIds && opts.selectedNodeIds.length > 0
        ? new Set(opts.selectedNodeIds)
        : null;
    const isSelection = subset !== null;

    const nodesToLayout = subset
        ? input.nodes.filter(n => subset.has(n.id))
        : input.nodes;

    if (nodesToLayout.length === 0) return [];
    if (nodesToLayout.length === 1) {
        const n = nodesToLayout[0];
        return [{ id: n.id, x: n.x, y: n.y }];
    }

    const sizeFor = buildSizeFor(nodesToLayout, input.sizeOverrides);

    let computed: Positioned[];
    switch (strategy) {
        case 'grid': {
            computed = gridLayout(nodesToLayout, sizeFor, {
                gutterX: opts.gutterX,
                gutterY: opts.gutterY,
            });
            break;
        }
        case 'tidy':
        default: {
            computed = tidyLayout(nodesToLayout, input.edges, sizeFor, {
                gutterX: opts.gutterX,
                gutterY: opts.gutterY,
                orientation: opts.orientation,
                componentGap: opts.componentGap,
            });
            break;
        }
    }

    return anchorLayout({
        original: nodesToLayout,
        computed,
        sizeFor,
        isSelection,
        viewportCenter: input.viewportCenter,
    });
}
