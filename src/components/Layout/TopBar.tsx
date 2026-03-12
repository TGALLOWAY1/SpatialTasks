import React from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { ChevronRight, Home, PlayCircle, StopCircle, Undo2, Redo2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useStore } from 'zustand';

export const TopBar: React.FC = () => {
    const navStack = useWorkspaceStore(state => state.navStack);
    const navigateToBreadcrumb = useWorkspaceStore(state => state.navigateToBreadcrumb);
    const executionMode = useWorkspaceStore(state => state.executionMode);
    const toggleExecutionMode = useWorkspaceStore(state => state.toggleExecutionMode);

    const { undo, redo, pastStates, futureStates } = useStore(useWorkspaceStore.temporal);

    return (
        <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4">
            <div className="flex items-center text-sm">
                {navStack.map((item, index) => (
                    <React.Fragment key={index}>
                        {index > 0 && <ChevronRight className="w-4 h-4 text-gray-600 mx-1" />}
                        <button
                            onClick={() => navigateToBreadcrumb(index)}
                            className={`flex items-center hover:text-white transition-colors ${index === navStack.length - 1 ? 'text-white font-medium' : 'text-gray-400'
                                }`}
                        >
                            {index === 0 && <Home className="w-4 h-4 mr-1" />}
                            {item.label}
                        </button>
                    </React.Fragment>
                ))}
            </div>

            <div className="flex items-center gap-2">
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
                {executionMode ? "Execution Mode" : "Plan Mode"}
            </button>
            </div>
        </div>
    );
};
