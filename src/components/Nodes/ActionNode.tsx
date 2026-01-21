import { memo, useMemo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Node } from '../../types';
import { CheckCircle2, Circle, Clock, Lock, ArrowBigRightDash } from 'lucide-react';
import { clsx } from 'clsx';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { isNodeBlocked, isNodeActionable } from '../../utils/logic';

const StatusIcon = ({ status, blocked }: { status?: string, blocked?: boolean }) => {
    if (blocked) return <Lock className="w-4 h-4 text-gray-500" />;
    switch (status) {
        case 'done': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
        case 'in_progress': return <Clock className="w-4 h-4 text-blue-400" />;
        default: return <Circle className="w-4 h-4 text-gray-500" />;
    }
};

export const ActionNode = memo(({ data, selected }: NodeProps<Node>) => {
    const activeGraphId = useWorkspaceStore(state => state.activeGraphId);
    const graphs = useWorkspaceStore(state => state.graphs);
    const executionMode = useWorkspaceStore(state => state.executionMode);

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

    return (
        <div className={clsx(
            "px-4 py-2 rounded-lg shadow-lg border-2 w-[200px] transition-all relative",
            selected ? "border-purple-500 shadow-purple-500/20" : "border-slate-700",
            isBlocked ? "bg-slate-900 border-slate-800 opacity-80" : "bg-slate-800",
            data.status === 'done' && "opacity-75",
            highlight && "ring-4 ring-amber-500/50 border-amber-500 shadow-amber-500/20 scale-105 z-10",
            dim && "opacity-30 blur-[1px] grayscale"
        )}>
            <Handle type="target" position={Position.Left} className="w-3 h-3 bg-slate-400" />

            <div className="flex items-center gap-2">
                <StatusIcon status={data.status} blocked={isBlocked} />
                <span className={clsx(
                    "font-medium text-sm text-slate-200 truncate",
                    data.status === 'done' && "line-through text-slate-400",
                    isBlocked && "text-slate-500",
                    highlight && "text-amber-100 font-bold"
                )}>
                    {data.title}
                </span>
            </div>

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

            <Handle type="source" position={Position.Right} className="w-3 h-3 bg-slate-400" />
        </div>
    );
});
