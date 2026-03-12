import React, { memo, useMemo, useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Node as SpatialNode, Graph, Edge } from '../../types';
import { Layers, ArrowRightCircle, PieChart, ArrowBigRightDash, Sparkles, Loader2, Pencil } from 'lucide-react';
import { clsx } from 'clsx';
import { v4 as uuidv4 } from 'uuid';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useToastStore } from '../UI/Toast';
import { getContainerProgress, isNodeBlocked } from '../../utils/logic';
import { magicExpand, GeminiError } from '../../services/gemini';
import { ConfirmModal } from '../UI/ConfirmModal';
import { useDeviceDetect } from '../../hooks/useDeviceDetect';

const WIDTH = 200;
const HEIGHT = 80;
const PADDING_X = 50;

const ProgressRing = ({ progress }: { progress: number }) => {
    const percentage = Math.round(progress * 100);
    return (
        <div className="flex items-center gap-1.5 text-[10px] text-indigo-300 bg-indigo-900/50 px-1.5 py-0.5 rounded-full border border-indigo-800">
            <PieChart className="w-3 h-3" />
            <span>{percentage}%</span>
        </div>
    );
};

export const ContainerNode = memo(({ data, selected }: NodeProps<SpatialNode>) => {
    const { isTouchDevice } = useDeviceDetect();
    const enterGraph = useWorkspaceStore(state => state.enterGraph);
    const activeGraphId = useWorkspaceStore(state => state.activeGraphId);
    const graphs = useWorkspaceStore(state => state.graphs);
    const executionMode = useWorkspaceStore(state => state.executionMode);
    const settings = useWorkspaceStore(state => state.settings);
    const addGraph = useWorkspaceStore(state => state.addGraph);
    const updateNode = useWorkspaceStore(state => state.updateNode);
    const updateSettings = useWorkspaceStore(state => state.updateSettings);
    const addToast = useToastStore(state => state.addToast);

    const [expanding, setExpanding] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editValue, setEditValue] = useState(data.title);
    const [showExpandConfirm, setShowExpandConfirm] = useState(false);

    const progress = useMemo(() => {
        return getContainerProgress(data, { graphs } as any);
    }, [data, graphs]);

    const isActionable = useMemo(() => {
        const blocked = activeGraphId ? isNodeBlocked(data, graphs[activeGraphId]) : false;
        return !blocked && progress < 1;
    }, [data, activeGraphId, graphs, progress]);

    const highlight = executionMode && isActionable;
    const dim = executionMode && !isActionable;

    const hasApiKey = !!settings.geminiApiKey;
    const hasExistingChildren = !!(data.childGraphId && graphs[data.childGraphId]?.nodes.length > 0);

    const saveTitle = useCallback(() => {
        if (editValue.trim() && editValue.trim() !== data.title) {
            updateNode(data.id, { title: editValue.trim() });
        }
        setEditing(false);
    }, [editValue, data.title, data.id, updateNode]);

    const handleTitleDoubleClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setEditing(true);
        setEditValue(data.title);
    }, [data.title]);

    const handleEnter = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (data.childGraphId) {
            enterGraph(data.childGraphId, data.id, data.title);
        } else {
            // Create a child graph on-the-fly for new containers
            const currentGraph = activeGraphId ? graphs[activeGraphId] : null;
            const projectId = currentGraph?.projectId || '';
            const childGraphId = uuidv4();
            const childGraph: Graph = {
                id: childGraphId,
                projectId,
                title: data.title,
                nodes: [],
                edges: [],
                viewport: { x: 0, y: 0, zoom: 1 },
            };
            addGraph(childGraph);
            updateNode(data.id, { childGraphId });
            enterGraph(childGraphId, data.id, data.title);
        }
    };

    const doMagicExpand = async () => {
        setExpanding(true);

        try {
            const result = await magicExpand(
                settings.geminiApiKey,
                data.title,
                data.meta?.notes
            );

            const currentGraph = activeGraphId ? graphs[activeGraphId] : null;
            const projectId = currentGraph?.projectId || '';

            const childGraphId = uuidv4();
            const childGraph: Graph = {
                id: childGraphId,
                projectId,
                title: data.title,
                nodes: [],
                edges: [],
                viewport: { x: 0, y: 0, zoom: 1 },
            };

            // Map Gemini slug IDs to real UUIDs
            const idMap: Record<string, string> = {};

            result.subtasks.forEach((subtask, index) => {
                const nodeId = uuidv4();
                idMap[subtask.id] = nodeId;

                const node: SpatialNode = {
                    id: nodeId,
                    graphId: childGraphId,
                    type: 'action',
                    title: subtask.title,
                    x: index * (WIDTH + PADDING_X),
                    y: (index % 2 === 0) ? 0 : 50,
                    width: WIDTH,
                    height: HEIGHT,
                    status: 'todo',
                };
                childGraph.nodes.push(node);
            });

            result.subtasks.forEach((subtask) => {
                const targetId = idMap[subtask.id];
                subtask.dependsOn.forEach((depSlug) => {
                    const sourceId = idMap[depSlug];
                    if (sourceId && targetId) {
                        const edge: Edge = {
                            id: uuidv4(),
                            graphId: childGraphId,
                            source: sourceId,
                            target: targetId,
                        };
                        childGraph.edges.push(edge);
                    }
                });
            });

            addGraph(childGraph);
            updateNode(data.id, { childGraphId });
            enterGraph(childGraphId, data.id, data.title);

            addToast(`Generated ${result.subtasks.length} subtasks for "${data.title}"`, 'success');
        } catch (err) {
            const geminiErr = err as GeminiError;
            addToast(geminiErr.message || 'Magic Expand failed.', 'error');
            if (geminiErr.type === 'invalid_key') {
                updateSettings({ geminiStatus: 'error' });
            }
        } finally {
            setExpanding(false);
        }
    };

    const handleMagicExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!settings.geminiApiKey) return;

        if (hasExistingChildren) {
            setShowExpandConfirm(true);
            return;
        }

        doMagicExpand();
    };

    return (
        <div className={clsx(
            "px-4 py-3 rounded-lg shadow-xl border-2 w-[200px] bg-indigo-950 transition-[transform,opacity,border-color,box-shadow] duration-200 group relative",
            selected ? "border-indigo-400 shadow-indigo-500/30" : "border-indigo-800",
            highlight && "ring-4 ring-amber-500/50 border-amber-500 shadow-amber-500/20 scale-105 z-10",
            dim && "opacity-30 blur-[1px] grayscale",
            (data as any)._isConnectSource && "ring-4 ring-purple-500 animate-pulse"
        )}>
            <Handle type="target" position={Position.Left} className="w-3 h-3 bg-indigo-400" />

            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between border-b border-indigo-800 pb-2 mb-1">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <Layers className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                        {editing ? (
                            <input
                                className="bg-transparent border-b border-indigo-500 outline-none text-sm text-indigo-100 font-bold w-full"
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') saveTitle();
                                    if (e.key === 'Escape') setEditing(false);
                                }}
                                onBlur={saveTitle}
                                onMouseDown={e => e.stopPropagation()}
                                onClick={e => e.stopPropagation()}
                                autoFocus
                            />
                        ) : (
                            <span
                                className="font-bold text-sm text-indigo-100 truncate"
                                onDoubleClick={handleTitleDoubleClick}
                            >
                                {data.title}
                            </span>
                        )}
                    </div>
                    {highlight && <ArrowBigRightDash className="w-4 h-4 text-amber-500 animate-pulse" />}
                </div>

                <div className="flex justify-between items-center">
                    <ProgressRing progress={progress} />

                    <div className="flex items-center gap-1">
                        {hasApiKey && (
                            <button
                                onClick={handleMagicExpand}
                                disabled={expanding}
                                className="text-purple-300 hover:text-purple-100 hover:scale-110 transition-all flex items-center justify-center disabled:opacity-50 touch:min-h-[44px] touch:min-w-[44px]"
                                title="Magic Expand — AI generates subtasks"
                            >
                                {expanding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            </button>
                        )}

                        <button
                            onClick={handleEnter}
                            className="opacity-100 text-indigo-200 hover:text-white hover:scale-110 transition-all flex items-center justify-center touch:min-h-[44px] touch:min-w-[44px]"
                            title="Enter Subgraph"
                        >
                            <ArrowRightCircle className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {highlight && (
                <div className="absolute -top-3 -right-2 bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full animate-bounce shadow-lg z-20">
                    Dive In
                </div>
            )}

            {/* Touch: floating Edit Title button when selected */}
            {selected && isTouchDevice && !editing && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setEditing(true);
                        setEditValue(data.title);
                    }}
                    className="absolute -top-10 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1 min-h-[32px] active:bg-indigo-500 z-20"
                >
                    <Pencil className="w-3 h-3" />
                    Edit Title
                </button>
            )}

            {/* Progress bar visual at bottom */}
            <div className="absolute bottom-0 left-0 h-1 bg-indigo-900 w-full rounded-b-lg overflow-hidden">
                <div
                    className="h-full bg-indigo-400 transition-all duration-500 shadow-[0_0_8px_rgba(129,140,248,0.5)]"
                    style={{ width: `${progress * 100}%` }}
                />
            </div>

            <Handle type="source" position={Position.Right} className="w-3 h-3 bg-indigo-400" />

            {showExpandConfirm && (
                <ConfirmModal
                    title="Replace Subtasks"
                    message="This container already has subtasks. Replace them with AI-generated ones?"
                    confirmLabel="Replace"
                    danger
                    onConfirm={() => {
                        setShowExpandConfirm(false);
                        doMagicExpand();
                    }}
                    onCancel={() => setShowExpandConfirm(false)}
                />
            )}
        </div>
    );
});
