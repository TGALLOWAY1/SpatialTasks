import type { Node, Edge } from '../types';
import type { Size } from './sizeMap';

export type LayoutStrategy = 'tidy' | 'grid';
export type LayoutOrientation = 'top-down' | 'left-right';

export interface Positioned {
    id: string;
    x: number;
    y: number;
}

export interface LayoutOptions {
    /** Subset of node IDs to lay out. Empty/missing → all input nodes. */
    selectedNodeIds?: string[];
    /** Orientation hint for Tidy. */
    orientation?: LayoutOrientation;
    /** Horizontal gap between nodes. */
    gutterX?: number;
    /** Vertical gap between nodes. */
    gutterY?: number;
    /** Extra spacing between disconnected components in Tidy's no-edge fallback. */
    componentGap?: number;
}

export interface LayoutInput {
    nodes: Node[];
    edges: Edge[];
    /** Live-measured rects from `reactFlowInstance.getNodes()`. Optional. */
    sizeOverrides?: Map<string, Size>;
    /** Pre-action viewport center (flow coords). Used as anchor fallback. */
    viewportCenter?: { x: number; y: number };
}

export const DEFAULT_GUTTER_X = 80;
export const DEFAULT_GUTTER_Y = 60;
export const DEFAULT_COMPONENT_GAP = 160;

export function resolveOptions(opts?: LayoutOptions): Required<Omit<LayoutOptions, 'selectedNodeIds'>> & { selectedNodeIds?: string[] } {
    return {
        gutterX: opts?.gutterX ?? DEFAULT_GUTTER_X,
        gutterY: opts?.gutterY ?? DEFAULT_GUTTER_Y,
        componentGap: opts?.componentGap ?? DEFAULT_COMPONENT_GAP,
        orientation: opts?.orientation ?? 'top-down',
        selectedNodeIds: opts?.selectedNodeIds,
    };
}

/**
 * Map any persisted legacy strategy value (cluster, hierarchy, flow) to the
 * current 2-strategy palette. Called once on store rehydration.
 */
export function migrateStrategy(s: unknown): LayoutStrategy {
    return s === 'grid' ? 'grid' : 'tidy';
}

/**
 * Map a persisted legacy strategy to its closest orientation. Used so a user
 * who last picked "flow" gets Tidy/LR after upgrade.
 */
export function migrateOrientation(s: unknown, current?: unknown): LayoutOrientation {
    if (current === 'left-right' || current === 'top-down') return current;
    return s === 'flow' ? 'left-right' : 'top-down';
}
