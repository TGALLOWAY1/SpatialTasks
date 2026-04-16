import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, X } from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import type { BlockingNodeInfo } from '../../utils/logic';

const DISMISS_AFTER_MS = 4000;
const PULSE_CLASS = 'blocker-pulse';

interface BlockedSpotlightProps {
    sourceNodeId: string;
    blockers: BlockingNodeInfo[];
    /** Map of blocker node id → display title (prefetched by caller from graph). */
    titles: Record<string, string>;
    isSmallScreen: boolean;
    onDismiss: () => void;
    onJumpTo: (blockerId: string) => void;
}

/**
 * Red pulse rings on blocker nodes + a chip bar under the selected node
 * (or a bottom sheet on small screens) listing the blockers.
 * Auto-dismisses after 4s or on Esc.
 */
export function BlockedSpotlight({
    sourceNodeId,
    blockers,
    titles,
    isSmallScreen,
    onDismiss,
    onJumpTo,
}: BlockedSpotlightProps) {
    const [sourceRect, setSourceRect] = useState<DOMRect | null>(null);

    // Apply pulse class to blocker DOM nodes while the spotlight is active.
    useEffect(() => {
        const added: Element[] = [];
        for (const b of blockers) {
            const el = document.querySelector(`.react-flow__node[data-id="${cssEscape(b.nodeId)}"]`);
            if (el) {
                el.classList.add(PULSE_CLASS);
                added.push(el);
            }
        }
        return () => {
            for (const el of added) el.classList.remove(PULSE_CLASS);
        };
    }, [blockers]);

    // Esc-to-dismiss + auto-dismiss timer.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onDismiss();
            }
        };
        const timer = window.setTimeout(onDismiss, DISMISS_AFTER_MS);
        document.addEventListener('keydown', onKey, true);
        return () => {
            window.clearTimeout(timer);
            document.removeEventListener('keydown', onKey, true);
        };
    }, [onDismiss]);

    // Track the source node's on-screen rect during and after fitView animation.
    useEffect(() => {
        if (isSmallScreen) return;
        const read = () => {
            const el = document.querySelector(`.react-flow__node[data-id="${cssEscape(sourceNodeId)}"]`);
            if (el) setSourceRect(el.getBoundingClientRect());
        };
        // Read immediately, then poll for the duration of the fitView animation.
        read();
        const interval = window.setInterval(read, 50);
        const stop = window.setTimeout(() => window.clearInterval(interval), 600);
        return () => {
            window.clearInterval(interval);
            window.clearTimeout(stop);
        };
    }, [sourceNodeId, isSmallScreen]);

    if (isSmallScreen) {
        return createPortal(<BottomSheet blockers={blockers} titles={titles} onDismiss={onDismiss} onJumpTo={onJumpTo} />, document.body);
    }

    if (!sourceRect) return null;

    return createPortal(
        <ChipBar
            blockers={blockers}
            titles={titles}
            sourceRect={sourceRect}
            onDismiss={onDismiss}
            onJumpTo={onJumpTo}
        />,
        document.body,
    );
}

interface BarProps {
    blockers: BlockingNodeInfo[];
    titles: Record<string, string>;
    onDismiss: () => void;
    onJumpTo: (blockerId: string) => void;
}

function ChipBar({ sourceRect, blockers, titles, onDismiss, onJumpTo }: BarProps & { sourceRect: DOMRect }) {
    const top = sourceRect.bottom + 8;
    const left = Math.max(12, Math.min(window.innerWidth - 12, sourceRect.left + sourceRect.width / 2));

    return (
        <div
            role="group"
            aria-label="Blockers"
            className="fixed z-[90] -translate-x-1/2 flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-slate-900/95 border border-red-700/70 shadow-[0_4px_20px_rgba(0,0,0,0.6)] animate-slide-in-left"
            style={{ top, left, maxWidth: 'calc(100vw - 24px)' }}
            onMouseDown={e => e.stopPropagation()}
        >
            <span className="text-[11px] text-red-200 font-medium whitespace-nowrap pl-1">Blocked by</span>
            <div className="flex items-center gap-1 flex-wrap">
                {blockers.map(b => (
                    <BlockerChip key={b.nodeId} blocker={b} title={titles[b.nodeId]} onJumpTo={onJumpTo} />
                ))}
            </div>
            <button
                onClick={onDismiss}
                aria-label="Dismiss blockers hint"
                className="ml-1 p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 touch:min-h-[44px] touch:min-w-[44px]"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

function BottomSheet({ blockers, titles, onDismiss, onJumpTo }: BarProps) {
    return (
        <div className="fixed inset-x-0 bottom-0 z-[90] bg-slate-900 border-t border-red-700/60 shadow-[0_-4px_20px_rgba(0,0,0,0.6)] animate-slide-in" style={{ paddingBottom: 'calc(12px + var(--sab, 0px))' }}>
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <h3 className="text-sm font-semibold text-red-200">Blocked by</h3>
                <button
                    onClick={onDismiss}
                    aria-label="Dismiss blockers hint"
                    className="p-2 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
            <ul className="px-3 pb-3 flex flex-col gap-1.5">
                {blockers.map(b => (
                    <li key={b.nodeId}>
                        <button
                            onClick={() => onJumpTo(b.nodeId)}
                            className="w-full min-h-[44px] flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-left border border-slate-700"
                        >
                            <span className="text-sm text-slate-100 truncate">{formatBlockerLabel(b, titles[b.nodeId])}</span>
                            <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function BlockerChip({ blocker, title, onJumpTo }: { blocker: BlockingNodeInfo; title?: string; onJumpTo: (id: string) => void }) {
    return (
        <button
            onClick={() => onJumpTo(blocker.nodeId)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-900/40 border border-red-700/60 text-[11px] text-red-100 hover:bg-red-900/70 hover:border-red-600 max-w-[220px] touch:min-h-[32px]"
            title={`Jump to "${title ?? 'blocker'}"`}
        >
            <span className="truncate">{formatBlockerLabel(blocker, title)}</span>
        </button>
    );
}

function formatBlockerLabel(b: BlockingNodeInfo, title?: string): string {
    const safeTitle = title ?? '…';
    if (b.reason === 'partial-container' && typeof b.progress === 'number') {
        const pct = Math.round(b.progress * 100);
        return `${safeTitle} (${pct}%)`;
    }
    return safeTitle;
}

/** Minimal CSS selector escape for node UUIDs (safe subset — alnum + dash). */
function cssEscape(id: string): string {
    return id.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

// Re-export to keep callers terse.
export function useBlockingTitles(blockers: BlockingNodeInfo[]): Record<string, string> {
    const graphs = useWorkspaceStore(s => s.graphs);
    const activeGraphId = useWorkspaceStore(s => s.activeGraphId);
    return useMemo(() => {
        const graph = activeGraphId ? graphs[activeGraphId] : undefined;
        if (!graph) return {};
        const out: Record<string, string> = {};
        for (const b of blockers) {
            const node = graph.nodes.find(n => n.id === b.nodeId);
            if (node) out[b.nodeId] = node.title;
        }
        return out;
    }, [blockers, graphs, activeGraphId]);
}
