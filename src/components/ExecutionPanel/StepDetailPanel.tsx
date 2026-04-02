import React, { useMemo, useState, useCallback } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useDeviceDetect } from '../../hooks/useDeviceDetect';
import { ConfirmModal } from '../UI/ConfirmModal';
import { isNodeBlocked } from '../../utils/logic';
import { clsx } from 'clsx';
import {
    CheckCircle2,
    Circle,
    Clock,
    Lock,
    ChevronRight,
    ChevronDown,
    ShieldCheck,
    ListChecks,
    ArrowRight,
    PanelRightClose,
    PanelRightOpen,
    StickyNote,
} from 'lucide-react';

const SubstepStatusIcon = ({ status, blocked, size = 'sm' }: { status?: string; blocked?: boolean; size?: 'sm' | 'md' }) => {
    const cls = size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
    if (blocked) return <Lock className={clsx(cls, 'text-gray-500')} />;
    switch (status) {
        case 'done':
            return <CheckCircle2 className={clsx(cls, 'text-green-400')} />;
        case 'in_progress':
            return <Clock className={clsx(cls, 'text-blue-400')} />;
        default:
            return <Circle className={clsx(cls, 'text-gray-500')} />;
    }
};

export const StepDetailPanel: React.FC = () => {
    const { isMobile } = useDeviceDetect();
    const executionMode = useWorkspaceStore(state => state.executionMode);
    const navStack = useWorkspaceStore(state => state.navStack);
    const graphs = useWorkspaceStore(state => state.graphs);
    const activeGraphId = useWorkspaceStore(state => state.activeGraphId);
    const cycleNodeStatus = useWorkspaceStore(state => state.cycleNodeStatus);
    const batchUpdateNodes = useWorkspaceStore(state => state.batchUpdateNodes);
    const navigateBack = useWorkspaceStore(state => state.navigateBack);
    const dispatchCanvasAction = useWorkspaceStore(state => state.dispatchCanvasAction);

    const [collapsed, setCollapsed] = useState(false);
    const [showDescription, setShowDescription] = useState(true);
    const [showVerification, setShowVerification] = useState(true);
    const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

    // Get parent container node info
    const parentInfo = useMemo(() => {
        if (navStack.length < 2) return null;

        const currentEntry = navStack[navStack.length - 1];
        const parentEntry = navStack[navStack.length - 2];
        const parentGraph = graphs[parentEntry.graphId];
        if (!parentGraph || !currentEntry.nodeId) return null;

        const containerNode = parentGraph.nodes.find(n => n.id === currentEntry.nodeId);
        if (!containerNode) return null;

        return {
            title: containerNode.title,
            notes: containerNode.meta?.notes || '',
            verification: containerNode.meta?.verification || '',
        };
    }, [navStack, graphs]);

    // Get child graph substeps
    const substeps = useMemo(() => {
        if (!activeGraphId) return [];
        const graph = graphs[activeGraphId];
        if (!graph) return [];

        return graph.nodes
            .filter(n => n.type === 'action')
            .map(n => ({
                ...n,
                blocked: isNodeBlocked(n, graph, { graphs } as any),
            }));
    }, [activeGraphId, graphs]);

    const progress = useMemo(() => {
        if (substeps.length === 0) return 0;
        const done = substeps.filter(s => s.status === 'done').length;
        return done / substeps.length;
    }, [substeps]);

    const doneCount = substeps.filter(s => s.status === 'done').length;
    const totalCount = substeps.length;

    const handleCycleStatus = useCallback((nodeId: string, blocked: boolean) => {
        if (blocked) return;
        // We need to temporarily set the active graph to the child graph
        // cycleNodeStatus works on the activeGraphId which IS the child graph here
        cycleNodeStatus(nodeId);
        try { navigator.vibrate(10); } catch {}
    }, [cycleNodeStatus]);

    const handleCompleteAndMoveOn = useCallback(() => {
        if (!activeGraphId) return;
        const graph = graphs[activeGraphId];
        if (!graph) return;

        // Capture container node ID before navigating back (avoids stale closure)
        const containerNodeId = navStack[navStack.length - 1]?.nodeId;

        // Mark all non-done substeps as done
        const notDoneIds = graph.nodes
            .filter(n => n.type === 'action' && n.status !== 'done')
            .map(n => n.id);

        if (notDoneIds.length > 0) {
            batchUpdateNodes(notDoneIds, { status: 'done' });
        }

        // Navigate back to parent (activeGraphId becomes parent graph)
        navigateBack(1);

        // Container completion is derived from child progress — no explicit
        // status write needed. All children are now 'done', so
        // getContainerProgress() will return 1.

        // Trigger canvas to advance to next actionable node after a short delay
        setTimeout(() => {
            if (containerNodeId) {
                dispatchCanvasAction({ type: 'advance-next', fromNodeId: containerNodeId });
            }
        }, 150);
    }, [activeGraphId, graphs, batchUpdateNodes, navigateBack, navStack, dispatchCanvasAction]);

    // Don't show unless in execution mode and inside a container
    if (!executionMode || navStack.length < 2) return null;

    // Don't show if no meaningful content
    const hasContent = parentInfo && (parentInfo.notes || parentInfo.verification || substeps.length > 0);
    if (!hasContent) return null;

    // Collapsed toggle button
    if (collapsed) {
        return (
            <button
                onClick={() => setCollapsed(false)}
                className={clsx(
                    'absolute z-30 bg-amber-900/80 border border-amber-700 text-amber-200 rounded-l-lg shadow-lg flex items-center gap-1 px-2 py-3 hover:bg-amber-800/80 transition-colors',
                    isMobile ? 'top-2 right-0' : 'top-4 right-0'
                )}
                title="Show step details"
            >
                <PanelRightOpen className="w-4 h-4" />
                <span className="text-xs font-medium writing-mode-vertical" style={{ writingMode: 'vertical-rl' }}>
                    Step Details
                </span>
            </button>
        );
    }

    return (
        <div
            className={clsx(
                'absolute z-30 flex flex-col bg-gray-900/95 backdrop-blur-sm border border-amber-700/50 shadow-2xl overflow-hidden',
                isMobile
                    ? 'bottom-0 left-0 right-0 rounded-t-xl max-h-[50vh]'
                    : 'top-4 right-4 rounded-xl w-80 max-h-[calc(100%-2rem)]'
            )}
        >
            {/* Header */}
            <div className="p-3 border-b border-amber-900/50 bg-amber-900/30 shrink-0">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <ListChecks className="w-4 h-4 text-amber-400 shrink-0" />
                        <h3 className="text-sm font-bold text-amber-100 truncate">
                            {parentInfo?.title || 'Current Step'}
                        </h3>
                    </div>
                    <button
                        onClick={() => setCollapsed(true)}
                        className="p-1 rounded text-amber-400 hover:text-amber-200 hover:bg-amber-900/50 transition-colors shrink-0"
                        title="Collapse panel"
                    >
                        <PanelRightClose className="w-4 h-4" />
                    </button>
                </div>

                {/* Progress bar */}
                <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-amber-300/70">{doneCount} of {totalCount} tasks</span>
                        <span className="text-amber-300 font-medium">{Math.round(progress * 100)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-amber-500 transition-all duration-500 rounded-full"
                            style={{ width: `${progress * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {/* Description section */}
                {parentInfo?.notes && (
                    <div>
                        <button
                            onClick={() => setShowDescription(!showDescription)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 hover:text-slate-300 transition-colors w-full"
                        >
                            {showDescription ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            <StickyNote className="w-3 h-3" />
                            Description
                        </button>
                        {showDescription && (
                            <div className="text-xs text-slate-300 leading-relaxed bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50 whitespace-pre-wrap">
                                {parentInfo.notes}
                            </div>
                        )}
                    </div>
                )}

                {/* Substep checklist */}
                {substeps.length > 0 && (
                    <div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                            <ListChecks className="w-3 h-3" />
                            Tasks
                        </div>
                        <div className="space-y-0.5">
                            {substeps.map((substep) => (
                                <button
                                    key={substep.id}
                                    onClick={() => handleCycleStatus(substep.id, substep.blocked)}
                                    className={clsx(
                                        'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors group',
                                        substep.blocked
                                            ? 'opacity-50 cursor-not-allowed'
                                            : 'hover:bg-slate-800/70 cursor-pointer',
                                        substep.status === 'done' && 'opacity-60'
                                    )}
                                >
                                    <SubstepStatusIcon status={substep.status} blocked={substep.blocked} />
                                    <span
                                        className={clsx(
                                            'text-sm flex-1',
                                            substep.status === 'done'
                                                ? 'text-slate-500 line-through'
                                                : substep.blocked
                                                    ? 'text-slate-500'
                                                    : 'text-slate-200',
                                            substep.status === 'in_progress' && 'text-blue-300 font-medium'
                                        )}
                                    >
                                        {substep.title}
                                    </span>
                                    {substep.blocked && (
                                        <span className="text-[10px] text-red-400 bg-red-900/30 px-1.5 py-0.5 rounded-full">
                                            Blocked
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Verification section */}
                {parentInfo?.verification && (
                    <div>
                        <button
                            onClick={() => setShowVerification(!showVerification)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 hover:text-slate-300 transition-colors w-full"
                        >
                            {showVerification ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            <ShieldCheck className="w-3 h-3" />
                            Verification
                        </button>
                        {showVerification && (
                            <div className="text-xs text-amber-200 leading-relaxed bg-amber-900/20 rounded-lg p-2.5 border border-amber-800/50 whitespace-pre-wrap">
                                {parentInfo.verification}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer: Complete & Move On */}
            <div className="p-3 border-t border-gray-800 shrink-0">
                <button
                    onClick={() => {
                        if (progress < 1 && totalCount - doneCount > 0) {
                            setShowCompleteConfirm(true);
                        } else {
                            handleCompleteAndMoveOn();
                        }
                    }}
                    className={clsx(
                        'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors',
                        progress >= 1
                            ? 'bg-green-600 hover:bg-green-500 text-white'
                            : 'bg-amber-600 hover:bg-amber-500 text-black'
                    )}
                >
                    {progress >= 1 ? (
                        <>
                            <CheckCircle2 className="w-4 h-4" />
                            Step Complete — Move On
                        </>
                    ) : (
                        <>
                            <ArrowRight className="w-4 h-4" />
                            Complete Step & Move On
                        </>
                    )}
                </button>
                {progress < 1 && doneCount < totalCount && (
                    <p className="text-[10px] text-slate-500 text-center mt-1">
                        This will mark {totalCount - doneCount} remaining task{totalCount - doneCount !== 1 ? 's' : ''} as done
                    </p>
                )}
            </div>

            {showCompleteConfirm && (
                <ConfirmModal
                    title="Complete Step"
                    message={`Mark ${totalCount - doneCount} remaining task${totalCount - doneCount !== 1 ? 's' : ''} as done and move on?`}
                    confirmLabel="Complete All"
                    onConfirm={() => { setShowCompleteConfirm(false); handleCompleteAndMoveOn(); }}
                    onCancel={() => setShowCompleteConfirm(false)}
                />
            )}
        </div>
    );
};
