import type { Node } from '../types';

export interface Size {
    w: number;
    h: number;
}

export const ACTION_DEFAULT_W = 200;
export const ACTION_DEFAULT_H = 50;
export const CONTAINER_DEFAULT_W = 200;
export const CONTAINER_DEFAULT_H = 80;

/**
 * Look up a node's size with priority: live measurement → stored width/height → type default.
 * Live measurements come from `reactFlowInstance.getNodes()[i].width/height` which RF
 * populates after first render.
 */
export function getNodeSize(node: Node, overrides?: Map<string, Size>): Size {
    const live = overrides?.get(node.id);
    if (live && live.w > 0 && live.h > 0) return live;
    if (node.width && node.height) return { w: node.width, h: node.height };
    if (node.type === 'container') {
        return { w: node.width ?? CONTAINER_DEFAULT_W, h: node.height ?? CONTAINER_DEFAULT_H };
    }
    return { w: node.width ?? ACTION_DEFAULT_W, h: node.height ?? ACTION_DEFAULT_H };
}

export function buildSizeFor(nodes: Node[], overrides?: Map<string, Size>): (id: string) => Size {
    const map = new Map<string, Size>();
    nodes.forEach(n => map.set(n.id, getNodeSize(n, overrides)));
    return (id: string) => map.get(id) ?? { w: ACTION_DEFAULT_W, h: ACTION_DEFAULT_H };
}
