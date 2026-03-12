import React from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { ChevronRight, Home, PlayCircle, StopCircle, Undo2, Redo2, Trash2, BoxSelect, Link, Menu } from 'lucide-react';
import { clsx } from 'clsx';
import { useStore } from 'zustand';
import { useDeviceDetect } from '../../hooks/useDeviceDetect';

export const TopBar: React.FC = () => {
    const { isTouchDevice } = useDeviceDetect();
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

    const { undo, redo, pastStates, futureStates } = useStore(useWorkspaceStore.temporal);

    return (
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
                            <span className="truncate max-w-[100px] touch:max-w-[60px]">{item.label}</span>
                        </button>
                    </React.Fragment>
                ))}
            </div>

            <div className="flex items-center gap-1 touch:gap-0.5">
                <button
                    onClick={() => undo()}
                    disabled={pastStates.length === 0}
                    className="p-1.5 touch:p-2.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors touch:min-h-[44px] touch:min-w-[44px] touch:flex touch:items-center touch:justify-center"
                    title="Undo (Ctrl+Z)"
                >
                    <Undo2 className="w-4 h-4" />
                </button>
                <button
                    onClick={() => redo()}
                    disabled={futureStates.length === 0}
                    className="p-1.5 touch:p-2.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors touch:min-h-[44px] touch:min-w-[44px] touch:flex touch:items-center touch:justify-center"
                    title="Redo (Ctrl+Shift+Z)"
                >
                    <Redo2 className="w-4 h-4" />
                </button>

                {/* Mobile-only: Delete selected */}
                {isTouchDevice && (
                    <button
                        onClick={() => document.dispatchEvent(new CustomEvent('canvas:delete-selected'))}
                        disabled={!hasSelection}
                        className="p-1.5 touch:p-2.5 rounded text-gray-400 hover:text-red-400 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors touch:min-h-[44px] touch:min-w-[44px] touch:flex touch:items-center touch:justify-center"
                        title="Delete selected"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}

                {/* Mobile-only: Select mode toggle */}
                {isTouchDevice && (
                    <button
                        onClick={toggleSelectMode}
                        className={clsx(
                            "p-1.5 touch:p-2.5 rounded transition-colors touch:min-h-[44px] touch:min-w-[44px] touch:flex touch:items-center touch:justify-center",
                            selectMode
                                ? "text-purple-400 bg-purple-500/20"
                                : "text-gray-400 hover:text-white hover:bg-gray-700"
                        )}
                        title={selectMode ? "Pan mode" : "Select mode"}
                    >
                        <BoxSelect className="w-4 h-4" />
                    </button>
                )}

                {/* Mobile-only: Connect mode toggle */}
                {isTouchDevice && (
                    <button
                        onClick={toggleConnectMode}
                        className={clsx(
                            "p-1.5 touch:p-2.5 rounded transition-colors touch:min-h-[44px] touch:min-w-[44px] touch:flex touch:items-center touch:justify-center",
                            connectMode.active
                                ? "text-purple-400 bg-purple-500/20"
                                : "text-gray-400 hover:text-white hover:bg-gray-700"
                        )}
                        title={connectMode.active ? "Cancel connect" : "Connect nodes"}
                    >
                        <Link className="w-4 h-4" />
                    </button>
                )}

                <button
                    onClick={toggleExecutionMode}
                    className={clsx(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold transition-all",
                        executionMode
                            ? "bg-amber-500/20 text-amber-500 border border-amber-500/50 hover:bg-amber-500/30"
                            : "bg-gray-800 text-gray-400 border border-gray-700 hover:text-white hover:bg-gray-700"
                    )}
                >
                    {executionMode ? <StopCircle className="w-4 h-4 fill-current" /> : <PlayCircle className="w-4 h-4" />}
                    <span className="hidden touch:hidden sm:inline">{executionMode ? "Execution Mode" : "Plan Mode"}</span>
                </button>
            </div>
        </div>
    );
};
