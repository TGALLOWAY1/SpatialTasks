import React, { useMemo, useCallback, useEffect, useState, useRef } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    Node as RFNode,
    Edge as RFEdge,
    NodeChange,
    Connection,
    useReactFlow,
    ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { clsx } from 'clsx';
import { v4 as uuidv4 } from 'uuid';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { ContainerNode } from '../Nodes/ContainerNode';
import { ActionNode } from '../Nodes/ActionNode';
import { ContextMenu, MenuItem } from '../UI/ContextMenu';
import { ConfirmModal } from '../UI/ConfirmModal';
import { ActionSheet } from '../UI/ActionSheet';
import { FloatingActionButton } from '../UI/FloatingActionButton';
import { Trash2, Circle, Clock, CheckCircle2, Plus, Layers, MousePointerClick, Sparkles, Maximize2, Palette, Ban } from 'lucide-react';
import { ACCENT_COLORS, ACCENT_BAR, ACCENT_LABEL } from '../../utils/accent';
import type { AccentColor } from '../../types';
import { useDeviceDetect } from '../../hooks/useDeviceDetect';
import { isNodeActionable, getBlockingNodes, BlockingNodeInfo } from '../../utils/logic';
import { StepDetailPanel } from '../ExecutionPanel/StepDetailPanel';
import { BlockedSpotlight, useBlockingTitles } from './BlockedSpotlight';

const nodeTypes = {
    container: ContainerNode,
    action: ActionNode
};

interface CanvasInnerProps {
    onGenerateFlow?: () => void;
}

const CanvasInner: React.FC<CanvasInnerProps> = ({ onGenerateFlow }) => {
    const { isTouchDevice } = useDeviceDetect();
    const rafRef = useRef<number>(0);

    const activeGraphId = useWorkspaceStore(state => state.activeGraphId);
    const graphs = useWorkspaceStore(state => state.graphs);
    const navStack = useWorkspaceStore(state => state.navStack);
    const navigateBack = useWorkspaceStore(state => state.navigateBack);
    const updateNode = useWorkspaceStore(state => state.updateNode);
    const removeNode = useWorkspaceStore(state => state.removeNode);
    const removeEdge = useWorkspaceStore(state => state.removeEdge);
    const removeNodes = useWorkspaceStore(state => state.removeNodes);
    const addEdge = useWorkspaceStore(state => state.addEdge);
    const addNode = useWorkspaceStore(state => state.addNode);
    const batchUpdateNodes = useWorkspaceStore(state => state.batchUpdateNodes);
    const setNodeColor = useWorkspaceStore(state => state.setNodeColor);
    const batchUpdatePositions = useWorkspaceStore(state => state.batchUpdatePositions);
    const selectMode = useWorkspaceStore(state => state.selectMode);
    const setHasSelection = useWorkspaceStore(state => state.setHasSelection);
    const connectMode = useWorkspaceStore(state => state.connectMode);
    const setConnectSource = useWorkspaceStore(state => state.setConnectSource);
    const clearConnectMode = useWorkspaceStore(state => state.clearConnectMode);
    const setAutoEditNodeId = useWorkspaceStore(state => state.setAutoEditNodeId);
    const executionMode = useWorkspaceStore(state => state.executionMode);

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

    // Blocked-by spotlight state (transient UI state, not persisted)
    const [spotlight, setSpotlight] = useState<{
        sourceNodeId: string;
        blockers: BlockingNodeInfo[];
    } | null>(null);
    const spotlightTitles = useBlockingTitles(spotlight?.blockers ?? []);

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
            style: { width: n.width ?? 200 },
        }));
    }, [graph, connectMode]);

    const edges: RFEdge[] = useMemo(() => {
        if (!graph) return [];
        return graph.edges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            type: 'smoothstep',
            animated: !isTouchDevice,
            style: { stroke: '#4b5563', strokeWidth: 2 },
        }));
    }, [graph, isTouchDevice]);

    const onNodesChange = useCallback((changes: NodeChange[]) => {
        const applyChanges = () => {
            const posUpdates: Array<{ id: string; x: number; y: number }> = [];
            changes.forEach(change => {
                if (change.type === 'position' && change.position) {
                    posUpdates.push({ id: change.id, x: change.position.x, y: change.position.y });
                }
            });
            if (posUpdates.length > 0) {
                batchUpdatePositions(posUpdates);
            }
        };

        if (isTouchDevice) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(applyChanges);
        } else {
            applyChanges();
        }
    }, [batchUpdatePositions, isTouchDevice]);

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

        const doDelete = () => {
            selectedEdges.forEach(edge => removeEdge(edge.id));
            if (selectedNodes.length > 0) {
                removeNodes(selectedNodes.map(n => n.id));
            }
            setHasSelection(false);
        };

        if (selectedNodes.length > 1) {
            const hasContainers = selectedNodes.some(n => n.type === 'container');
            setConfirmAction({
                title: 'Delete Nodes',
                message: hasContainers
                    ? `Delete ${selectedNodes.length} node(s)? Container nodes and their children will be removed.`
                    : `Delete ${selectedNodes.length} nodes?`,
                onConfirm: doDelete,
            });
            return;
        }
        if (selectedNodes.length === 1 && selectedNodes[0].type === 'container') {
            setConfirmAction({
                title: 'Delete Container',
                message: 'Delete this container and all its children?',
                onConfirm: doDelete,
            });
            return;
        }
        doDelete();
    }, [reactFlowInstance, removeEdge, removeNodes, setHasSelection]);

    // Fit view handler (used by keyboard shortcut and toolbar)
    const handleFitView = useCallback(() => {
        reactFlowInstance.fitView({ padding: 0.2, duration: 300, minZoom: 0.08, maxZoom: 1.5 });
    }, [reactFlowInstance]);

    const createQuickNodeAtViewportCenter = useCallback((type: 'action' | 'container' = 'action') => {
        if (!activeGraphId) return;
        const viewport = reactFlowInstance.getViewport();
        const centerX = (window.innerWidth / 2 - viewport.x) / viewport.zoom;
        const centerY = (window.innerHeight / 2 - viewport.y) / viewport.zoom;
        const isContainer = type === 'container';
        const nodeId = uuidv4();

        addNode({
            id: nodeId,
            graphId: activeGraphId,
            type,
            title: isContainer ? 'New Group' : 'New Task',
            x: centerX - 100,
            y: centerY - (isContainer ? 40 : 25),
            width: 200,
            height: isContainer ? 80 : 50,
            ...(isContainer ? {} : { status: 'todo' as const }),
        });
        setAutoEditNodeId(nodeId);
    }, [activeGraphId, reactFlowInstance, addNode, setAutoEditNodeId]);

    // Keyboard shortcuts: delete, undo, redo, fit-view
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

            // Undo: Ctrl/Cmd+Z (skip when typing so browser handles native text undo)
            if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
                if (isTyping) return;
                e.preventDefault();
                useWorkspaceStore.temporal.getState().undo();
                return;
            }

            // Redo: Ctrl/Cmd+Shift+Z (skip when typing so browser handles native text redo)
            if (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
                if (isTyping) return;
                e.preventDefault();
                useWorkspaceStore.temporal.getState().redo();
                return;
            }

            // Fit view: Ctrl/Cmd+Shift+F
            if (e.key === 'f' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
                if (isTyping) return;
                e.preventDefault();
                handleFitView();
                return;
            }

            // Select all nodes: Ctrl/Cmd+A
            if (e.key.toLowerCase() === 'a' && (e.ctrlKey || e.metaKey)) {
                if (isTyping) return;
                e.preventDefault();
                const updatedNodes = reactFlowInstance.getNodes().map(node => ({ ...node, selected: true }));
                reactFlowInstance.setNodes(updatedNodes);
                setHasSelection(updatedNodes.length > 0);
                return;
            }

            // Quick add shortcuts
            if (!isTyping && !e.ctrlKey && !e.metaKey && !e.altKey) {
                if (e.key.toLowerCase() === 'n') {
                    e.preventDefault();
                    createQuickNodeAtViewportCenter('action');
                    return;
                }
                if (e.key.toLowerCase() === 'g') {
                    e.preventDefault();
                    createQuickNodeAtViewportCenter('container');
                    return;
                }
            }

            // Escape: layered contextual dismissal (one layer per press)
            if (e.key === 'Escape') {
                // Priority 1-2: editing/notes handled by component stopPropagation
                if (isTyping) return;
                // Priority 3: context menu / action sheet
                if (contextMenu) { setContextMenu(null); return; }
                if (actionSheet) { setActionSheet(null); return; }
                // Priority 4: quick-add input
                if (quickAdd) { setQuickAdd(null); return; }
                // Priority 5: connect mode
                if (connectMode.active) { clearConnectMode(); return; }
                // Priority 6: deselect all
                const hadSelection = reactFlowInstance.getNodes().some(n => n.selected) || reactFlowInstance.getEdges().some(ed => ed.selected);
                if (hadSelection) {
                    reactFlowInstance.setNodes(reactFlowInstance.getNodes().map(node => ({ ...node, selected: false })));
                    reactFlowInstance.setEdges(reactFlowInstance.getEdges().map(edge => ({ ...edge, selected: false })));
                    setHasSelection(false);
                }
                // Priority 7: no-op
                return;
            }

            // Arrow keys: navigate between nodes in the workflow
            if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                if (isTyping) return;
                if (!graph) return;

                const rfNodes = reactFlowInstance.getNodes();
                const selected = rfNodes.filter(n => n.selected);
                if (selected.length !== 1) return;

                e.preventDefault();
                const currentId = selected[0].id;
                let candidates: string[] = [];

                if (e.key === 'ArrowRight') {
                    // Follow edges forward: current node is source
                    candidates = graph.edges.filter(edge => edge.source === currentId).map(edge => edge.target);
                } else if (e.key === 'ArrowLeft') {
                    // Follow edges backward: current node is target
                    candidates = graph.edges.filter(edge => edge.target === currentId).map(edge => edge.source);
                } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    // Find siblings: nodes that share the same parent(s) or same child(ren)
                    const parentIds = graph.edges.filter(edge => edge.target === currentId).map(edge => edge.source);
                    const childIds = graph.edges.filter(edge => edge.source === currentId).map(edge => edge.target);

                    const siblingSet = new Set<string>();
                    // Siblings via shared parents (parallel targets from same source)
                    for (const pid of parentIds) {
                        graph.edges.filter(edge => edge.source === pid).forEach(edge => {
                            if (edge.target !== currentId) siblingSet.add(edge.target);
                        });
                    }
                    // Siblings via shared children (parallel sources into same target)
                    for (const cid of childIds) {
                        graph.edges.filter(edge => edge.target === cid).forEach(edge => {
                            if (edge.source !== currentId) siblingSet.add(edge.source);
                        });
                    }
                    candidates = Array.from(siblingSet);
                }

                if (candidates.length === 0) return;

                const currentNode = graph.nodes.find(n => n.id === currentId);
                if (!currentNode) return;

                // Resolve candidate nodes with positions
                const candidateNodes = candidates
                    .map(id => graph.nodes.find(n => n.id === id))
                    .filter((n): n is NonNullable<typeof n> => !!n);

                if (candidateNodes.length === 0) return;

                let targetNode;
                if (e.key === 'ArrowUp') {
                    // Pick the nearest candidate above (smaller Y), or wrap to the bottom
                    const above = candidateNodes.filter(n => n.y < currentNode.y).sort((a, b) => b.y - a.y);
                    targetNode = above[0] ?? candidateNodes.sort((a, b) => b.y - a.y)[0];
                } else if (e.key === 'ArrowDown') {
                    // Pick the nearest candidate below (larger Y), or wrap to the top
                    const below = candidateNodes.filter(n => n.y > currentNode.y).sort((a, b) => a.y - b.y);
                    targetNode = below[0] ?? candidateNodes.sort((a, b) => a.y - b.y)[0];
                } else if (candidateNodes.length === 1) {
                    targetNode = candidateNodes[0];
                } else {
                    // For left/right with multiple candidates, pick the one closest in Y
                    targetNode = candidateNodes.sort((a, b) =>
                        Math.abs(a.y - currentNode.y) - Math.abs(b.y - currentNode.y)
                    )[0];
                }

                if (!targetNode) return;

                // Select the target node and deselect all others
                const updatedNodes = rfNodes.map(n => ({
                    ...n,
                    selected: n.id === targetNode!.id,
                }));
                reactFlowInstance.setNodes(updatedNodes);

                // Pan to the newly selected node
                const rfTarget = rfNodes.find(n => n.id === targetNode!.id);
                if (rfTarget) {
                    reactFlowInstance.fitView({
                        nodes: [rfTarget],
                        padding: 0.4,
                        duration: 300,
                        maxZoom: 1.5,
                    });
                }
                return;
            }

            // Delete: Backspace or Delete
            if (e.key !== 'Backspace' && e.key !== 'Delete') return;
            if (isTyping) return;

            deleteSelected();
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [deleteSelected, handleFitView, graph, reactFlowInstance, setHasSelection, createQuickNodeAtViewportCenter, connectMode.active, clearConnectMode, contextMenu, actionSheet, quickAdd]);

    // Process canvas actions dispatched from other components via the store
    const pendingCanvasAction = useWorkspaceStore(state => state.pendingCanvasAction);
    const clearCanvasAction = useWorkspaceStore(state => state.clearCanvasAction);

    useEffect(() => {
        if (!pendingCanvasAction) return;

        const action = pendingCanvasAction;
        clearCanvasAction();

        if (action.type === 'delete-selected') {
            deleteSelected();
        } else if (action.type === 'fit-view') {
            handleFitView();
        } else if (action.type === 'spotlight-blockers') {
            if (!activeGraphId) return;
            const currentGraph = useWorkspaceStore.getState().graphs[activeGraphId];
            if (!currentGraph) return;
            const allGraphs = useWorkspaceStore.getState().graphs;
            const sourceNode = currentGraph.nodes.find(n => n.id === action.sourceNodeId);
            if (!sourceNode) return;
            const freshBlockers = getBlockingNodes(sourceNode, currentGraph, allGraphs);
            if (freshBlockers.length === 0) return;

            setSpotlight({ sourceNodeId: action.sourceNodeId, blockers: freshBlockers });

            // Fit view to include the source + its blockers.
            const idsToFit = [action.sourceNodeId, ...freshBlockers.map(b => b.nodeId)];
            const rfNodes = reactFlowInstance.getNodes();
            const nodesToFit = rfNodes.filter(n => idsToFit.includes(n.id));
            if (nodesToFit.length > 0) {
                reactFlowInstance.fitView({
                    nodes: nodesToFit,
                    padding: 0.3,
                    duration: 400,
                    maxZoom: 1.5,
                });
            }
        } else if (action.type === 'select-and-frame') {
            const rfNodes = reactFlowInstance.getNodes();
            const rfNode = rfNodes.find(n => n.id === action.nodeId);
            if (!rfNode) return;
            reactFlowInstance.setNodes(rfNodes.map(n => ({ ...n, selected: n.id === action.nodeId })));
            setHasSelection(true);
            reactFlowInstance.fitView({
                nodes: [rfNode],
                padding: 0.4,
                duration: 300,
                maxZoom: 1.5,
            });
        } else if (action.type === 'advance-next') {
            const fromNodeId = action.fromNodeId;
            if (!activeGraphId) return;

            // Small delay to let the status update propagate
            setTimeout(() => {
                const allGraphs = useWorkspaceStore.getState().graphs;
                const currentGraph = allGraphs[activeGraphId];
                if (!currentGraph) return;

                // Find the next actionable node
                const nextNode = currentGraph.nodes.find(n =>
                    n.id !== fromNodeId && isNodeActionable(n, currentGraph, allGraphs)
                );

                if (nextNode) {
                    const rfNodes = reactFlowInstance.getNodes();
                    const rfNode = rfNodes.find(n => n.id === nextNode.id);
                    if (rfNode) {
                        // Find successors of the next node too
                        const successorIds = currentGraph.edges
                            .filter(edge => edge.source === nextNode.id)
                            .map(edge => edge.target);
                        const nodesToFit = rfNodes.filter(n =>
                            n.id === nextNode.id || successorIds.includes(n.id)
                        );
                        reactFlowInstance.fitView({
                            nodes: nodesToFit,
                            padding: 0.4,
                            duration: 400,
                            maxZoom: 1.5,
                        });
                    }
                } else {
                    // No more actionable nodes — zoom out to show full flow
                    reactFlowInstance.fitView({ padding: 0.2, duration: 400 });
                }
            }, 100);
        }
    }, [pendingCanvasAction, clearCanvasAction, deleteSelected, handleFitView, activeGraphId, reactFlowInstance]);

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
            screenX: Math.min(event.clientX, window.innerWidth - 210),
            screenY: Math.min(event.clientY, window.innerHeight - 50),
        });
    }, [reactFlowInstance]);

    // Node click handler — handles connect mode tap-to-connect + mobile zoom-to-node
    const handleNodeClick = useCallback((_event: React.MouseEvent, node: RFNode) => {
        if (connectMode.active && activeGraphId) {
            if (!connectMode.sourceNodeId) {
                setConnectSource(node.id);
            } else if (connectMode.sourceNodeId !== node.id) {
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
            return;
        }

        // Mobile: zoom to clicked node + its successors
        if (isTouchDevice && activeGraphId) {
            const g = graphs[activeGraphId];
            // Find successor node IDs (outgoing edges from this node)
            const successorIds = g.edges
                .filter(e => e.source === node.id)
                .map(e => e.target);
            // Include clicked node + successors in the fitView
            const nodeIdsToFit = [node.id, ...successorIds];
            const rfNodes = reactFlowInstance.getNodes();
            const nodesToFit = rfNodes.filter(n => nodeIdsToFit.includes(n.id));
            if (nodesToFit.length > 0) {
                reactFlowInstance.fitView({
                    nodes: nodesToFit,
                    padding: 0.4,
                    duration: 300,
                    maxZoom: 1.5,
                });
            }
        }
    }, [connectMode, activeGraphId, graphs, addEdge, setConnectSource, clearConnectMode, isTouchDevice, reactFlowInstance]);

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

    // Swipe-right to go back (navigate up breadcrumb) on touch devices
    useEffect(() => {
        if (!isTouchDevice || navStack.length <= 1) return;

        let startX = 0;
        let startY = 0;

        const handleTouchStart = (e: TouchEvent) => {
            const touch = e.touches[0];
            // Only detect swipes starting from the left edge (50px to avoid conflict with iOS Safari back gesture)
            if (touch.clientX > 50) return;
            startX = touch.clientX;
            startY = touch.clientY;
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (startX === 0) return;
            const touch = e.changedTouches[0];
            const dx = touch.clientX - startX;
            const dy = Math.abs(touch.clientY - startY);
            startX = 0;
            // Require horizontal swipe >100px with minimal vertical movement
            if (dx > 100 && dy < 50) {
                navigateBack();
                try { navigator.vibrate(10); } catch {}
            }
        };

        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });
        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isTouchDevice, navStack.length, navigateBack]);

    // Shared menu builder for both context menu and action sheet
    const buildMenuItems = useCallback((target: {
        nodeId?: string; edgeId?: string; flowX?: number; flowY?: number;
    }, opts?: { multiSelect?: boolean }): MenuItem[] => {
        if (!activeGraphId) return [];

        if (target.edgeId) {
            return [{
                label: 'Remove Dependency',
                icon: <Trash2 className="w-4 h-4" />,
                danger: true,
                onClick: () => removeEdge(target.edgeId!),
            }];
        }

        const colorSwatch = (c: AccentColor) => (
            <span className={clsx("inline-block w-3 h-3 rounded-full", ACCENT_BAR[c])} aria-hidden="true" />
        );
        const colorSubmenuFor = (apply: (c: AccentColor | null) => void): MenuItem[] => [
            { label: 'No color', icon: <Ban className="w-4 h-4" />, onClick: () => apply(null) },
            ...ACCENT_COLORS.map(c => ({
                label: ACCENT_LABEL[c],
                icon: colorSwatch(c),
                onClick: () => apply(c),
            })),
        ];

        if (target.nodeId) {
            // Multi-select handling (desktop context menu only)
            if (opts?.multiSelect) {
                const selectedNodes = reactFlowInstance.getNodes().filter(n => n.selected);
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
                        label: `Set Color (${selectedNodes.length} nodes)`,
                        icon: <Palette className="w-4 h-4" />,
                        submenu: colorSubmenuFor((c) => {
                            nodeIds.forEach(id => setNodeColor(id, c));
                        }),
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

            const node = graph?.nodes.find(n => n.id === target.nodeId);
            const items: MenuItem[] = [];

            if (node?.type === 'action') {
                items.push({
                    label: 'Set Status',
                    submenu: [
                        { label: 'Todo', icon: <Circle className="w-4 h-4" />, onClick: () => updateNode(target.nodeId!, { status: 'todo' }) },
                        { label: 'In Progress', icon: <Clock className="w-4 h-4" />, onClick: () => updateNode(target.nodeId!, { status: 'in_progress' }) },
                        { label: 'Done', icon: <CheckCircle2 className="w-4 h-4" />, onClick: () => updateNode(target.nodeId!, { status: 'done' }) },
                    ],
                    onClick: () => {},
                });
            }
            items.push({
                label: 'Set Color',
                icon: <Palette className="w-4 h-4" />,
                submenu: colorSubmenuFor((c) => setNodeColor(target.nodeId!, c)),
                onClick: () => {},
            });
            items.push({
                label: 'Delete',
                icon: <Trash2 className="w-4 h-4" />,
                danger: true,
                onClick: () => {
                    if (node?.type === 'container') {
                        const nodeId = target.nodeId!;
                        setConfirmAction({
                            title: 'Delete Container',
                            message: 'Delete this container and all its children?',
                            onConfirm: () => removeNode(nodeId),
                        });
                        return;
                    }
                    removeNode(target.nodeId!);
                },
            });
            return items;
        }

        // Pane menu
        return [
            {
                label: 'New Action Node',
                icon: <Plus className="w-4 h-4" />,
                onClick: () => {
                    const nodeId = uuidv4();
                    addNode({
                        id: nodeId,
                        graphId: activeGraphId,
                        type: 'action',
                        title: 'New Task',
                        x: target.flowX ?? 0,
                        y: target.flowY ?? 0,
                        width: 200,
                        height: 50,
                        status: 'todo',
                    });
                    setAutoEditNodeId(nodeId);
                },
            },
            {
                label: 'New Container',
                icon: <Layers className="w-4 h-4" />,
                onClick: () => {
                    const nodeId = uuidv4();
                    addNode({
                        id: nodeId,
                        graphId: activeGraphId,
                        type: 'container',
                        title: 'New Group',
                        x: target.flowX ?? 0,
                        y: target.flowY ?? 0,
                        width: 200,
                        height: 80,
                    });
                    setAutoEditNodeId(nodeId);
                },
            },
        ];
    }, [activeGraphId, graph, reactFlowInstance, removeEdge, removeNode, removeNodes, updateNode, batchUpdateNodes, setNodeColor, addNode, setAutoEditNodeId]);

    const buildActionSheetItems = useCallback((): MenuItem[] => {
        if (!actionSheet) return [];
        return buildMenuItems(actionSheet);
    }, [actionSheet, buildMenuItems]);

    const buildContextMenuItems = useCallback((): MenuItem[] => {
        if (!contextMenu) return [];
        const selectedNodes = reactFlowInstance.getNodes().filter(n => n.selected);
        const isMulti = !!(contextMenu.nodeId && selectedNodes.length > 1 && selectedNodes.some(n => n.id === contextMenu.nodeId));
        return buildMenuItems(contextMenu, { multiSelect: isMulti });
    }, [contextMenu, reactFlowInstance, buildMenuItems]);

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
                onPaneClick={() => { setQuickAdd(null); setContextMenu(null); setActionSheet(null); setSpotlight(null); if (connectMode.active) clearConnectMode(); }}
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
                minZoom={0.08}
                maxZoom={2.5}
                fitViewOptions={{ padding: 0.2, minZoom: 0.08, maxZoom: 1.5 }}
                fitView
                className="bg-gray-950"
            >
                <Background color="var(--bg-dot)" gap={20} />
                {!isTouchDevice && <Controls className="bg-gray-800 border-gray-700 fill-gray-100" />}
                {!isTouchDevice && (
                    <MiniMap
                        nodeColor={(node) => node.type === 'container' ? '#4338ca' : '#334155'}
                        maskColor="rgba(0, 0, 0, 0.7)"
                        style={{
                            backgroundColor: '#111827',
                            border: '1px solid #374151',
                            borderRadius: 8,
                        }}
                        pannable
                        zoomable
                    />
                )}
            </ReactFlow>

            {/* Empty state guidance */}
            {graph.nodes.length === 0 && !quickAdd && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="text-center space-y-3 max-w-xs">
                        <MousePointerClick className="w-10 h-10 text-gray-600 mx-auto" />
                        <p className="text-gray-400 text-sm font-medium">
                            {isTouchDevice ? 'Tap the + button to add a task' : 'Double-click to add a task'}
                        </p>
                        <p className="text-gray-600 text-xs">
                            {isTouchDevice
                                ? 'Or long-press the canvas for more options'
                                : 'Or right-click for more options like creating containers'}
                        </p>
                        {!isTouchDevice && (
                            <p className="text-gray-600 text-[11px]">
                                Shortcuts: <kbd className="px-1 py-0.5 rounded bg-gray-800 border border-gray-700">N</kbd> task, <kbd className="px-1 py-0.5 rounded bg-gray-800 border border-gray-700">G</kbd> group, <kbd className="px-1 py-0.5 rounded bg-gray-800 border border-gray-700">Esc</kbd> clear
                            </p>
                        )}
                        {onGenerateFlow && (
                            <button
                                onClick={onGenerateFlow}
                                className="pointer-events-auto inline-flex items-center gap-2 px-4 py-2.5 mt-2 rounded-lg text-sm font-medium bg-purple-600/20 border border-purple-700/50 text-purple-300 hover:bg-purple-600/30 hover:text-purple-200 transition-colors"
                            >
                                <Sparkles className="w-4 h-4" />
                                Generate Flow with AI
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Context menu */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={buildContextMenuItems()}
                    onClose={() => setContextMenu(null)}
                />
            )}

            {/* Mobile: floating fit-view button (hidden when execution panel is showing) */}
            {isTouchDevice && !(executionMode && navStack.length >= 2) && (
                <button
                    onClick={handleFitView}
                    className="fixed z-[80] w-11 h-11 rounded-full bg-gray-800 border border-gray-600 text-gray-300 shadow-lg flex items-center justify-center active:bg-gray-700 active:scale-95 transition-all"
                    style={{
                        bottom: 'calc(96px + var(--sab, 0px))',
                        right: '24px',
                    }}
                    title="View full flow"
                >
                    <Maximize2 className="w-5 h-5" />
                </button>
            )}

            {/* FAB for quick-add on touch devices (hidden when execution panel is showing) */}
            {isTouchDevice && !(executionMode && navStack.length >= 2) && <FloatingActionButton onSubmit={handleFabAdd} />}

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

            {/* Execution mode step detail panel */}
            <StepDetailPanel />

            {/* Predecessor Trace — blocked-by spotlight */}
            {spotlight && (
                <BlockedSpotlight
                    sourceNodeId={spotlight.sourceNodeId}
                    blockers={spotlight.blockers}
                    titles={spotlightTitles}
                    isSmallScreen={isTouchDevice}
                    onDismiss={() => setSpotlight(null)}
                    onJumpTo={(blockerId) => {
                        setSpotlight(null);
                        useWorkspaceStore.getState().dispatchCanvasAction({ type: 'select-and-frame', nodeId: blockerId });
                    }}
                />
            )}
        </div>
    );
};

interface CanvasAreaProps {
    onGenerateFlow?: () => void;
}

export const CanvasArea: React.FC<CanvasAreaProps> = ({ onGenerateFlow }) => {
    return (
        <ReactFlowProvider>
            <CanvasInner onGenerateFlow={onGenerateFlow} />
        </ReactFlowProvider>
    );
}
