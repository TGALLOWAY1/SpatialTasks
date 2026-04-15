import { GitBranch, ChevronRight, ImageOff } from 'lucide-react';
import { FocusTaskRef } from '../../utils/logic';

interface ParallelChooserProps {
    options: FocusTaskRef[];
    onSelect: (task: FocusTaskRef) => void;
    onCancel: () => void;
}

/**
 * Condensed list of next-actionable tasks, shown when completing a task
 * unblocks more than one parallel option. Mirrors the visual language of
 * ListView so users feel at home, but each row is tappable to advance.
 */
export const ParallelChooser: React.FC<ParallelChooserProps> = ({ options, onSelect, onCancel }) => {
    return (
        <div className="flex-1 h-full bg-gray-950 overflow-y-auto">
            <div className="max-w-md mx-auto px-4 py-6 space-y-3">
                <div className="flex items-center gap-2 text-purple-300 mb-1">
                    <GitBranch className="w-4 h-4 -rotate-90" />
                    <h2 className="text-base font-semibold">Choose your next task</h2>
                </div>
                <p className="text-xs text-gray-400 mb-2">
                    {options.length} parallel options unlocked. Tap one to continue.
                </p>

                {options.map((opt) => {
                    const node = opt.node;
                    const firstImage = node.meta?.images?.[0];
                    const notesSnippet = (node.meta?.notes ?? '').trim().split('\n')[0].slice(0, 90);
                    return (
                        <button
                            key={`${opt.graphId}-${node.id}`}
                            onClick={() => onSelect(opt)}
                            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg border border-slate-700/50 bg-slate-800/50 hover:border-purple-500/60 hover:bg-slate-800 transition-colors text-left touch:min-h-[64px]"
                        >
                            <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden bg-slate-900 border border-slate-700 flex items-center justify-center">
                                {firstImage ? (
                                    <img
                                        src={firstImage.dataUrl}
                                        alt={firstImage.name ?? node.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <ImageOff className="w-4 h-4 text-slate-600" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                {opt.breadcrumb.length > 0 && (
                                    <div className="text-[10px] uppercase tracking-wide text-indigo-400 truncate mb-0.5">
                                        {opt.breadcrumb.join(' › ')}
                                    </div>
                                )}
                                <div className="text-sm text-slate-100 font-medium line-clamp-2">
                                    {node.title}
                                </div>
                                {notesSnippet && (
                                    <div className="text-xs text-slate-400 truncate mt-0.5">
                                        {notesSnippet}
                                    </div>
                                )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        </button>
                    );
                })}

                <button
                    onClick={onCancel}
                    className="w-full mt-2 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};
