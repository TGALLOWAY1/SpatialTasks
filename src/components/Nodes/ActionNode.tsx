import { memo, useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps, NodeResizeControl } from 'reactflow';
import { ImageAttachment, Node } from '../../types';
import { CheckCircle2, Circle, Clock, Lock, Pencil, GripVertical, StickyNote, SkipForward, Image as ImageIcon } from 'lucide-react';
import { NotesEditor } from './NotesEditor';
import { ImagesEditor } from './ImagesEditor';
import { clsx } from 'clsx';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { isNodeBlocked, isNodeActionable } from '../../utils/logic';
import { useDeviceDetect } from '../../hooks/useDeviceDetect';

const MIN_WIDTH = 140;
const MAX_WIDTH = 500;

const StatusIcon = ({ status, blocked }: { status?: string, blocked?: boolean }) => {
    if (blocked) return <Lock className="w-4 h-4 text-gray-500" />;
    switch (status) {
        case 'done': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
        case 'in_progress': return <Clock className="w-4 h-4 text-blue-400" />;
        default: return <Circle className="w-4 h-4 text-gray-500" />;
    }
};

export const ActionNode = memo(({ data, selected }: NodeProps<Node>) => {
    const { isTouchDevice } = useDeviceDetect();
    const activeGraphId = useWorkspaceStore(state => state.activeGraphId);
    const graphs = useWorkspaceStore(state => state.graphs);
    const executionMode = useWorkspaceStore(state => state.executionMode);
    const cycleNodeStatus = useWorkspaceStore(state => state.cycleNodeStatus);
    const updateNode = useWorkspaceStore(state => state.updateNode);
    const dispatchCanvasAction = useWorkspaceStore(state => state.dispatchCanvasAction);
    const autoEditNodeId = useWorkspaceStore(state => state.autoEditNodeId);
    const setAutoEditNodeId = useWorkspaceStore(state => state.setAutoEditNodeId);

    const [editing, setEditing] = useState(false);
    const [editValue, setEditValue] = useState(data.title);
    const [showNotes, setShowNotes] = useState(false);

    // Track previous selected state for click-to-edit gating
    const wasSelectedRef = useRef(selected);
    useEffect(() => {
        wasSelectedRef.current = selected;
    }, [selected]);

    // Auto-enter edit mode for newly created nodes
    useEffect(() => {
        if (autoEditNodeId === data.id) {
            setEditing(true);
            setEditValue(data.title);
            setAutoEditNodeId(null);
        }
    }, [autoEditNodeId, data.id, data.title, setAutoEditNodeId]);

    const { isBlocked, isActionable } = useMemo(() => {
        const graphId = activeGraphId ?? data.graphId;
        const graph = graphId ? graphs[graphId] : undefined;
        if (!graph) return { isBlocked: false, isActionable: false };
        return {
            isBlocked: isNodeBlocked(data, graph, graphs),
            isActionable: isNodeActionable(data, graph, graphs),
        };
    }, [data, activeGraphId, graphs]);

    const highlight = executionMode && isActionable;
    const dim = executionMode && !isActionable;

    const nodeWidth = data.width ?? 200;

    const handleStatusClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (isBlocked) return;
        cycleNodeStatus(data.id);
        try { navigator.vibrate(10); } catch {}
    }, [isBlocked, cycleNodeStatus, data.id]);

    const save = useCallback(() => {
        if (editValue.trim() && editValue.trim() !== data.title) {
            updateNode(data.id, { title: editValue.trim() });
        }
        setEditing(false);
    }, [editValue, data.title, data.id, updateNode]);

    const startEditing = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setEditing(true);
        setEditValue(data.title);
    }, [data.title]);

    const handleTitleClick = useCallback((e: React.MouseEvent) => {
        // Only enter edit mode if the node was already selected before this click
        if (wasSelectedRef.current) {
            startEditing(e);
        }
    }, [startEditing]);

    const handleResize = useCallback((_event: any, params: { width: number }) => {
        updateNode(data.id, { width: Math.round(params.width) });
    }, [data.id, updateNode]);

    const handleSaveNotes = useCallback((notes: string) => {
        updateNode(data.id, { meta: { ...data.meta, notes } });
    }, [data.id, data.meta, updateNode]);

    const imagesOpen = data.meta?.imagesOpen ?? false;
    const imagesCount = data.meta?.images?.length ?? 0;

    const toggleImagesOpen = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        updateNode(data.id, { meta: { ...data.meta, imagesOpen: !imagesOpen } });
    }, [data.id, data.meta, imagesOpen, updateNode]);

    const handleSaveImages = useCallback((next: ImageAttachment[]) => {
        updateNode(data.id, { meta: { ...data.meta, images: next } });
    }, [data.id, data.meta, updateNode]);

    const handleCloseImages = useCallback(() => {
        updateNode(data.id, { meta: { ...data.meta, imagesOpen: false } });
    }, [data.id, data.meta, updateNode]);

    return (
        <div
            className={clsx(
                "px-4 py-2 rounded-lg shadow-lg border-2 transition-[transform,opacity,border-color,box-shadow] duration-200 relative cursor-grab active:cursor-grabbing",
                selected ? "border-purple-500 shadow-purple-500/20" : "border-slate-700",
                isBlocked ? "bg-slate-900 border-slate-800 opacity-80" : "bg-slate-800",
                data.status === 'done' && "opacity-75",
                highlight && "ring-4 ring-amber-500/50 border-amber-500 shadow-amber-500/20 scale-105 z-10",
                dim && "opacity-30 blur-[1px] grayscale",
                (data as any)._isConnectSource && "ring-4 ring-purple-500 animate-pulse"
            )}
            style={{ width: nodeWidth, minWidth: MIN_WIDTH, maxWidth: MAX_WIDTH }}
        >
            {/* Resize handle — right edge */}
            <NodeResizeControl
                minWidth={MIN_WIDTH}
                maxWidth={MAX_WIDTH}
                position="right"
                onResize={handleResize}
                style={{
                    background: 'transparent',
                    border: 'none',
                    width: 12,
                    height: '100%',
                    right: -6,
                    top: 0,
                    cursor: 'ew-resize',
                }}
            >
                {selected && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-500 opacity-60">
                        <GripVertical className="w-3 h-3" />
                    </div>
                )}
            </NodeResizeControl>

            <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-slate-400 !top-1/2 !-translate-y-1/2" />

            <div className="flex items-start gap-2">
                <button
                    onClick={handleStatusClick}
                    className={clsx(
                        "flex-shrink-0 hover:scale-125 transition-transform touch:min-h-[44px] touch:min-w-[44px] touch:flex touch:items-center touch:justify-center mt-0.5",
                        isBlocked ? "cursor-not-allowed" : "cursor-pointer"
                    )}
                    title={isBlocked ? "Blocked" : "Click to cycle status"}
                >
                    <StatusIcon status={data.status} blocked={isBlocked} />
                </button>
                {editing ? (
                    <textarea
                        className="bg-transparent border-b border-slate-500 outline-none text-sm text-slate-200 w-full resize-none"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save(); }
                            if (e.key === 'Escape') { e.stopPropagation(); setEditing(false); }
                        }}
                        onFocus={e => e.target.select()}
                        onBlur={save}
                        onMouseDown={e => e.stopPropagation()}
                        onClick={e => e.stopPropagation()}
                        rows={2}
                        autoFocus
                    />
                ) : (
                    <span
                        className={clsx(
                            "font-medium text-sm text-slate-200 break-words whitespace-pre-wrap cursor-text group/title relative flex-1 px-0.5 rounded focus-within:bg-slate-700/40 hover:bg-slate-700/30 transition-colors",
                            data.status === 'done' && "line-through text-slate-400",
                            isBlocked && "text-slate-500",
                            highlight && "text-amber-100 font-bold"
                        )}
                        onDoubleClick={startEditing}
                        onClick={handleTitleClick}
                        title="Click to edit"
                    >
                        {data.title}
                        <Pencil className="w-3 h-3 text-slate-500 opacity-0 group-hover/title:opacity-100 inline-block ml-1 align-middle transition-opacity" />
                    </span>
                )}
            </div>

            {/* Touch: floating Edit button when selected */}
            {selected && isTouchDevice && !editing && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setEditing(true);
                        setEditValue(data.title);
                    }}
                    className="absolute -top-10 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1 min-h-[32px] active:bg-purple-500 z-20"
                >
                    <Pencil className="w-3 h-3" />
                    Edit
                </button>
            )}

            {/* Notes icon — only visible when selected */}
            {selected && (
                <button
                    onClick={(e) => { e.stopPropagation(); setShowNotes(v => !v); }}
                    className={clsx(
                        "absolute -bottom-2 -right-2 rounded-full flex items-center justify-center shadow-md transition-colors z-20",
                        isTouchDevice ? "w-9 h-9 -bottom-3 -right-3" : "w-6 h-6",
                        data.meta?.notes
                            ? "bg-amber-600 text-amber-100 hover:bg-amber-500"
                            : "bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200"
                    )}
                    title={data.meta?.notes ? "View notes" : "Add notes"}
                >
                    <StickyNote className={isTouchDevice ? "w-4 h-4" : "w-3 h-3"} />
                </button>
            )}

            {/* Images icon — only visible when selected */}
            {selected && (
                <button
                    onClick={toggleImagesOpen}
                    className={clsx(
                        "absolute rounded-full flex items-center justify-center shadow-md transition-colors z-20",
                        isTouchDevice ? "w-9 h-9 -bottom-3 -left-3" : "w-6 h-6 -bottom-2 -left-2",
                        imagesCount > 0
                            ? "bg-blue-600 text-blue-100 hover:bg-blue-500"
                            : "bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200"
                    )}
                    title={imagesCount > 0 ? `View images (${imagesCount})` : "Add images"}
                    aria-label={imagesCount > 0 ? `View ${imagesCount} images` : "Add images"}
                    aria-pressed={imagesOpen}
                >
                    <ImageIcon className={isTouchDevice ? "w-4 h-4" : "w-3 h-3"} />
                </button>
            )}

            {showNotes && (
                <NotesEditor
                    notes={data.meta?.notes ?? ''}
                    onSave={handleSaveNotes}
                    onClose={() => setShowNotes(false)}
                />
            )}

            {imagesOpen && (
                <ImagesEditor
                    images={data.meta?.images ?? []}
                    onChange={handleSaveImages}
                    onClose={handleCloseImages}
                    canEdit={!!selected}
                />
            )}

            {isBlocked && (
                <div className="absolute -top-2 -right-2 bg-red-900/80 text-red-200 text-[10px] px-1.5 py-0.5 rounded-full border border-red-800">
                    Blocked
                </div>
            )}

            {highlight && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        // Mark this node as done
                        updateNode(data.id, { status: 'done' });
                        // Haptic feedback
                        try { navigator.vibrate(10); } catch {}
                        // Trigger canvas to zoom to next actionable node
                        dispatchCanvasAction({ type: 'advance-next', fromNodeId: data.id });
                    }}
                    className="absolute -top-3 -right-2 bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1 hover:bg-amber-400 active:scale-95 transition-transform z-20 min-h-[28px]"
                >
                    <SkipForward className="w-3 h-3" />
                    Next
                </button>
            )}

            <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-slate-400 !top-1/2 !-translate-y-1/2" />
        </div>
    );
});
