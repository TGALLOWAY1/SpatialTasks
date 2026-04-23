import React, { useEffect, useRef } from 'react';

interface FolderDeleteModalProps {
    folderTitle: string;
    projectCount: number;
    onKeepProjects: () => void;
    onDeleteProjects: () => void;
    onCancel: () => void;
}

export const FolderDeleteModal: React.FC<FolderDeleteModalProps> = ({
    folderTitle,
    projectCount,
    onKeepProjects,
    onDeleteProjects,
    onCancel,
}) => {
    const keepRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        document.addEventListener('keydown', handleEscape);
        keepRef.current?.focus();
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onCancel]);

    const plural = projectCount === 1 ? 'project' : 'projects';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onCancel}>
            <div className="absolute inset-0 bg-black/60" />

            <div
                className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-w-sm w-[calc(100%-2rem)] mx-4 p-6"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-white font-semibold text-lg mb-2">Delete Folder</h3>
                <p className="text-slate-300 text-sm mb-6">
                    Delete folder &ldquo;{folderTitle}&rdquo;? It contains {projectCount} {plural}.
                </p>

                <div className="flex flex-col gap-2">
                    <button
                        ref={keepRef}
                        onClick={onKeepProjects}
                        className="px-4 py-2.5 touch:py-3 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                    >
                        Keep projects (move to root)
                    </button>
                    <button
                        onClick={onDeleteProjects}
                        className="px-4 py-2.5 touch:py-3 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition-colors"
                    >
                        Delete projects too
                    </button>
                    <button
                        onClick={onCancel}
                        className="px-4 py-2.5 touch:py-3 rounded-lg text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};
