import { useState, useCallback, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface NotesEditorProps {
    notes: string;
    onSave: (notes: string) => void;
    onClose: () => void;
    accentColor?: 'slate' | 'indigo';
}

export const NotesEditor = ({ notes, onSave, onClose, accentColor = 'slate' }: NotesEditorProps) => {
    const [value, setValue] = useState(notes);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

    const handleSave = useCallback(() => {
        onSave(value);
        onClose();
    }, [value, onSave, onClose]);

    const isIndigo = accentColor === 'indigo';

    return (
        <div
            className={`absolute top-full left-0 mt-2 z-50 rounded-lg shadow-2xl border p-3 w-64 ${
                isIndigo
                    ? 'bg-indigo-950 border-indigo-700'
                    : 'bg-slate-900 border-slate-700'
            }`}
            onMouseDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
        >
            <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-medium ${isIndigo ? 'text-indigo-300' : 'text-slate-400'}`}>
                    Notes
                </span>
                <button
                    onClick={onClose}
                    className={`p-0.5 rounded hover:bg-slate-700 transition-colors ${
                        isIndigo ? 'text-indigo-400' : 'text-slate-500'
                    }`}
                >
                    <X className="w-3 h-3" />
                </button>
            </div>
            <textarea
                ref={textareaRef}
                className={`w-full bg-transparent border rounded text-xs resize-none outline-none p-2 ${
                    isIndigo
                        ? 'border-indigo-800 text-indigo-100 placeholder-indigo-600 focus:border-indigo-500'
                        : 'border-slate-700 text-slate-200 placeholder-slate-600 focus:border-slate-500'
                }`}
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Escape') onClose();
                    e.stopPropagation();
                }}
                placeholder="Add notes..."
                rows={4}
            />
            <button
                onClick={handleSave}
                className={`mt-2 w-full text-xs font-medium py-1.5 rounded transition-colors ${
                    isIndigo
                        ? 'bg-indigo-700 hover:bg-indigo-600 text-indigo-100'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                }`}
            >
                Save
            </button>
        </div>
    );
};
