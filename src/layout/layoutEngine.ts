import type { LayoutInput, LayoutOptions, LayoutStrategy, Positioned } from './layoutTypes';
import { resolveOptions } from './layoutTypes';
import { gridLayout } from './strategies/gridLayout';
import { hierarchyLayout } from './strategies/hierarchyLayout';
import { clusterLayout } from './strategies/clusterLayout';
import { flowLayout } from './strategies/flowLayout';
import { buildSizeMap, resolveOverlaps } from './bboxUtils';
import { preserveCentroid } from './preserveMap';

/**
 * Entry point. Pure function: same input + options → same output.
 * Caller is responsible for applying the returned positions via the store.
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

    const nodesToLayout = subset
        ? input.nodes.filter(n => subset.has(n.id))
        : input.nodes;

    if (nodesToLayout.length === 0) return [];

    // Single node — no work to do, return it in place.
    if (nodesToLayout.length === 1) {
        const n = nodesToLayout[0];
        return [{ id: n.id, x: n.x, y: n.y }];
    }

    let computed: Positioned[];
    switch (strategy) {
        case 'grid':
            computed = gridLayout(nodesToLayout, { gutterX: opts.gutterX, gutterY: opts.gutterY });
            break;
        case 'hierarchy':
            computed = hierarchyLayout(nodesToLayout, input.edges, {
                gutterX: opts.gutterX,
                gutterY: opts.gutterY,
                orientation: opts.orientation,
            });
            break;
        case 'flow':
            computed = flowLayout(nodesToLayout, input.edges, {
                gutterX: opts.gutterX,
                gutterY: opts.gutterY,
            });
            break;
        case 'cluster':
        default:
            computed = clusterLayout(nodesToLayout, input.edges, {
                gutterX: opts.gutterX,
                gutterY: opts.gutterY,
                clusterGap: opts.clusterGap,
                seed: opts.seed,
            });
            break;
    }

    // Soft-preserve: keep the layout's centroid near where it was.
    if (opts.preserveRelative) {
        computed = preserveCentroid(nodesToLayout, computed);
    }

    // Hard safety net: resolve any residual overlaps.
    const sizes = buildSizeMap(nodesToLayout);
    computed = resolveOverlaps(computed, sizes, Math.min(opts.gutterX, opts.gutterY) / 2);

    return computed;
}
