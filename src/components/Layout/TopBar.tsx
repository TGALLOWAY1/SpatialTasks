import React, { useState, useRef, useEffect } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { ChevronRight, Home, Undo2, Redo2, Trash2, BoxSelect, Link, Menu, LayoutGrid, List, Crosshair, MoreVertical, Eye, Zap, Maximize2, Wand2, Grid3x3, Network, ArrowDown, ArrowRight } from 'lucide-react';
import type { LayoutOrientation } from '../../layout/layoutTypes';
import { clsx } from 'clsx';
import { useStore } from 'zustand';
import { useDeviceDetect } from '../../hooks/useDeviceDetect';
import { SaveIndicator } from '../UI/SaveIndicator';
import { LayoutMenu } from '../Canvas/LayoutMenu';

export const TopBar: React.FC = () => {
    const { isTouchDevice, screenSize } = useDeviceDetect();
    const isSmallScreen = screenSize === 'small';
    const navStack = useWorkspaceStore(state => state.navStack);
    const navigateToBreadcrumb = useWorkspaceStore(state => state.navigateToBreadcrumb);
    const executionMode = useWorkspaceStore(state => state.executionMode);
    const toggleExecutionMode = useWorkspaceStore(state => state.toggleExecutionMode);
    const selectMode = useWorkspaceStore(state => state.selectMode);
    const toggleSelectMode = useWorkspaceStore(state => state.toggleSelectMode);
    const hasSelection = useWorkspaceStore(state => state._hasSelection);
    const connectMode = useWorkspaceStore(state => state.connectMode);
    const toggleConnectMode = useWorkspaceStore(state => state.toggleConnectMode);
    const toggleSidebar = useWorkspaceStore(state => state.toggleSidebar);
    const viewMode = useWorkspaceStore(state => state.viewMode);
    const setViewMode = useWorkspaceStore(state => state.setViewMode);
    const dispatchCanvasAction = useWorkspaceStore(state => state.dispatchCanvasAction);

    const { undo, redo, pastStates, futureStates } = useStore(useWorkspaceStore.temporal);

    const [overflowOpen, setOverflowOpen] = useState(false);
    const overflowRef = useRef<HTMLDivElement>(null);

    // Close overflow menu when clicking outside
    useEffect(() => {
        if (!overflowOpen) return;
        const handleClick = (e: Event) => {
            if (overflowRef.current && !overflowRef.current.contains(e.target as HTMLElement)) {
                setOverflowOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('touchstart', handleClick);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('touchstart', handleClick);
        };
    }, [overflowOpen]);

    return (
        <div>
        <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4">
            <div className="flex items-center text-sm overflow-hidden">
                {/* Mobile hamburger menu */}
                {isTouchDevice && (
                    <button
                        onClick={toggleSidebar}
                        className="p-2 mr-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors touch:min-h-[44px] touch:min-w-[44px] touch:flex touch:items-center touch:justify-center"
                        title="Toggle sidebar"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                )}
                {navStack.map((item, index) => (
                    <React.Fragment key={index}>
                        {index > 0 && <ChevronRight className="w-4 h-4 text-gray-600 mx-1 flex-shrink-0" />}
                        <button
                            onClick={() => navigateToBreadcrumb(index)}
                            className={`flex items-center hover:text-white transition-colors touch:min-h-[44px] touch:min-w-[44px] touch:justify-center flex-shrink-0 ${index === navStack.length - 1 ? 'text-white font-medium' : 'text-gray-400'
                                }`}
                        >
                            {index === 0 && <Home className="w-4 h-4 mr-1" />}
                            <span className="truncate max-w-[120px] touch:max-w-[80px]">{item.label}</span>
                        </button>
                    </React.Fragment>
                ))}
                {/* Depth indicator for deep navigation */}
                {navStack.length > 2 && (
                    <span className="ml-1 text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        L{navStack.length - 1}
                    </span>
                )}
            </div>

            <div className="flex items-center gap-1 touch:gap-0">
                <SaveIndicator />
                {/* View mode toggle: Graph / List — hidden on small screens (moved to overflow) */}
                {!isSmallScreen && (
                <div className="flex items-center bg-gray-800 rounded-lg p-0.5 mr-1">
                    <button
                        onClick={() => setViewMode('graph')}
                        className={clsx(
                            "p-1.5 rounded transition-colors touch:min-h-[44px] touch:min-w-[44px] touch:flex touch:flex-col touch:items-center touch:justify-center",
                            viewMode === 'graph'
                                ? "bg-gray-700 text-white"
                                : "text-gray-400 hover:text-white"
                        )}
                        title="Node view"
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={clsx(
                            "p-1.5 rounded transition-colors touch:min-h-[44px] touch:min-w-[44px] touch:flex touch:flex-col touch:items-center touch:justify-center",
                            viewMode === 'list'
                                ? "bg-gray-700 text-white"
                                : "text-gray-400 hover:text-white"
                        )}
                        title="List view"
                    >
                        <List className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('focus')}
                        className={clsx(
                            "p-1.5 rounded transition-colors touch:min-h-[44px] touch:min-w-[44px] touch:flex touch:flex-col touch:items-center touch:justify-center",
                            viewMode === 'focus'
                                ? "bg-gray-700 text-white"
                                : "text-gray-400 hover:text-white"
                        )}
                        title="Focus view"
                    >
                        <Crosshair className="w-4 h-4" />
                    </button>
                </div>
                )}

                {/* Desktop: show all buttons inline */}
                {!isTouchDevice && (
                    <>
                        <LayoutMenu />
                        <button
                            onClick={() => undo()}
                            disabled={pastStates.length === 0}
                            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Undo (Ctrl+Z)"
                        >
                            <Undo2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => redo()}
                            disabled={futureStates.length === 0}
                            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Redo (Ctrl+Shift+Z)"
                        >
                            <Redo2 className="w-4 h-4" />
                        </button>
                    </>
                )}

                {/* Execution mode toggle — always visible */}
                <button
                    onClick={toggleExecutionMode}
                    className={clsx(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all touch:px-2 touch:py-1 touch:rounded-lg",
                        executionMode
                            ? "bg-amber-500/20 text-amber-500 border border-amber-500/50 hover:bg-amber-500/30"
                            : "bg-gray-800 text-gray-400 border border-gray-700 hover:text-white hover:bg-gray-700"
                    )}
                    title={executionMode ? "Currently in Execution Mode — click to switch to Planning" : "Currently in Plan Mode — click to switch to Execution"}
                >
                    {executionMode ? <Zap className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {!isSmallScreen && <span className="hidden sm:inline text-sm">{executionMode ? "Executing" : "Planning"}</span>}
                </button>

                {/* Mobile: overflow menu for secondary actions */}
                {isTouchDevice && (
                    <div className="relative" ref={overflowRef}>
                        <button
                            onClick={() => setOverflowOpen(!overflowOpen)}
                            className={clsx(
                                "p-2 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center",
                                overflowOpen ? "text-white bg-gray-700" : "text-gray-400 hover:text-white hover:bg-gray-700"
                            )}
                            title="More actions"
                        >
                            <MoreVertical className="w-5 h-5" />
                        </button>
                        {overflowOpen && (
                            <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-1 min-w-[180px]">
                                {/* View mode toggle — shown here on small screens */}
                                {isSmallScreen && (
                                    <>
                                        <button
                                            onClick={() => { setViewMode('graph'); setOverflowOpen(false); }}
                                            className={clsx(
                                                "flex items-center gap-3 w-full px-4 py-3 text-sm text-left hover:bg-gray-700 transition-colors",
                                                viewMode === 'graph' ? "text-white" : "text-gray-300"
                                            )}
                                        >
                                            <LayoutGrid className="w-4 h-4 flex-shrink-0" />
                                            Node View
                                            {viewMode === 'graph' && <span className="ml-auto text-purple-400 text-xs">Active</span>}
                                        </button>
                                        <button
                                            onClick={() => { setViewMode('list'); setOverflowOpen(false); }}
                                            className={clsx(
                                                "flex items-center gap-3 w-full px-4 py-3 text-sm text-left hover:bg-gray-700 transition-colors",
                                                viewMode === 'list' ? "text-white" : "text-gray-300"
                                            )}
                                        >
                                            <List className="w-4 h-4 flex-shrink-0" />
                                            List View
                                            {viewMode === 'list' && <span className="ml-auto text-purple-400 text-xs">Active</span>}
                                        </button>
                                        <button
                                            onClick={() => { setViewMode('focus'); setOverflowOpen(false); }}
                                            className={clsx(
                                                "flex items-center gap-3 w-full px-4 py-3 text-sm text-left hover:bg-gray-700 transition-colors",
                                                viewMode === 'focus' ? "text-white" : "text-gray-300"
                                            )}
                                        >
                                            <Crosshair className="w-4 h-4 flex-shrink-0" />
                                            Focus View
                                            {viewMode === 'focus' && <span className="ml-auto text-purple-400 text-xs">Active</span>}
                                        </button>
                                        <div className="border-t border-gray-700 my-1" />
                                    </>
                                )}
                                <button
                                    onClick={() => { dispatchCanvasAction({ type: 'fit-view' }); setOverflowOpen(false); }}
                                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-left text-gray-300 hover:bg-gray-700 transition-colors"
                                >
                                    <Maximize2 className="w-4 h-4 flex-shrink-0" />
                                    View Full Flow
                                </button>

                                <div className="border-t border-gray-700 my-1" />

                                <div className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wide text-gray-500 flex items-center gap-2">
                                    <Wand2 className="w-3 h-3" />
                                    Auto-Organize
                                </div>
                                <AutoOrganizeOverflowEntries onClose={() => setOverflowOpen(false)} />

                                <div className="border-t border-gray-700 my-1" />

                                <button
                                    onClick={() => { undo(); setOverflowOpen(false); }}
                                    disabled={pastStates.length === 0}
                                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-left disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 hover:bg-gray-700 transition-colors"
                                >
                                    <Undo2 className="w-4 h-4 flex-shrink-0" />
                                    Undo
                                </button>
                                <button
                                    onClick={() => { redo(); setOverflowOpen(false); }}
                                    disabled={futureStates.length === 0}
                                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-left disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 hover:bg-gray-700 transition-colors"
                                >
                                    <Redo2 className="w-4 h-4 flex-shrink-0" />
                                    Redo
                                </button>

                                <div className="border-t border-gray-700 my-1" />

                                <button
                                    onClick={() => { dispatchCanvasAction({ type: 'delete-selected' }); setOverflowOpen(false); }}
                                    disabled={!hasSelection}
                                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-left disabled:opacity-30 disabled:cursor-not-allowed text-red-400 hover:bg-gray-700 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4 flex-shrink-0" />
                                    Delete Selected
                                </button>

                                <div className="border-t border-gray-700 my-1" />

                                <button
                                    onClick={() => { toggleSelectMode(); setOverflowOpen(false); }}
                                    className={clsx(
                                        "flex items-center gap-3 w-full px-4 py-3 text-sm text-left hover:bg-gray-700 transition-colors",
                                        selectMode ? "text-purple-400" : "text-gray-300"
                                    )}
                                >
                                    <BoxSelect className="w-4 h-4 flex-shrink-0" />
                                    {selectMode ? 'Exit Select Mode' : 'Select Mode'}
                                </button>
                                <button
                                    onClick={() => { toggleConnectMode(); setOverflowOpen(false); }}
                                    className={clsx(
                                        "flex items-center gap-3 w-full px-4 py-3 text-sm text-left hover:bg-gray-700 transition-colors",
                                        connectMode.active ? "text-purple-400" : "text-gray-300"
                                    )}
                                >
                                    <Link className="w-4 h-4 flex-shrink-0" />
                                    {connectMode.active ? 'Cancel Connect' : 'Connect Nodes'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

        {/* Connect mode instruction banner */}
        {connectMode.active && (
            <div className="bg-purple-900/50 border-b border-purple-800 px-4 py-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-purple-200">
                    <Link className="w-3.5 h-3.5 animate-pulse" />
                    <span>
                        {connectMode.sourceNodeId
                            ? 'Tap a target node to create a connection'
                            : 'Tap a source node to start connecting'}
                    </span>
                </div>
                <button
                    onClick={toggleConnectMode}
                    className="text-xs text-purple-300 hover:text-white px-2 py-0.5 rounded bg-purple-800/50 hover:bg-purple-700/50 transition-colors"
                >
                    Cancel
                </button>
            </div>
        )}
        </div>
    );
};

const AutoOrganizeOverflowEntries: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const dispatchCanvasAction = useWorkspaceStore(s => s.dispatchCanvasAction);
    const updateSettings = useWorkspaceStore(s => s.updateSettings);
    const orientation: LayoutOrientation = useWorkspaceStore(s => s.settings.preferredLayoutOrientation) ?? 'top-down';

    const setOrientation = (o: LayoutOrientation) => updateSettings({ preferredLayoutOrientation: o });
    const run = (strategy: 'tidy' | 'grid') => {
        updateSettings({ preferredLayoutStrategy: strategy });
        dispatchCanvasAction({
            type: 'auto-organize',
            strategy,
            orientation: strategy === 'tidy' ? orientation : undefined,
        });
        onClose();
    };

    return (
        <>
            <button
                onClick={() => run('tidy')}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-left text-gray-300 hover:bg-gray-700 transition-colors"
            >
                <Network className="w-4 h-4 flex-shrink-0" />
                Tidy
            </button>
            <button
                onClick={() => run('grid')}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-left text-gray-300 hover:bg-gray-700 transition-colors"
            >
                <Grid3x3 className="w-4 h-4 flex-shrink-0" />
                Grid
            </button>
            <div className="px-4 py-2 flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wide text-gray-500 mr-1">Tidy:</span>
                <button
                    onClick={() => setOrientation('top-down')}
                    className={clsx(
                        'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors touch:min-h-[32px]',
                        orientation === 'top-down'
                            ? 'bg-gray-700 text-white'
                            : 'text-gray-400 hover:text-gray-200 bg-gray-900',
                    )}
                    aria-pressed={orientation === 'top-down'}
                    aria-label="Top-down"
                >
                    <ArrowDown className="w-3 h-3" /> TB
                </button>
                <button
                    onClick={() => setOrientation('left-right')}
                    className={clsx(
                        'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors touch:min-h-[32px]',
                        orientation === 'left-right'
                            ? 'bg-gray-700 text-white'
                            : 'text-gray-400 hover:text-gray-200 bg-gray-900',
                    )}
                    aria-pressed={orientation === 'left-right'}
                    aria-label="Left-right"
                >
                    <ArrowRight className="w-3 h-3" /> LR
                </button>
            </div>
        </>
    );
};
