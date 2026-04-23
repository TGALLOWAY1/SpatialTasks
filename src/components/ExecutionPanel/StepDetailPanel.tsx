import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useDeviceDetect } from '../../hooks/useDeviceDetect';
import { useKeyboardOffset } from '../../hooks/useKeyboardOffset';
import { ConfirmModal } from '../UI/ConfirmModal';
import { isNodeBlocked } from '../../utils/logic';
import { Markdown, extractMarkdownLinks } from '../../utils/markdownRender';
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
    Pencil,
    Check,
    X,
} from 'lucide-react';

type PanelView = 'tasks' | 'notes';

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
    const keyboardOffset = useKeyboardOffset();
    const executionMode = useWorkspaceStore(state => state.executionMode);
    const navStack = useWorkspaceStore(state => state.navStack);
    const graphs = useWorkspaceStore(state => state.graphs);
    const activeGraphId = useWorkspaceStore(state => state.activeGraphId);
    const cycleNodeStatus = useWorkspaceStore(state => state.cycleNodeStatus);
    const batchUpdateNodes = useWorkspaceStore(state => state.batchUpdateNodes);
    const updateNode = useWorkspaceStore(state => state.updateNode);
    const navigateBack = useWorkspaceStore(state => state.navigateBack);
    const dispatchCanvasAction = useWorkspaceStore(state => state.dispatchCanvasAction);

    const [collapsed, setCollapsed] = useState(false);
    const [view, setView] = useState<PanelView>('tasks');
    const [showVerification, setShowVerification] = useState(true);
    const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
    const [editingNotes, setEditingNotes] = useState(false);
    const [draftNotes, setDraftNotes] = useState('');
    const editTextareaRef = useRef<HTMLTextAreaElement>(null);

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
            id: containerNode.id,
            graphId: parentEntry.graphId,
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
                blocked: isNodeBlocked(n, graph, graphs),
            }));
    }, [activeGraphId, graphs]);

    const progress = useMemo(() => {
        if (substeps.length === 0) return 0;
        const done = substeps.filter(s => s.status === 'done').length;
        return done / substeps.length;
    }, [substeps]);

    const doneCount = substeps.filter(s => s.status === 'done').length;
    const totalCount = substeps.length;

    // Reset edit mode when the active container changes
    const parentId = parentInfo?.id ?? null;
    useEffect(() => {
        setEditingNotes(false);
        setDraftNotes('');
    }, [parentId]);

    useEffect(() => {
        if (editingNotes) {
            editTextareaRef.current?.focus();
        }
    }, [editingNotes]);

    const handleCycleStatus = useCallback((nodeId: string, blocked: boolean) => {
        if (blocked) return;
        cycleNodeStatus(nodeId);
        try { navigator.vibrate(10); } catch {/* not supported */}
    }, [cycleNodeStatus]);

    const handleCompleteAndMoveOn = useCallback(() => {
        if (!activeGraphId) return;
        const graph = graphs[activeGraphId];
        if (!graph) return;

        const containerNodeId = navStack[navStack.length - 1]?.nodeId;

        const notDoneIds = graph.nodes
            .filter(n => n.type === 'action' && n.status !== 'done')
            .map(n => n.id);

        if (notDoneIds.length > 0) {
            batchUpdateNodes(notDoneIds, { status: 'done' });
        }

        navigateBack(1);

        setTimeout(() => {
            if (containerNodeId) {
                dispatchCanvasAction({ type: 'advance-next', fromNodeId: containerNodeId });
            }
        }, 150);
    }, [activeGraphId, graphs, batchUpdateNodes, navigateBack, navStack, dispatchCanvasAction]);

    const handleStartEditNotes = useCallback(() => {
        setDraftNotes(parentInfo?.notes ?? '');
        setEditingNotes(true);
    }, [parentInfo?.notes]);

    const handleSaveNotes = useCallback(() => {
        if (!parentInfo) return;
        const parentGraph = graphs[parentInfo.graphId];
        const currentMeta = parentGraph?.nodes.find(n => n.id === parentInfo.id)?.meta ?? {};
        updateNode(
            parentInfo.id,
            { meta: { ...currentMeta, notes: draftNotes } },
            parentInfo.graphId
        );
        setEditingNotes(false);
    }, [parentInfo, draftNotes, updateNode, graphs]);

    const handleCancelEditNotes = useCallback(() => {
        setEditingNotes(false);
        setDraftNotes('');
    }, []);

    // Don't show unless in execution mode and inside a container
    if (!executionMode || navStack.length < 2) return null;

    const hasContent =
        parentInfo && (parentInfo.notes || parentInfo.verification || substeps.length > 0);
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
                <span className="text-xs font-medium" style={{ writingMode: 'vertical-rl' }}>
                    Step Details
                </span>
            </button>
        );
    }

    const detectedLinks = useMemo(
        () => (view === 'notes' ? extractMarkdownLinks(parentInfo?.notes ?? '') : []),
        [view, parentInfo?.notes]
    );

    return (
        <div
            className={clsx(
                'absolute z-30 flex flex-col bg-gray-900/95 backdrop-blur-sm border border-amber-700/50 shadow-2xl overflow-hidden',
                isMobile
                    ? 'bottom-0 left-0 right-0 rounded-t-xl'
                    : 'top-4 right-4 rounded-xl w-80'
            )}
            style={
                isMobile
                    ? {
                          // Lift the panel above the on-screen keyboard when it's open;
                          // otherwise sit at the layout viewport bottom (className handles
                          // the safe-area gutter via paddingBottom on the footer).
                          bottom: keyboardOffset > 0 ? keyboardOffset : undefined,
                          // Use dynamic viewport so iOS URL bar collapse/expand doesn't
                          // clip the panel. Reserve space above for canvas breathing room
                          // and account for the keyboard when it's open.
                          maxHeight: `calc(100dvh - 5rem - ${keyboardOffset}px)`,
                      }
                    : { maxHeight: 'calc(100dvh - 2rem)' }
            }
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

                {/* View switcher */}
                <div
                    className="mt-2.5 flex items-center bg-gray-900/70 border border-amber-900/40 rounded-lg p-0.5"
                    role="tablist"
                    aria-label="Execute mode view"
                >
                    <button
                        role="tab"
                        aria-selected={view === 'tasks'}
                        onClick={() => setView('tasks')}
                        className={clsx(
                            'flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-md transition-colors',
                            view === 'tasks'
                                ? 'bg-amber-600 text-black'
                                : 'text-amber-300/80 hover:text-amber-100'
                        )}
                    >
                        <ListChecks className="w-3.5 h-3.5" />
                        Tasks
                    </button>
                    <button
                        role="tab"
                        aria-selected={view === 'notes'}
                        onClick={() => setView('notes')}
                        className={clsx(
                            'flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-md transition-colors',
                            view === 'notes'
                                ? 'bg-amber-600 text-black'
                                : 'text-amber-300/80 hover:text-amber-100'
                        )}
                    >
                        <StickyNote className="w-3.5 h-3.5" />
                        Notes
                    </button>
                </div>
            </div>

            {/* Scrollable content — `min-h-0` lets the flex child shrink so the inner
                scroll actually engages instead of pushing the footer off-screen. */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
                {view === 'tasks' && (
                    <>
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
                                    <div className="text-xs text-amber-200 leading-relaxed bg-amber-900/20 rounded-lg p-2.5 border border-amber-800/50">
                                        <Markdown source={parentInfo.verification} />
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {view === 'notes' && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                <StickyNote className="w-3 h-3" />
                                Notes
                            </div>
                            {!editingNotes && (
                                <button
                                    onClick={handleStartEditNotes}
                                    className="flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-300 hover:text-amber-200 hover:bg-slate-800/70 transition-colors"
                                    title="Edit notes"
                                >
                                    <Pencil className="w-3 h-3" />
                                    Edit
                                </button>
                            )}
                        </div>

                        {editingNotes ? (
                            <div className="space-y-2">
                                <textarea
                                    ref={editTextareaRef}
                                    value={draftNotes}
                                    onChange={e => setDraftNotes(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Escape') {
                                            e.preventDefault();
                                            handleCancelEditNotes();
                                        }
                                        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                                            e.preventDefault();
                                            handleSaveNotes();
                                        }
                                        e.stopPropagation();
                                    }}
                                    placeholder="Add notes — supports **bold**, *italic*, `code`, [links](https://...), - lists, # headings"
                                    rows={isMobile ? 8 : 10}
                                    className="w-full bg-slate-950/60 border border-slate-700 focus:border-amber-500 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-600 outline-none resize-y font-mono leading-relaxed"
                                />
                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        onClick={handleCancelEditNotes}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveNotes}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-600 hover:bg-amber-500 text-black transition-colors"
                                    >
                                        <Check className="w-3 h-3" />
                                        Save
                                    </button>
                                </div>
                            </div>
                        ) : parentInfo?.notes ? (
                            <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50">
                                <Markdown source={parentInfo.notes} />
                            </div>
                        ) : (
                            <button
                                onClick={handleStartEditNotes}
                                className="w-full text-left bg-slate-800/30 hover:bg-slate-800/60 rounded-lg p-3 border border-dashed border-slate-700 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                            >
                                No notes yet — tap to add. Markdown formatting is supported.
                            </button>
                        )}

                        {!editingNotes && detectedLinks.length > 0 && (
                            <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                                    Links
                                </p>
                                <div className="space-y-0.5">
                                    {detectedLinks.map(url => (
                                        <a
                                            key={url}
                                            href={url}
                                            target="_blank"
                                            rel="noreferrer noopener"
                                            className="block truncate text-[11px] text-sky-400 hover:text-sky-300 underline"
                                            title={url}
                                        >
                                            {url}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer: Complete & Move On — pad bottom for iOS home indicator. */}
            <div
                className="p-3 border-t border-gray-800 shrink-0"
                style={
                    isMobile && keyboardOffset === 0
                        ? { paddingBottom: 'calc(0.75rem + var(--sab, 0px))' }
                        : undefined
                }
            >
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
