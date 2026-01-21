import React from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { ChevronRight, Home, PlayCircle, StopCircle } from 'lucide-react';
import { clsx } from 'clsx';

export const TopBar: React.FC = () => {
    const navStack = useWorkspaceStore(state => state.navStack);
    const navigateToBreadcrumb = useWorkspaceStore(state => state.navigateToBreadcrumb);
    const executionMode = useWorkspaceStore(state => state.executionMode);
    const toggleExecutionMode = useWorkspaceStore(state => state.toggleExecutionMode);

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
    );
};
