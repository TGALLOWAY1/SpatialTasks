import React, { useMemo, useCallback, useEffect, useState, useRef } from 'react';
import ReactFlow, {
    Background,
    Controls,
    Node as RFNode,
    Edge as RFEdge,
    NodeChange,
    Connection,
    useReactFlow,
    ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { v4 as uuidv4 } from 'uuid';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { ContainerNode } from '../Nodes/ContainerNode';
import { ActionNode } from '../Nodes/ActionNode';
import { ContextMenu, MenuItem } from '../UI/ContextMenu';
import { ConfirmModal } from '../UI/ConfirmModal';
import { ActionSheet } from '../UI/ActionSheet';
import { FloatingActionButton } from '../UI/FloatingActionButton';
import { Trash2, Circle, Clock, CheckCircle2, Plus, Layers } from 'lucide-react';
import { useDeviceDetect } from '../../hooks/useDeviceDetect';

const nodeTypes = {
    container: ContainerNode,
    action: ActionNode
};

const CanvasInner: React.FC = () => {
    const { isTouchDevice } = useDeviceDetect();
    const rafRef = useRef<number>(0);

    const activeGraphId = useWorkspaceStore(state => state.activeGraphId);
    const graphs = useWorkspaceStore(state => state.graphs);
    const updateNode = useWorkspaceStore(state => state.updateNode);
    const removeNode = useWorkspaceStore(state => state.removeNode);
    const removeEdge = useWorkspaceStore(state => state.removeEdge);
    const removeNodes = useWorkspaceStore(state => state.removeNodes);
    const addEdge = useWorkspaceStore(state => state.addEdge);
    const addNode = useWorkspaceStore(state => state.addNode);
    const batchUpdateNodes = useWorkspaceStore(state => state.batchUpdateNodes);
    const selectMode = useWorkspaceStore(state => state.selectMode);
    const setHasSelection = useWorkspaceStore(state => state.setHasSelection);
    const connectMode = useWorkspaceStore(state => state.connectMode);
    const setConnectSource = useWorkspaceStore(state => state.setConnectSource);
    const clearConnectMode = useWorkspaceStore(state => state.clearConnectMode);

    const reactFlowInstance = useReactFlow();

    // Quick-add state for double-click on canvas
    const [quickAdd, setQuickAdd] = useState<{ x: number; y: number; screenX: number; screenY: number } | null>(null);

    // Context menu state
    const [contextMenu, setContextMenu] = useState<{
        x: number; y: number;
        nodeId?: string; edgeId?: string;
        flowX?: number; flowY?: number;
    } | null>(null);

    // Action sheet state (for long-press on touch)
    const [actionSheet, setActionSheet] = useState<{
        nodeId?: string;
        edgeId?: string;
        flowX?: number;
        flowY?: number;
    } | null>(null);
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const longPressFiredRef = useRef(false);

    // Custom confirmation modal state (replaces window.confirm)
    const [confirmAction, setConfirmAction] = useState<{
        title: string;
        message: string;
        onConfirm: () => void;
    } | null>(null);

    const graph = activeGraphId ? graphs[activeGraphId] : null;

    // Transform to ReactFlow format
    const nodes: RFNode[] = useMemo(() => {
        if (!graph) return [];
        return graph.nodes.map(n => ({
            id: n.id,
            type: n.type,
            position: { x: n.x, y: n.y },
            data: { ...n, _isConnectSource: connectMode.sourceNodeId === n.id },
            draggable: !connectMode.active,
        }));
    }, [graph, connectMode]);

    const edges: RFEdge[] = useMemo(() => {
        if (!graph) return [];
        return graph.edges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            type: 'default',
            animated: !isTouchDevice,
            style: { stroke: '#4b5563' }
        }));
    }, [graph, isTouchDevice]);

    const onNodesChange = useCallback((changes: NodeChange[]) => {
        const applyChanges = () => {
            changes.forEach(change => {
                if (change.type === 'position' && change.position) {
                    updateNode(change.id, { x: change.position.x, y: change.position.y });
                }
            });
        };

        if (isTouchDevice) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(applyChanges);
        } else {
            applyChanges();
        }
    }, [updateNode, isTouchDevice]);

    // Drag-to-connect edges
    const onConnect = useCallback((connection: Connection) => {
        if (!activeGraphId || !connection.source || !connection.target) return;
        if (connection.source === connection.target) return;

        const g = graphs[activeGraphId];
        const exists = g.edges.some(
            e => e.source === connection.source && e.target === connection.target
        );
        if (exists) return;

        addEdge({
            id: uuidv4(),
            graphId: activeGraphId,
            source: connection.source,
            target: connection.target,
        });
    }, [activeGraphId, graphs, addEdge]);

    // Shared delete-selected logic (used by keyboard handler and toolbar button)
    const deleteSelected = useCallback(() => {
        const selectedNodes = reactFlowInstance.getNodes().filter(n => n.selected);
        const selectedEdges = reactFlowInstance.getEdges().filter(e => e.selected);

        if (selectedNodes.length === 0 && selectedEdges.length === 0) return;

        selectedEdges.forEach(edge => removeEdge(edge.id));

        if (selectedNodes.length > 0) {
            const nodeIds = selectedNodes.map(n => n.id);
            const hasContainers = selectedNodes.some(n => n.type === 'container');
            if (hasContainers) {
                setConfirmAction({
                    title: 'Delete Nodes',
                    message: `Delete ${selectedNodes.length} node(s)? Container nodes and their children will be removed.`,
                    onConfirm: () => removeNodes(nodeIds),
                });
                return;
            }
            removeNodes(nodeIds);
        }
    }, [reactFlowInstance, removeEdge, removeNodes]);

    // Keyboard shortcuts: delete, undo, redo
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

            // Undo: Ctrl/Cmd+Z
            if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
                e.preventDefault();
                useWorkspaceStore.temporal.getState().undo();
                return;
            }

            // Redo: Ctrl/Cmd+Shift+Z
            if (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
                e.preventDefault();
                useWorkspaceStore.temporal.getState().redo();
                return;
            }

            // Delete: Backspace or Delete
            if (e.key !== 'Backspace' && e.key !== 'Delete') return;
            if (isTyping) return;

            deleteSelected();
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [deleteSelected]);

    // Listen for toolbar delete event (from TopBar delete button)
    useEffect(() => {
        const handler = () => deleteSelected();
        document.addEventListener('canvas:delete-selected', handler);
        return () => document.removeEventListener('canvas:delete-selected', handler);
    }, [deleteSelected]);

    // (hasSelection tracked via store's setHasSelection)

    // Double-click canvas to add node
    const handlePaneDoubleClick = useCallback((event: React.MouseEvent) => {
        const flowPosition = reactFlowInstance.screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
        });
        setQuickAdd({
            x: flowPosition.x,
            y: flowPosition.y,
            screenX: event.clientX,
            screenY: event.clientY,
        });
    }, [reactFlowInstance]);

    // Node click handler — handles connect mode tap-to-connect
    const handleNodeClick = useCallback((_event: React.MouseEvent, node: RFNode) => {
        if (!connectMode.active || !activeGraphId) return;

        if (!connectMode.sourceNodeId) {
            // First tap: set source
            setConnectSource(node.id);
        } else if (connectMode.sourceNodeId !== node.id) {
            // Second tap: create edge
            const g = graphs[activeGraphId];
            const exists = g.edges.some(
                e => e.source === connectMode.sourceNodeId && e.target === node.id
            );
            if (!exists) {
                addEdge({
                    id: uuidv4(),
                    graphId: activeGraphId,
                    source: connectMode.sourceNodeId,
                    target: node.id,
                });
            }
            clearConnectMode();
        }
    }, [connectMode, activeGraphId, graphs, addEdge, setConnectSource, clearConnectMode]);

    // Context menu handlers
    const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: RFNode) => {
        event.preventDefault();
        setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
    }, []);

    const handleEdgeContextMenu = useCallback((event: React.MouseEvent, edge: RFEdge) => {
        event.preventDefault();
        setContextMenu({ x: event.clientX, y: event.clientY, edgeId: edge.id });
    }, []);

    const handlePaneContextMenu = useCallback((event: React.MouseEvent) => {
        event.preventDefault();
        const flowPosition = reactFlowInstance.screenToFlowPosition({
            x: event.clientX, y: event.clientY,
        });
        setContextMenu({ x: event.clientX, y: event.clientY, flowX: flowPosition.x, flowY: flowPosition.y });
    }, [reactFlowInstance]);

    // Long-press handlers for touch devices
    const clearLongPress = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    const startLongPress = useCallback((target: { nodeId?: string; edgeId?: string; flowX?: number; flowY?: number }) => {
        longPressFiredRef.current = false;
        clearLongPress();
        longPressTimerRef.current = setTimeout(() => {
            longPressFiredRef.current = true;
            try { navigator.vibrate(10); } catch {}
            setActionSheet(target);
        }, 500);
    }, [clearLongPress]);

    // Attach touch handlers to the ReactFlow container for long-press
    useEffect(() => {
        if (!isTouchDevice) return;

        const container = document.querySelector('.react-flow');
        if (!container) return;

        const handleTouchStart = (e: Event) => {
            const touch = (e as TouchEvent).touches[0];
            if (!touch) return;

            const target = touch.target as HTMLElement;

            // Find if we're touching a node
            const nodeEl = target.closest('.react-flow__node');
            if (nodeEl) {
                const nodeId = nodeEl.getAttribute('data-id');
                if (nodeId) {
                    startLongPress({ nodeId });
                    return;
                }
            }

            // Find if we're touching an edge
            const edgeEl = target.closest('.react-flow__edge');
            if (edgeEl) {
                const edgeId = edgeEl.getAttribute('data-id');
                if (edgeId) {
                    startLongPress({ edgeId });
                    return;
                }
            }

            // Pane long-press
            if (target.closest('.react-flow__pane') || target.closest('.react-flow__background')) {
                const flowPosition = reactFlowInstance.screenToFlowPosition({
                    x: touch.clientX,
                    y: touch.clientY,
                });
                startLongPress({ flowX: flowPosition.x, flowY: flowPosition.y });
            }
        };

        const handleTouchEnd = () => clearLongPress();
        const handleTouchMove = () => clearLongPress();

        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchend', handleTouchEnd, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, { passive: true });

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchend', handleTouchEnd);
            container.removeEventListener('touchmove', handleTouchMove);
        };
    }, [isTouchDevice, startLongPress, clearLongPress, reactFlowInstance]);

    // Build action sheet items (reuses same logic as context menu)
    const buildActionSheetItems = useCallback((): MenuItem[] => {
        if (!actionSheet || !activeGraphId) return [];

        if (actionSheet.edgeId) {
            return [{
                label: 'Remove Dependency',
                icon: <Trash2 className="w-4 h-4" />,
                danger: true,
                onClick: () => removeEdge(actionSheet.edgeId!),
            }];
        }

        if (actionSheet.nodeId) {
            const node = graph?.nodes.find(n => n.id === actionSheet.nodeId);
            const items: MenuItem[] = [];

            if (node?.type === 'action') {
                items.push({
                    label: 'Set Status',
                    submenu: [
                        { label: 'Todo', icon: <Circle className="w-4 h-4" />, onClick: () => updateNode(actionSheet.nodeId!, { status: 'todo' }) },
                        { label: 'In Progress', icon: <Clock className="w-4 h-4" />, onClick: () => updateNode(actionSheet.nodeId!, { status: 'in_progress' }) },
                        { label: 'Done', icon: <CheckCircle2 className="w-4 h-4" />, onClick: () => updateNode(actionSheet.nodeId!, { status: 'done' }) },
                    ],
                    onClick: () => {},
                });
            }

            items.push({
                label: 'Delete',
                icon: <Trash2 className="w-4 h-4" />,
                danger: true,
                onClick: () => {
                    if (node?.type === 'container') {
                        const nodeId = actionSheet.nodeId!;
                        setConfirmAction({
                            title: 'Delete Container',
                            message: 'Delete this container and all its children?',
                            onConfirm: () => removeNode(nodeId),
                        });
                        return;
                    }
                    removeNode(actionSheet.nodeId!);
                },
            });
            return items;
        }

        // Pane action sheet
        return [
            {
                label: 'New Action Node',
                icon: <Plus className="w-4 h-4" />,
                onClick: () => {
                    addNode({
                        id: uuidv4(),
                        graphId: activeGraphId,
                        type: 'action',
                        title: 'New Task',
                        x: actionSheet.flowX ?? 0,
                        y: actionSheet.flowY ?? 0,
                        width: 200,
                        height: 50,
                        status: 'todo',
                    });
                },
            },
            {
                label: 'New Container',
                icon: <Layers className="w-4 h-4" />,
                onClick: () => {
                    addNode({
                        id: uuidv4(),
                        graphId: activeGraphId,
                        type: 'container',
                        title: 'New Group',
                        x: actionSheet.flowX ?? 0,
                        y: actionSheet.flowY ?? 0,
                        width: 200,
                        height: 80,
                    });
                },
            },
        ];
    }, [actionSheet, activeGraphId, graph, removeEdge, removeNode, updateNode, addNode]);

    const buildContextMenuItems = useCallback((): MenuItem[] => {
        if (!contextMenu || !activeGraphId) return [];

        if (contextMenu.edgeId) {
            return [{
                label: 'Remove Dependency',
                icon: <Trash2 className="w-4 h-4" />,
                danger: true,
                onClick: () => removeEdge(contextMenu.edgeId!),
            }];
        }

        if (contextMenu.nodeId) {
            const selectedNodes = reactFlowInstance.getNodes().filter(n => n.selected);
            const isMulti = selectedNodes.length > 1 && selectedNodes.some(n => n.id === contextMenu.nodeId);
            const node = graph?.nodes.find(n => n.id === contextMenu.nodeId);

            if (isMulti) {
                const nodeIds = selectedNodes.map(n => n.id);
                return [
                    {
                        label: `Set Status (${selectedNodes.length} nodes)`,
                        submenu: [
                            { label: 'Todo', icon: <Circle className="w-4 h-4" />, onClick: () => batchUpdateNodes(nodeIds, { status: 'todo' }) },
                            { label: 'In Progress', icon: <Clock className="w-4 h-4" />, onClick: () => batchUpdateNodes(nodeIds, { status: 'in_progress' }) },
                            { label: 'Done', icon: <CheckCircle2 className="w-4 h-4" />, onClick: () => batchUpdateNodes(nodeIds, { status: 'done' }) },
                        ],
                        onClick: () => {},
                    },
                    {
                        label: `Delete ${selectedNodes.length} nodes`,
                        icon: <Trash2 className="w-4 h-4" />,
                        danger: true,
                        onClick: () => {
                            setConfirmAction({
                                title: 'Delete Nodes',
                                message: `Delete ${selectedNodes.length} nodes?`,
                                onConfirm: () => removeNodes(nodeIds),
                            });
                        },
                    },
                ];
            }

            const items: MenuItem[] = [];
            if (node?.type === 'action') {
                items.push({
                    label: 'Set Status',
                    submenu: [
                        { label: 'Todo', icon: <Circle className="w-4 h-4" />, onClick: () => updateNode(contextMenu.nodeId!, { status: 'todo' }) },
                        { label: 'In Progress', icon: <Clock className="w-4 h-4" />, onClick: () => updateNode(contextMenu.nodeId!, { status: 'in_progress' }) },
                        { label: 'Done', icon: <CheckCircle2 className="w-4 h-4" />, onClick: () => updateNode(contextMenu.nodeId!, { status: 'done' }) },
                    ],
                    onClick: () => {},
                });
            }
            items.push({
                label: 'Delete',
                icon: <Trash2 className="w-4 h-4" />,
                danger: true,
                shortcut: 'Del',
                onClick: () => {
                    if (node?.type === 'container') {
                        const nodeId = contextMenu.nodeId!;
                        setConfirmAction({
                            title: 'Delete Container',
                            message: 'Delete this container and all its children?',
                            onConfirm: () => removeNode(nodeId),
                        });
                        return;
                    }
                    removeNode(contextMenu.nodeId!);
                },
            });
            return items;
        }

        // Pane context menu
        return [
            {
                label: 'New Action Node',
                icon: <Plus className="w-4 h-4" />,
                onClick: () => {
                    addNode({
                        id: uuidv4(),
                        graphId: activeGraphId,
                        type: 'action',
                        title: 'New Task',
                        x: contextMenu.flowX ?? 0,
                        y: contextMenu.flowY ?? 0,
                        width: 200,
                        height: 50,
                        status: 'todo',
                    });
                },
            },
            {
                label: 'New Container',
                icon: <Layers className="w-4 h-4" />,
                onClick: () => {
                    addNode({
                        id: uuidv4(),
                        graphId: activeGraphId,
                        type: 'container',
                        title: 'New Group',
                        x: contextMenu.flowX ?? 0,
                        y: contextMenu.flowY ?? 0,
                        width: 200,
                        height: 80,
                    });
                },
            },
        ];
    }, [contextMenu, activeGraphId, graph, reactFlowInstance, removeEdge, removeNode, removeNodes, updateNode, batchUpdateNodes, addNode]);

    // FAB quick-add: place node at center of viewport
    const handleFabAdd = useCallback((title: string) => {
        if (!activeGraphId) return;
        const viewport = reactFlowInstance.getViewport();
        const centerX = (window.innerWidth / 2 - viewport.x) / viewport.zoom;
        const centerY = (window.innerHeight / 2 - viewport.y) / viewport.zoom;
        addNode({
            id: uuidv4(),
            graphId: activeGraphId,
            type: 'action',
            title,
            x: centerX - 100,
            y: centerY - 25,
            width: 200,
            height: 50,
            status: 'todo',
        });
    }, [activeGraphId, reactFlowInstance, addNode]);

    if (!graph) return <div className="text-gray-500 flex items-center justify-center h-full">No graph selected</div>;

    return (
        <div className="flex-1 h-full bg-gray-950 relative" tabIndex={0}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes as any}
                onNodesChange={onNodesChange}
                onConnect={onConnect}
                onNodeClick={handleNodeClick}
                onPaneClick={() => { setQuickAdd(null); setContextMenu(null); setActionSheet(null); if (connectMode.active) clearConnectMode(); }}
                onDoubleClick={isTouchDevice ? undefined : handlePaneDoubleClick}
                onNodeContextMenu={handleNodeContextMenu}
                onEdgeContextMenu={handleEdgeContextMenu}
                onPaneContextMenu={handlePaneContextMenu}
                onSelectionChange={({ nodes: selNodes, edges: selEdges }) => {
                    setHasSelection((selNodes?.length ?? 0) > 0 || (selEdges?.length ?? 0) > 0);
                }}
                panOnDrag={isTouchDevice ? !selectMode : true}
                selectionOnDrag={isTouchDevice ? selectMode : true}
                multiSelectionKeyCode="Shift"
                deleteKeyCode={null}
                fitView
                className="bg-gray-950"
            >
                <Background color="#374151" gap={20} />
                <Controls className="bg-gray-800 border-gray-700 fill-gray-100" />
            </ReactFlow>

            {/* Context menu */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={buildContextMenuItems()}
                    onClose={() => setContextMenu(null)}
                />
            )}

            {/* FAB for quick-add on touch devices */}
            {isTouchDevice && <FloatingActionButton onSubmit={handleFabAdd} />}

            {/* Quick-add input on double-click (desktop only) */}
            {quickAdd && (
                <div className="fixed z-50" style={{ left: quickAdd.screenX, top: quickAdd.screenY }}>
                    <input
                        autoFocus
                        placeholder="Task name..."
                        className="bg-slate-800 border border-slate-600 text-slate-200 px-3 py-1.5 rounded text-sm w-48 outline-none focus:border-purple-500"
                        onKeyDown={e => {
                            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                addNode({
                                    id: uuidv4(),
                                    graphId: activeGraphId!,
                                    type: 'action',
                                    title: e.currentTarget.value.trim(),
                                    x: quickAdd.x,
                                    y: quickAdd.y,
                                    width: 200,
                                    height: 50,
                                    status: 'todo',
                                });
                                setQuickAdd(null);
                            }
                            if (e.key === 'Escape') setQuickAdd(null);
                        }}
                        onBlur={() => setQuickAdd(null)}
                    />
                </div>
            )}

            {/* Action sheet for long-press on touch */}
            {actionSheet && (
                <ActionSheet
                    items={buildActionSheetItems()}
                    onClose={() => setActionSheet(null)}
                />
            )}

            {/* Custom confirmation modal (replaces window.confirm) */}
            {confirmAction && (
                <ConfirmModal
                    title={confirmAction.title}
                    message={confirmAction.message}
                    confirmLabel="Delete"
                    danger
                    onConfirm={() => {
                        confirmAction.onConfirm();
                        setConfirmAction(null);
                    }}
                    onCancel={() => setConfirmAction(null)}
                />
            )}
        </div>
    );
};

export const CanvasArea: React.FC = () => {
    return (
        <ReactFlowProvider>
            <CanvasInner />
        </ReactFlowProvider>
    );
}
