import type { Node, Edge } from '../../types';
import type { Positioned } from '../layoutTypes';
import { hierarchyLayout } from './hierarchyLayout';

interface FlowOpts {
    gutterX: number;
    gutterY: number;
    originX?: number;
    originY?: number;
}

/**
 * Left-to-right workflow. Internally this is a hierarchy layout with
 * left-right orientation — same topological layering and barycenter ordering,
 * just rotated.
 */
export function flowLayout(nodes: Node[], edges: Edge[], opts: FlowOpts): Positioned[] {
    return hierarchyLayout(nodes, edges, {
        gutterX: opts.gutterX,
        gutterY: opts.gutterY,
        orientation: 'left-right',
        originX: opts.originX,
        originY: opts.originY,
    });
}
