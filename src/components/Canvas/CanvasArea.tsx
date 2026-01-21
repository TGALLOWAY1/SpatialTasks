import React, { useMemo, useCallback } from 'react';
import ReactFlow, {
    Background,
    Controls,
    Node as RFNode,
    Edge as RFEdge,
    NodeChange
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { ContainerNode } from '../Nodes/ContainerNode'; // To be implemented
import { ActionNode } from '../Nodes/ActionNode'; // To be implemented

const nodeTypes = {
    container: ContainerNode,
    action: ActionNode
};

export const CanvasArea: React.FC = () => {
    const activeGraphId = useWorkspaceStore(state => state.activeGraphId);
    const graphs = useWorkspaceStore(state => state.graphs);
    const updateNode = useWorkspaceStore(state => state.updateNode);

    const graph = activeGraphId ? graphs[activeGraphId] : null;

    // Transform to ReactFlow format
    const nodes: RFNode[] = useMemo(() => {
        if (!graph) return [];
        return graph.nodes.map(n => ({
            id: n.id,
            type: n.type,
            position: { x: n.x, y: n.y },
            data: { ...n }, // Pass full node object as data
            draggable: true
        }));
    }, [graph]);

    const edges: RFEdge[] = useMemo(() => {
        if (!graph) return [];
        return graph.edges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            type: 'default',
            animated: true,
            style: { stroke: '#4b5563' }
        }));
    }, [graph]);

    const onNodesChange = useCallback((changes: NodeChange[]) => {
        // Basic implementation for dragging
        // We only care about position changes here for persistence
        changes.forEach(change => {
            if (change.type === 'position' && change.position) {
                updateNode(change.id, { x: change.position.x, y: change.position.y });
            }
        });
    }, [updateNode]);

    if (!graph) return <div className="text-gray-500 flex items-center justify-center h-full">No graph selected</div>;

    return (
        <div className="flex-1 h-full bg-gray-950">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes as any}
                onNodesChange={onNodesChange}
                fitView
                className="bg-gray-950"
            >
                <Background color="#374151" gap={20} />
                <Controls className="bg-gray-800 border-gray-700 fill-gray-100" />
            </ReactFlow>
        </div>
    );
}
