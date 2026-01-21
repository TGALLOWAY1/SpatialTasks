import React, { memo, useMemo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Node } from '../../types';
import { Layers, ArrowRightCircle, PieChart, ArrowBigRightDash } from 'lucide-react';
import { clsx } from 'clsx';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { getContainerProgress, isNodeBlocked } from '../../utils/logic';

const ProgressRing = ({ progress }: { progress: number }) => {
    const percentage = Math.round(progress * 100);
    return (
        <div className="flex items-center gap-1.5 text-[10px] text-indigo-300 bg-indigo-900/50 px-1.5 py-0.5 rounded-full border border-indigo-800">
            <PieChart className="w-3 h-3" />
            <span>{percentage}%</span>
        </div>
    );
};

export const ContainerNode = memo(({ data, selected }: NodeProps<Node>) => {
    const enterGraph = useWorkspaceStore(state => state.enterGraph);
    const activeGraphId = useWorkspaceStore(state => state.activeGraphId);
    const graphs = useWorkspaceStore(state => state.graphs);
    const executionMode = useWorkspaceStore(state => state.executionMode);

    const progress = useMemo(() => {
        return getContainerProgress(data, { graphs } as any);
    }, [data, graphs]);

    const { isBlocked, isActionable } = useMemo(() => {
        const blocked = activeGraphId ? isNodeBlocked(data, graphs[activeGraphId]) : false;
        // Container is actionable if not blocked and not 100% done
        return {
            isBlocked: blocked,
            isActionable: !blocked && progress < 1
        };
    }, [data, activeGraphId, graphs, progress]);

    const highlight = executionMode && isActionable;
    const dim = executionMode && !isActionable;

    const handleEnter = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (data.childGraphId) {
            enterGraph(data.childGraphId, data.id, data.title);
        }
    };

    return (
        <div className={clsx(
            "px-4 py-3 rounded-lg shadow-xl border-2 w-[200px] bg-indigo-950 transition-all group relative",
            selected ? "border-indigo-400 shadow-indigo-500/30" : "border-indigo-800",
            highlight && "ring-4 ring-amber-500/50 border-amber-500 shadow-amber-500/20 scale-105 z-10",
            dim && "opacity-30 blur-[1px] grayscale"
        )}>
            <Handle type="target" position={Position.Left} className="w-3 h-3 bg-indigo-400" />

            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between border-b border-indigo-800 pb-2 mb-1">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <Layers className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                        <span className="font-bold text-sm text-indigo-100 truncate">
                            {data.title}
                        </span>
                    </div>
                    {highlight && <ArrowBigRightDash className="w-4 h-4 text-amber-500 animate-pulse" />}
                </div>

                <div className="flex justify-between items-center">
                    <ProgressRing progress={progress} />

                    <button
                        onClick={handleEnter}
                        className="opacity-100 text-indigo-200 hover:text-white hover:scale-110 transition-all flex items-center justify-center"
                        title="Enter Subgraph"
                    >
                        <ArrowRightCircle className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {highlight && (
                <div className="absolute -top-3 -right-2 bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full animate-bounce shadow-lg z-20">
                    Dive In
                </div>
            )}

            {/* Progress bar visual at bottom */}
            <div className="absolute bottom-0 left-0 h-1 bg-indigo-900 w-full rounded-b-lg overflow-hidden">
                <div
                    className="h-full bg-indigo-400 transition-all duration-500 shadow-[0_0_8px_rgba(129,140,248,0.5)]"
                    style={{ width: `${progress * 100}%` }}
                />
            </div>

            <Handle type="source" position={Position.Right} className="w-3 h-3 bg-indigo-400" />
        </div>
    );
});
