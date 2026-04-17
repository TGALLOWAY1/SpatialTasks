import type { Node, Edge } from '../types';

export type LayoutStrategy = 'cluster' | 'grid' | 'hierarchy' | 'flow';

export interface Positioned {
    id: string;
    x: number;
    y: number;
}

export interface LayoutOptions {
    /** Horizontal gap between nodes in a row/cluster. */
    gutterX?: number;
    /** Vertical gap between nodes. */
    gutterY?: number;
    /** Extra spacing between cluster groups. */
    clusterGap?: number;
    /** Subset of node IDs to lay out. If omitted, all nodes in the input are laid out. */
    selectedNodeIds?: string[];
    /** When true, translate/align the computed layout to stay near original positions. */
    preserveRelative?: boolean;
    /** Deterministic seed for strategies that use randomness (e.g. cluster). */
    seed?: string;
    /** Orientation hint for hierarchy layout. */
    orientation?: 'top-down' | 'left-right';
}

export interface LayoutInput {
    nodes: Node[];
    edges: Edge[];
}

export const DEFAULT_GUTTER_X = 80;
export const DEFAULT_GUTTER_Y = 60;
export const DEFAULT_CLUSTER_GAP = 160;
export const DEFAULT_SEED = 'spatialtasks-layout';

export function resolveOptions(opts?: LayoutOptions): Required<Omit<LayoutOptions, 'selectedNodeIds'>> & { selectedNodeIds?: string[] } {
    return {
        gutterX: opts?.gutterX ?? DEFAULT_GUTTER_X,
        gutterY: opts?.gutterY ?? DEFAULT_GUTTER_Y,
        clusterGap: opts?.clusterGap ?? DEFAULT_CLUSTER_GAP,
        preserveRelative: opts?.preserveRelative ?? true,
        seed: opts?.seed ?? DEFAULT_SEED,
        orientation: opts?.orientation ?? 'top-down',
        selectedNodeIds: opts?.selectedNodeIds,
    };
}
