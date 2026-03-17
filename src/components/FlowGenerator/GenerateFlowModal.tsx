import React, { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { Sparkles, X, Loader2 } from 'lucide-react';
import { FlowComplexity } from '../../services/gemini';

interface GenerateFlowModalProps {
    onGenerate: (prompt: string, complexity: FlowComplexity) => void;
    onClose: () => void;
    loading?: boolean;
}

const EXAMPLES = [
    'Mixing a song',
    'Planning a trip',
    'Launching a website',
    'Preparing for an interview',
];

export const GenerateFlowModal: React.FC<GenerateFlowModalProps> = ({
    onGenerate,
    onClose,
    loading = false,
}) => {
    const [prompt, setPrompt] = useState('');
    const [complexity, setComplexity] = useState<FlowComplexity>('standard');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = prompt.trim();
        if (!trimmed || loading) return;
        onGenerate(trimmed, complexity);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60" />
            <div
                className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-w-md w-[calc(100%-2rem)] mx-4 p-6"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        Generate Flow
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded text-gray-400 hover:text-white hover:bg-slate-700 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <label className="block text-sm text-slate-300 mb-2">
                        What are you trying to do?
                    </label>
                    <input
                        ref={inputRef}
                        type="text"
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder="e.g. Mixing a song"
                        disabled={loading}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-sm mb-3"
                    />

                    {/* Example chips */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                        {EXAMPLES.map(ex => (
                            <button
                                key={ex}
                                type="button"
                                disabled={loading}
                                onClick={() => setPrompt(ex)}
                                className={clsx(
                                    "px-2.5 py-1 rounded-full text-xs transition-colors",
                                    prompt === ex
                                        ? "bg-purple-600 text-white"
                                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                )}
                            >
                                {ex}
                            </button>
                        ))}
                    </div>

                    {/* Complexity selector */}
                    <label className="block text-xs text-slate-400 mb-2 uppercase tracking-wider font-medium">
                        Complexity
                    </label>
                    <div className="flex gap-2 mb-6">
                        {(['simple', 'standard', 'detailed'] as FlowComplexity[]).map(level => (
                            <button
                                key={level}
                                type="button"
                                disabled={loading}
                                onClick={() => setComplexity(level)}
                                className={clsx(
                                    "flex-1 py-2 rounded-lg text-xs font-medium transition-colors capitalize",
                                    complexity === level
                                        ? "bg-purple-600 text-white"
                                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                )}
                            >
                                {level}
                            </button>
                        ))}
                    </div>

                    <button
                        type="submit"
                        disabled={!prompt.trim() || loading}
                        className={clsx(
                            "w-full py-3 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2",
                            prompt.trim() && !loading
                                ? "bg-purple-600 hover:bg-purple-500 text-white"
                                : "bg-slate-700 text-slate-500 cursor-not-allowed"
                        )}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                Generate Flow
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
