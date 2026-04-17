import { useEffect, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import { SHORTCUTS, SHORTCUT_CATEGORIES, isMac, keyLabel, Shortcut } from '../../utils/shortcuts';

interface ShortcutsModalProps {
    onClose: () => void;
}

/**
 * Keyboard shortcut cheatsheet modal. Opened via ? or from the sidebar
 * "Keyboard shortcuts" affordance. Groups shortcuts by category.
 */
export function ShortcutsModal({ onClose }: ShortcutsModalProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mac = useMemo(isMac, []);

    // Esc + click-outside + focus-trap-lite (focus the dialog when mounted).
    useEffect(() => {
        containerRef.current?.focus();
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onClose();
            }
        };
        document.addEventListener('keydown', handleKey, true);
        return () => document.removeEventListener('keydown', handleKey, true);
    }, [onClose]);

    const grouped = useMemo(() => {
        const out: Record<string, Shortcut[]> = {};
        for (const cat of SHORTCUT_CATEGORIES) out[cat] = [];
        for (const s of SHORTCUTS) out[s.category].push(s);
        return out;
    }, []);

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
            onMouseDown={onClose}
        >
            <div
                ref={containerRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-label="Keyboard shortcuts"
                className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col outline-none"
                onMouseDown={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                    <h2 className="text-base font-semibold text-slate-100">Keyboard shortcuts</h2>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 min-h-[32px] min-w-[32px] flex items-center justify-center touch:min-h-[44px] touch:min-w-[44px]"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="overflow-y-auto px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                    {SHORTCUT_CATEGORIES.map(cat => (
                        <section key={cat}>
                            <h3 className="text-[11px] uppercase tracking-wider font-semibold text-purple-300 mb-2">{cat}</h3>
                            <ul className="flex flex-col gap-1.5">
                                {grouped[cat].map((s, i) => (
                                    <li key={i} className="flex items-center justify-between gap-3 text-sm">
                                        <span className="text-slate-200">{s.description}</span>
                                        <span className="flex items-center gap-1 flex-shrink-0">
                                            {s.keys.map((k, ki) => (
                                                <kbd
                                                    key={ki}
                                                    className="px-1.5 py-0.5 rounded border border-slate-700 bg-slate-800 text-[11px] font-mono text-slate-200 min-w-[20px] text-center"
                                                >
                                                    {keyLabel(k, mac)}
                                                </kbd>
                                            ))}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>

                <div className="px-5 py-3 border-t border-slate-800 text-[11px] text-slate-500">
                    Press <kbd className="px-1 py-0.5 rounded border border-slate-700 bg-slate-800 text-slate-300">Esc</kbd> to close.
                </div>
            </div>
        </div>
    );
}
