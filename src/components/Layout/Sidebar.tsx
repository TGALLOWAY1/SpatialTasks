import React from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { clsx } from 'clsx';
import { FolderGit2, RefreshCw } from 'lucide-react';

export const Sidebar: React.FC = () => {
    const projects = useWorkspaceStore(state => state.projects);
    const activeProjectId = useWorkspaceStore(state => state.activeProjectId);
    const loadProject = useWorkspaceStore(state => state.loadProject);
    const resetWorkspace = useWorkspaceStore(state => state.resetWorkspace);

    return (
        <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
            <div className="p-4 border-b border-gray-800">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FolderGit2 className="w-5 h-5 text-purple-400" />
                    SpatialTasks
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">Projects</h3>
                <div className="space-y-1">
                    {projects.map(project => (
                        <button
                            key={project.id}
                            onClick={() => loadProject(project.id)}
                            className={clsx(
                                "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                                activeProjectId === project.id
                                    ? "bg-purple-900/30 text-purple-300 border border-purple-800"
                                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                            )}
                        >
                            {project.title}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-4 border-t border-gray-800">
                <button
                    onClick={() => resetWorkspace(Math.random().toString())}
                    className="flex items-center gap-2 text-xs text-gray-500 hover:text-white w-full px-2 py-2"
                >
                    <RefreshCw className="w-3 h-3" />
                    Regenerate Data
                </button>
            </div>
        </div>
    );
};
