import { useState, useCallback, useEffect, useRef } from 'react';
import { X, Copy, Check, Maximize2 } from 'lucide-react';
import { useKeyboardOffset } from '../../hooks/useKeyboardOffset';
import { useDeviceDetect } from '../../hooks/useDeviceDetect';

interface NotesEditorProps {
    notes: string;
    onSave: (notes: string) => void;
    onClose: () => void;
    accentColor?: 'slate' | 'indigo';
}

const urlRegex = /https?:\/\/[^\s)]+/gi;
const extractUrls = (text: string): string[] => {
    if (!text) return [];
    return Array.from(new Set(text.match(urlRegex) ?? []));
};

const ExpandedNotesModal = ({ value, onChange, onSave, onClose, accentColor }: {
    value: string;
    onChange: (v: string) => void;
    onSave: () => void;
    onClose: () => void;
    accentColor: 'slate' | 'indigo';
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const keyboardOffset = useKeyboardOffset();
    const isIndigo = accentColor === 'indigo';
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

    const handleCopy = useCallback(async () => {
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = value;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }
    }, [value]);

    return (
        <div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
            onClick={onClose}
            onMouseDown={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
        >
            <div className="absolute inset-0 bg-black/60" />
            <div
                className={`relative w-full sm:max-w-lg sm:rounded-xl rounded-t-2xl shadow-2xl border p-4 ${
                    isIndigo
                        ? 'bg-indigo-950 border-indigo-700'
                        : 'bg-slate-900 border-slate-700'
                }`}
                style={{ marginBottom: keyboardOffset }}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-3">
                    <span className={`text-sm font-semibold ${isIndigo ? 'text-indigo-200' : 'text-slate-300'}`}>
                        Notes
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleCopy}
                            disabled={!value}
                            className={`p-1.5 rounded transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center ${
                                copied
                                    ? 'text-green-400'
                                    : isIndigo
                                        ? 'text-indigo-400 hover:bg-indigo-800 disabled:opacity-30'
                                        : 'text-slate-400 hover:bg-slate-700 disabled:opacity-30'
                            }`}
                            title="Copy notes"
                        >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={onClose}
                            className={`p-1.5 rounded transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center ${
                                isIndigo ? 'text-indigo-400 hover:bg-indigo-800' : 'text-slate-400 hover:bg-slate-700'
                            }`}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <textarea
                    ref={textareaRef}
                    className={`w-full bg-transparent border rounded text-sm resize-none outline-none p-3 ${
                        isIndigo
                            ? 'border-indigo-800 text-indigo-100 placeholder-indigo-600 focus:border-indigo-500'
                            : 'border-slate-700 text-slate-200 placeholder-slate-600 focus:border-slate-500'
                    }`}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Escape') onClose();
                        e.stopPropagation();
                    }}
                    placeholder="Add notes..."
                    rows={10}
                />
                <button
                    onClick={onSave}
                    className={`mt-3 w-full text-sm font-medium py-2.5 rounded-lg transition-colors ${
                        isIndigo
                            ? 'bg-indigo-700 hover:bg-indigo-600 text-indigo-100'
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                    }`}
                >
                    Save
                </button>
            </div>
        </div>
    );
};

export const NotesEditor = ({ notes, onSave, onClose, accentColor = 'slate' }: NotesEditorProps) => {
    const { isTouchDevice } = useDeviceDetect();
    const [value, setValue] = useState(notes);
    // On touch devices, start in expanded modal to avoid popover overflow
    const [expanded, setExpanded] = useState(isTouchDevice);
    const [copied, setCopied] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (!expanded) {
            textareaRef.current?.focus();
        }
    }, [expanded]);

    const handleSave = useCallback(() => {
        onSave(value);
        onClose();
    }, [value, onSave, onClose]);

    const handleCopy = useCallback(async () => {
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            const textarea = document.createElement('textarea');
            textarea.value = value;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }
    }, [value]);

    const isIndigo = accentColor === 'indigo';
    const detectedUrls = extractUrls(value);

    if (expanded) {
        return (
            <ExpandedNotesModal
                value={value}
                onChange={setValue}
                onSave={handleSave}
                onClose={() => setExpanded(false)}
                accentColor={accentColor}
            />
        );
    }

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
                <div className="flex items-center gap-0.5">
                    <button
                        onClick={handleCopy}
                        disabled={!value}
                        className={`p-1 rounded transition-colors ${
                            copied
                                ? 'text-green-400'
                                : isIndigo
                                    ? 'text-indigo-400 hover:bg-indigo-800 disabled:opacity-30'
                                    : 'text-slate-500 hover:bg-slate-700 disabled:opacity-30'
                        }`}
                        title="Copy notes"
                    >
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </button>
                    <button
                        onClick={() => setExpanded(true)}
                        className={`p-1 rounded transition-colors ${
                            isIndigo ? 'text-indigo-400 hover:bg-indigo-800' : 'text-slate-500 hover:bg-slate-700'
                        }`}
                        title="Expand notes"
                    >
                        <Maximize2 className="w-3 h-3" />
                    </button>
                    <button
                        onClick={onClose}
                        className={`p-1 rounded transition-colors ${
                            isIndigo ? 'text-indigo-400 hover:bg-indigo-800' : 'text-slate-500 hover:bg-slate-700'
                        }`}
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
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
            {detectedUrls.length > 0 && (
                <div className={`mt-2 border rounded p-2 max-h-20 overflow-y-auto ${
                    isIndigo ? 'border-indigo-800/80 bg-indigo-900/20' : 'border-slate-700 bg-slate-800/40'
                }`}>
                    <p className={`text-[10px] mb-1 ${isIndigo ? 'text-indigo-300' : 'text-slate-400'}`}>
                        Links detected
                    </p>
                    <div className="space-y-1">
                        {detectedUrls.map((url) => (
                            <a
                                key={url}
                                href={url}
                                target="_blank"
                                rel="noreferrer noopener"
                                className={`block truncate text-[11px] underline ${
                                    isIndigo ? 'text-indigo-300 hover:text-indigo-100' : 'text-sky-300 hover:text-sky-200'
                                }`}
                                title={url}
                            >
                                {url}
                            </a>
                        ))}
                    </div>
                </div>
            )}
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
