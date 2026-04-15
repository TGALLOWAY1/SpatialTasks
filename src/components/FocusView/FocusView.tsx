import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Crosshair, ChevronLeft, ChevronRight, Check, Circle, Clock, CheckCircle2,
    Pencil, SkipForward, X, ImageOff, PartyPopper,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { Node, ImageAttachment } from '../../types';
import { getActionableLeafTasks, getNextFocusTasks, FocusTaskRef } from '../../utils/logic';
import { ImageLightbox } from '../Nodes/ImageLightbox';
import { ImagesEditor } from '../Nodes/ImagesEditor';
import { useDeviceDetect } from '../../hooks/useDeviceDetect';
import { useKeyboardOffset } from '../../hooks/useKeyboardOffset';
import { ParallelChooser } from './ParallelChooser';

const STATUS_LABEL: Record<string, string> = {
    todo: 'To do',
    in_progress: 'In progress',
    done: 'Done',
};

const ADVANCE_DELAY_MS = 450;

const StatusGlyph = ({ status }: { status?: string }) => {
    if (status === 'done') return <CheckCircle2 className="w-5 h-5" />;
    if (status === 'in_progress') return <Clock className="w-5 h-5" />;
    return <Circle className="w-5 h-5" />;
};

/** Linkify URLs in plain-text notes — mirrors NotesEditor URL-detection semantics. */
const renderNotesWithLinks = (notes: string) => {
    const urlRegex = /(https?:\/\/[^\s)]+)/gi;
    const parts: Array<string | { url: string }> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = urlRegex.exec(notes)) !== null) {
        if (match.index > lastIndex) parts.push(notes.slice(lastIndex, match.index));
        parts.push({ url: match[0] });
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < notes.length) parts.push(notes.slice(lastIndex));
    return parts.map((part, i) => {
        if (typeof part === 'string') {
            return <span key={i}>{part}</span>;
        }
        return (
            <a
                key={i}
                href={part.url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-sky-300 underline hover:text-sky-200 break-all"
            >
                {part.url}
            </a>
        );
    });
};

/** Hero image carousel — swipe / arrow through multiple images, tap to open lightbox. */
const ImageHero = ({ images }: { images: ImageAttachment[] }) => {
    const [index, setIndex] = useState(0);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const touchStartX = useRef<number | null>(null);

    // Reset to first image when the underlying images change (e.g. task switch).
    useEffect(() => {
        setIndex(0);
    }, [images]);

    const hasMany = images.length > 1;
    const safeIndex = Math.min(index, images.length - 1);
    const current = images[safeIndex];

    const goPrev = useCallback(() => {
        if (!hasMany) return;
        setIndex(i => (i - 1 + images.length) % images.length);
    }, [hasMany, images.length]);

    const goNext = useCallback(() => {
        if (!hasMany) return;
        setIndex(i => (i + 1) % images.length);
    }, [hasMany, images.length]);

    const onTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };
    const onTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(dx) < 40) return;
        if (dx > 0) goPrev();
        else goNext();
    };

    if (!current) return null;

    return (
        <>
            <div
                className="relative w-full h-full bg-slate-950 flex items-center justify-center select-none"
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
            >
                <button
                    onClick={() => setLightboxIndex(safeIndex)}
                    className="block w-full h-full"
                    title="Tap to view full size"
                >
                    <img
                        src={current.dataUrl}
                        alt={current.name ?? `Image ${safeIndex + 1}`}
                        className="w-full h-full object-contain"
                    />
                </button>

                {hasMany && (
                    <>
                        <button
                            onClick={(e) => { e.stopPropagation(); goPrev(); }}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/70 text-slate-200 hover:bg-slate-800 hover:text-white min-h-[40px] min-w-[40px] flex items-center justify-center"
                            title="Previous image"
                            aria-label="Previous image"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); goNext(); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/70 text-slate-200 hover:bg-slate-800 hover:text-white min-h-[40px] min-w-[40px] flex items-center justify-center"
                            title="Next image"
                            aria-label="Next image"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                            {images.map((_, i) => (
                                <span
                                    key={i}
                                    className={clsx(
                                        'h-1.5 rounded-full transition-all',
                                        i === safeIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/40'
                                    )}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>

            {lightboxIndex !== null && (
                <ImageLightbox
                    images={images}
                    index={lightboxIndex}
                    onIndexChange={setLightboxIndex}
                    onClose={() => setLightboxIndex(null)}
                />
            )}
        </>
    );
};

interface EditModalProps {
    node: Node;
    graphId: string;
    onClose: () => void;
}

/** Combined notes + images edit modal — opens from the focus view "Edit" button. */
const EditModal = ({ node, graphId, onClose }: EditModalProps) => {
    const updateNode = useWorkspaceStore(state => state.updateNode);
    const keyboardOffset = useKeyboardOffset();
    const [notes, setNotes] = useState(node.meta?.notes ?? '');
    const [images, setImages] = useState<ImageAttachment[]>(node.meta?.images ?? []);

    const handleSave = useCallback(() => {
        updateNode(node.id, {
            meta: { ...(node.meta ?? {}), notes, images },
        }, graphId);
        onClose();
    }, [updateNode, node.id, node.meta, notes, images, graphId, onClose]);

    return (
        <div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
            onClick={onClose}
        >
            <div className="absolute inset-0 bg-black/70" />
            <div
                className="relative w-full sm:max-w-lg sm:rounded-xl rounded-t-2xl shadow-2xl border border-slate-700 bg-slate-900 p-4 max-h-[90vh] flex flex-col"
                style={{ marginBottom: keyboardOffset }}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-3 flex-shrink-0">
                    <span className="text-sm font-semibold text-slate-200">Edit Task</span>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded text-slate-400 hover:bg-slate-700 hover:text-white min-h-[36px] min-w-[36px] flex items-center justify-center"
                        aria-label="Close edit dialog"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 space-y-3">
                    <div>
                        <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-400 mb-1">
                            Notes
                        </label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Add notes…"
                            rows={6}
                            className="w-full bg-transparent border border-slate-700 rounded text-sm resize-y outline-none p-3 text-slate-200 placeholder-slate-600 focus:border-slate-500"
                            onKeyDown={e => {
                                if (e.key === 'Escape') onClose();
                                e.stopPropagation();
                            }}
                        />
                    </div>

                    <ImagesEditor
                        images={images}
                        onChange={setImages}
                        onClose={() => { /* close handled by modal X */ }}
                        canEdit
                    />
                </div>

                <button
                    onClick={handleSave}
                    className="mt-3 w-full text-sm font-medium py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white flex-shrink-0"
                >
                    Save
                </button>
            </div>
        </div>
    );
};

/**
 * Single-task focus view. Reads the active graph, finds the next actionable
 * leaf task (drilling into containers), and presents image + notes + status
 * controls. Marking a task done auto-advances; multiple successors trigger
 * the parallel chooser.
 */
export const FocusView: React.FC = () => {
    const { isTouchDevice } = useDeviceDetect();
    const activeGraphId = useWorkspaceStore(state => state.activeGraphId);
    const graphs = useWorkspaceStore(state => state.graphs);
    const focusNodeId = useWorkspaceStore(state => state.focusNodeId);
    const focusContextGraphId = useWorkspaceStore(state => state.focusContextGraphId);
    const setFocusTask = useWorkspaceStore(state => state.setFocusTask);
    const clearFocusTask = useWorkspaceStore(state => state.clearFocusTask);
    const cycleNodeStatus = useWorkspaceStore(state => state.cycleNodeStatus);
    const setViewMode = useWorkspaceStore(state => state.setViewMode);

    const activeGraph = activeGraphId ? graphs[activeGraphId] : null;

    // Pre-compute the actionable session in the current project scope.
    // Containers are flattened — only leaf action tasks are returned.
    const allActionable = useMemo<FocusTaskRef[]>(() => {
        if (!activeGraph) return [];
        return getActionableLeafTasks(activeGraph, graphs);
    }, [activeGraph, graphs]);

    // Total leaf-task count for the progress indicator (done + actionable + still-blocked).
    const totalLeafCount = useMemo(() => {
        if (!activeGraph) return 0;
        let count = 0;
        const walk = (graphId: string) => {
            const g = graphs[graphId];
            if (!g) return;
            for (const n of g.nodes) {
                if (n.type === 'action') count++;
                else if (n.type === 'container' && n.childGraphId) walk(n.childGraphId);
            }
        };
        walk(activeGraph.id);
        return count;
    }, [activeGraph, graphs]);

    const doneLeafCount = useMemo(() => {
        if (!activeGraph) return 0;
        let count = 0;
        const walk = (graphId: string) => {
            const g = graphs[graphId];
            if (!g) return;
            for (const n of g.nodes) {
                if (n.type === 'action' && n.status === 'done') count++;
                else if (n.type === 'container' && n.childGraphId) walk(n.childGraphId);
            }
        };
        walk(activeGraph.id);
        return count;
    }, [activeGraph, graphs]);

    // Local UI state
    const [parallelOptions, setParallelOptions] = useState<FocusTaskRef[] | null>(null);
    const [editing, setEditing] = useState(false);
    const [advancing, setAdvancing] = useState(false);
    const [history, setHistory] = useState<Array<{ nodeId: string; graphId: string }>>([]);
    const advanceTimerRef = useRef<number | null>(null);

    // Resolve the current focus task object — defensively, in case the underlying graph changed.
    const currentTask = useMemo<FocusTaskRef | null>(() => {
        if (!focusNodeId || !focusContextGraphId) return null;
        const g = graphs[focusContextGraphId];
        if (!g) return null;
        const node = g.nodes.find(n => n.id === focusNodeId);
        if (!node) return null;
        // Reconstruct breadcrumb for display by finding a matching entry in the actionable list.
        const match = allActionable.find(t => t.node.id === node.id && t.graphId === g.id);
        return match ?? { node, graphId: g.id, breadcrumb: [] };
    }, [focusNodeId, focusContextGraphId, graphs, allActionable]);

    // Pick the first actionable task on mount (or when graph context changes
    // and the previous focus is no longer valid / actionable).
    useEffect(() => {
        if (parallelOptions) return; // chooser visible — don't auto-pick
        if (currentTask) return;     // already have a valid focus task
        const first = allActionable[0];
        if (first) {
            setFocusTask(first.node.id, first.graphId);
        }
    }, [currentTask, allActionable, setFocusTask, parallelOptions]);

    // Cleanup any pending advance timer on unmount or task change.
    useEffect(() => {
        return () => {
            if (advanceTimerRef.current !== null) {
                window.clearTimeout(advanceTimerRef.current);
            }
        };
    }, []);

    const advanceTo = useCallback((next: FocusTaskRef) => {
        if (currentTask) {
            setHistory(h => [...h, { nodeId: currentTask.node.id, graphId: currentTask.graphId }]);
        }
        setFocusTask(next.node.id, next.graphId);
        setAdvancing(false);
    }, [currentTask, setFocusTask]);

    const handleStatusClick = useCallback(() => {
        if (!currentTask || advancing) return;
        const isDone = currentTask.node.status === 'done';
        cycleNodeStatus(currentTask.node.id, currentTask.graphId);
        if (isDone) return; // cycling done → todo, no advance

        const willBeDone = currentTask.node.status === 'in_progress';
        if (!willBeDone) return; // still going through todo → in_progress

        // We just completed the task — schedule auto-advance.
        setAdvancing(true);
        if (advanceTimerRef.current !== null) {
            window.clearTimeout(advanceTimerRef.current);
        }
        advanceTimerRef.current = window.setTimeout(() => {
            // Re-read fresh state at the moment of advancement.
            const freshState = useWorkspaceStore.getState();
            const freshActive = freshState.activeGraphId ? freshState.graphs[freshState.activeGraphId] : null;
            if (!freshActive) {
                setAdvancing(false);
                return;
            }
            const nextTasks = getNextFocusTasks(
                currentTask.node.id,
                currentTask.graphId,
                freshActive,
                freshState.graphs,
            );
            if (nextTasks.length === 0) {
                clearFocusTask();
                setAdvancing(false);
            } else if (nextTasks.length === 1) {
                advanceTo(nextTasks[0]);
            } else {
                setParallelOptions(nextTasks);
                setAdvancing(false);
            }
        }, ADVANCE_DELAY_MS);
    }, [currentTask, advancing, cycleNodeStatus, advanceTo, clearFocusTask]);

    const handleSkip = useCallback(() => {
        if (!currentTask) return;
        const next = allActionable.find(t => t.node.id !== currentTask.node.id);
        if (next) advanceTo(next);
    }, [currentTask, allActionable, advanceTo]);

    const handlePrev = useCallback(() => {
        if (history.length === 0) return;
        const last = history[history.length - 1];
        setHistory(h => h.slice(0, -1));
        setFocusTask(last.nodeId, last.graphId);
        setParallelOptions(null);
    }, [history, setFocusTask]);

    const handleChooseParallel = useCallback((task: FocusTaskRef) => {
        setParallelOptions(null);
        advanceTo(task);
    }, [advanceTo]);

    // Desktop keyboard shortcuts (mirrors common reading/queue UX).
    useEffect(() => {
        if (isTouchDevice) return;
        if (editing || parallelOptions) return;
        const handler = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLElement) {
                const tag = e.target.tagName;
                if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            }
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                handleStatusClick();
            } else if (e.key === 'ArrowRight') {
                handleSkip();
            } else if (e.key === 'ArrowLeft') {
                handlePrev();
            } else if (e.key === 'Escape') {
                setViewMode('list');
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isTouchDevice, editing, parallelOptions, handleStatusClick, handleSkip, handlePrev, setViewMode]);

    // ---------- RENDER ----------
    if (!activeGraph) {
        return (
            <div className="flex-1 h-full bg-gray-950 flex items-center justify-center text-gray-500">
                No graph selected
            </div>
        );
    }

    if (parallelOptions) {
        return (
            <ParallelChooser
                options={parallelOptions}
                onSelect={handleChooseParallel}
                onCancel={() => setParallelOptions(null)}
            />
        );
    }

    if (!currentTask) {
        // No actionable tasks left — celebrate and offer a way out.
        return (
            <div className="flex-1 h-full bg-gray-950 flex items-center justify-center px-6">
                <div className="text-center max-w-sm">
                    <PartyPopper className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-white mb-2">All tasks complete</h2>
                    <p className="text-sm text-gray-400 mb-6">
                        {totalLeafCount > 0
                            ? `You finished all ${totalLeafCount} task${totalLeafCount === 1 ? '' : 's'} in this view.`
                            : 'There are no tasks here yet.'}
                    </p>
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => setViewMode('list')}
                            className="px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium"
                        >
                            Back to list view
                        </button>
                        <button
                            onClick={() => setViewMode('graph')}
                            className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm"
                        >
                            Back to node view
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const node = currentTask.node;
    const images = node.meta?.images ?? [];
    const notes = node.meta?.notes ?? '';
    const hasImages = images.length > 0;
    const hasNotes = notes.trim().length > 0;
    const sessionIndex = doneLeafCount + 1;

    return (
        <div className="flex-1 h-full bg-gray-950 flex flex-col overflow-hidden">
            {/* Header: progress, breadcrumb, prev */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 flex-shrink-0 bg-gray-950">
                <div className="flex items-center gap-2 min-w-0">
                    <Crosshair className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span className="text-xs text-gray-400 flex-shrink-0">
                        Task {Math.min(sessionIndex, totalLeafCount)} of {totalLeafCount}
                    </span>
                    {currentTask.breadcrumb.length > 0 && (
                        <span className="text-xs text-gray-500 truncate hidden sm:inline">
                            · {currentTask.breadcrumb.join(' › ')}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handlePrev}
                        disabled={history.length === 0}
                        className="p-2 rounded text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed touch:min-h-[40px] touch:min-w-[40px] flex items-center justify-center"
                        title="Previous task (←)"
                        aria-label="Previous task"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Image hero (top half) — only when images exist */}
            {hasImages && (
                <div className="flex-shrink-0 h-[40vh] sm:h-[45vh] bg-slate-950 border-b border-gray-800">
                    <ImageHero images={images} />
                </div>
            )}

            {/* Title + notes (bottom, scrolls) */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
                <div className="max-w-2xl mx-auto">
                    <h1 className={clsx(
                        'text-xl sm:text-2xl font-semibold text-white mb-3 transition-opacity',
                        node.status === 'done' && 'opacity-60',
                    )}>
                        {node.title}
                    </h1>

                    {!hasImages && (
                        <div className="mb-4 inline-flex items-center gap-1.5 text-[11px] text-gray-500 bg-gray-900/60 border border-gray-800 rounded-full px-2.5 py-1">
                            <ImageOff className="w-3 h-3" />
                            No image for this task
                        </div>
                    )}

                    {hasNotes ? (
                        <div className="text-sm sm:text-base text-slate-200 whitespace-pre-wrap leading-relaxed">
                            {renderNotesWithLinks(notes)}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 italic">No notes for this task. Tap Edit to add some.</p>
                    )}
                </div>
            </div>

            {/* Action bar */}
            <div
                className="flex-shrink-0 border-t border-gray-800 bg-gray-950 px-4 py-3"
                style={{ paddingBottom: 'calc(0.75rem + var(--sab, 0px))' }}
            >
                <div className="max-w-2xl mx-auto flex items-center gap-2">
                    <button
                        onClick={handleStatusClick}
                        disabled={advancing}
                        className={clsx(
                            'flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all touch:min-h-[52px]',
                            advancing
                                ? 'bg-green-600 text-white scale-[0.98]'
                                : node.status === 'done'
                                    ? 'bg-green-600/90 hover:bg-green-600 text-white'
                                    : node.status === 'in_progress'
                                        ? 'bg-blue-600 hover:bg-blue-500 text-white'
                                        : 'bg-slate-700 hover:bg-slate-600 text-slate-100',
                        )}
                        title={`Status: ${STATUS_LABEL[node.status ?? 'todo']} — tap to advance`}
                    >
                        {advancing ? <Check className="w-5 h-5" /> : <StatusGlyph status={node.status} />}
                        <span className="text-sm">
                            {advancing
                                ? 'Done!'
                                : node.status === 'done'
                                    ? 'Done · tap to reopen'
                                    : node.status === 'in_progress'
                                        ? 'Mark complete'
                                        : 'Start task'}
                        </span>
                    </button>
                    <button
                        onClick={() => setEditing(true)}
                        className="px-3 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 touch:min-h-[52px] touch:min-w-[52px] flex items-center justify-center"
                        title="Edit notes & images"
                        aria-label="Edit notes and images"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleSkip}
                        disabled={allActionable.length <= 1}
                        className="px-3 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed touch:min-h-[52px] touch:min-w-[52px] flex items-center justify-center"
                        title="Skip to next task (→)"
                        aria-label="Skip to next task"
                    >
                        <SkipForward className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {editing && (
                <EditModal
                    node={node}
                    graphId={currentTask.graphId}
                    onClose={() => setEditing(false)}
                />
            )}
        </div>
    );
};
