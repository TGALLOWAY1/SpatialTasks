import React, { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { Wand2, Grid3x3, Network, ArrowDown, ArrowRight } from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import type { LayoutStrategy, LayoutOrientation } from '../../layout/layoutTypes';

interface StrategyDef {
    id: LayoutStrategy;
    label: string;
    description: string;
    icon: React.ReactNode;
}

const STRATEGIES: StrategyDef[] = [
    { id: 'tidy', label: 'Tidy', description: 'Hierarchy when edges exist; otherwise grid by group', icon: <Network className="w-4 h-4" /> },
    { id: 'grid', label: 'Grid', description: 'Clean rows and columns by current position',          icon: <Grid3x3 className="w-4 h-4" /> },
];

interface Props {
    /** Render as a compact button suitable for a toolbar. */
    compact?: boolean;
}

/**
 * Toolbar-anchored popover for Auto-Organize. Two strategies plus a top-down /
 * left-right orientation toggle that applies to Tidy. Remembers the last-used
 * strategy and orientation in settings.
 */
export const LayoutMenu: React.FC<Props> = ({ compact = true }) => {
    const [open, setOpen] = useState(false);
    const [selectionOnly, setSelectionOnly] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    const dispatchCanvasAction = useWorkspaceStore(s => s.dispatchCanvasAction);
    const updateSettings = useWorkspaceStore(s => s.updateSettings);
    const preferred = useWorkspaceStore(s => s.settings.preferredLayoutStrategy);
    const orientation: LayoutOrientation = useWorkspaceStore(s => s.settings.preferredLayoutOrientation) ?? 'top-down';
    const hasSelection = useWorkspaceStore(s => s._hasSelection);

    useEffect(() => {
        if (!open) return;
        const handler = (e: Event) => {
            if (rootRef.current && !rootRef.current.contains(e.target as HTMLElement)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        document.addEventListener('touchstart', handler);
        return () => {
            document.removeEventListener('mousedown', handler);
            document.removeEventListener('touchstart', handler);
        };
    }, [open]);

    const setOrientation = (o: LayoutOrientation) => {
        updateSettings({ preferredLayoutOrientation: o });
    };

    const apply = (strategy: LayoutStrategy) => {
        // Selection is held by ReactFlow; empty-array nodeIds is a sentinel
        // telling CanvasArea to substitute the currently selected node IDs.
        const nodeIds = selectionOnly && hasSelection ? [] : undefined;
        updateSettings({ preferredLayoutStrategy: strategy });
        dispatchCanvasAction({
            type: 'auto-organize',
            strategy,
            orientation: strategy === 'tidy' ? orientation : undefined,
            nodeIds,
        });
        setOpen(false);
    };

    return (
        <div className="relative" ref={rootRef}>
            <button
                onClick={() => setOpen(o => !o)}
                className={clsx(
                    compact
                        ? 'p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors'
                        : 'flex items-center gap-3 w-full px-4 py-3 text-sm text-left text-gray-300 hover:bg-gray-700 transition-colors',
                    'touch:min-h-[44px] touch:min-w-[44px] touch:flex touch:items-center touch:justify-center',
                )}
                title="Auto-Organize canvas"
                aria-label="Auto-Organize canvas"
            >
                <Wand2 className="w-4 h-4 flex-shrink-0" />
                {!compact && <span>Auto-Organize</span>}
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-1 min-w-[260px]">
                    <div className="px-3 py-2 text-xs uppercase tracking-wide text-gray-500">
                        Auto-Organize
                    </div>
                    {STRATEGIES.map(s => (
                        <button
                            key={s.id}
                            onClick={() => apply(s.id)}
                            className={clsx(
                                'flex items-start gap-3 w-full px-3 py-2.5 text-left hover:bg-gray-700 transition-colors',
                                preferred === s.id ? 'text-white' : 'text-gray-300',
                            )}
                        >
                            <span className="mt-0.5 flex-shrink-0 text-gray-400">{s.icon}</span>
                            <span className="flex-1 min-w-0">
                                <span className="text-sm font-medium">{s.label}</span>
                                {preferred === s.id && (
                                    <span className="ml-2 text-[10px] uppercase tracking-wide text-purple-400">Last used</span>
                                )}
                                <span className="block text-xs text-gray-500 truncate">{s.description}</span>
                            </span>
                        </button>
                    ))}

                    <div className="border-t border-gray-700 my-1" />
                    <div className="px-3 py-2">
                        <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Tidy direction</div>
                        <div className="flex gap-1 bg-gray-900 rounded p-0.5">
                            <button
                                onClick={() => setOrientation('top-down')}
                                className={clsx(
                                    'flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors',
                                    orientation === 'top-down' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200',
                                )}
                                aria-pressed={orientation === 'top-down'}
                            >
                                <ArrowDown className="w-3 h-3" /> Top-down
                            </button>
                            <button
                                onClick={() => setOrientation('left-right')}
                                className={clsx(
                                    'flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors',
                                    orientation === 'left-right' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200',
                                )}
                                aria-pressed={orientation === 'left-right'}
                            >
                                <ArrowRight className="w-3 h-3" /> Left-right
                            </button>
                        </div>
                    </div>

                    {hasSelection && (
                        <>
                            <div className="border-t border-gray-700 my-1" />
                            <label className="flex items-center gap-2 px-3 py-2 text-xs text-gray-300 cursor-pointer hover:bg-gray-700">
                                <input
                                    type="checkbox"
                                    checked={selectionOnly}
                                    onChange={e => setSelectionOnly(e.target.checked)}
                                    className="accent-purple-500"
                                />
                                Apply to selection only
                            </label>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
