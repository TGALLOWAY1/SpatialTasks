import { memo, useMemo, useState, useCallback } from 'react';
import { Handle, Position, NodeProps, NodeResizeControl } from 'reactflow';
import { Node } from '../../types';
import { CheckCircle2, Circle, Clock, Lock, ArrowBigRightDash, Pencil, GripVertical } from 'lucide-react';
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

    const [editing, setEditing] = useState(false);
    const [editValue, setEditValue] = useState(data.title);

    const { isBlocked, isActionable } = useMemo(() => {
        if (!activeGraphId) return { isBlocked: false, isActionable: false };
        const graph = graphs[activeGraphId];
        return {
            isBlocked: isNodeBlocked(data, graph),
            isActionable: isNodeActionable(data, graph)
        };
    }, [data, activeGraphId, graphs]);

    const highlight = executionMode && isActionable;
    const dim = executionMode && !isActionable;

    const nodeWidth = data.width ?? 200;

    const handleStatusClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (isBlocked) return;
        cycleNodeStatus(data.id);
    }, [isBlocked, cycleNodeStatus, data.id]);

    const save = useCallback(() => {
        if (editValue.trim() && editValue.trim() !== data.title) {
            updateNode(data.id, { title: editValue.trim() });
        }
        setEditing(false);
    }, [editValue, data.title, data.id, updateNode]);

    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setEditing(true);
        setEditValue(data.title);
    }, [data.title]);

    const handleResize = useCallback((_event: any, params: { width: number }) => {
        updateNode(data.id, { width: Math.round(params.width) });
    }, [data.id, updateNode]);

    return (
        <div
            className={clsx(
                "px-4 py-2 rounded-lg shadow-lg border-2 transition-[transform,opacity,border-color,box-shadow] duration-200 relative",
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
                        !isBlocked && "cursor-pointer"
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
                            if (e.key === 'Escape') setEditing(false);
                        }}
                        onBlur={save}
                        onMouseDown={e => e.stopPropagation()}
                        onClick={e => e.stopPropagation()}
                        rows={2}
                        autoFocus
                    />
                ) : (
                    <span
                        className={clsx(
                            "font-medium text-sm text-slate-200 break-words whitespace-pre-wrap cursor-text group/title relative flex-1",
                            data.status === 'done' && "line-through text-slate-400",
                            isBlocked && "text-slate-500",
                            highlight && "text-amber-100 font-bold"
                        )}
                        onDoubleClick={handleDoubleClick}
                        title="Double-click to edit"
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

            {isBlocked && (
                <div className="absolute -top-2 -right-2 bg-red-900/80 text-red-200 text-[10px] px-1.5 py-0.5 rounded-full border border-red-800">
                    Blocked
                </div>
            )}

            {highlight && (
                <div className="absolute -top-3 -right-2 bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                    Next <ArrowBigRightDash className="w-3 h-3" />
                </div>
            )}

            <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-slate-400 !top-1/2 !-translate-y-1/2" />
        </div>
    );
});
