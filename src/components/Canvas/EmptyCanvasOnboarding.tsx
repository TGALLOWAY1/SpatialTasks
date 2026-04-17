import { MousePointerClick, Sparkles, X } from 'lucide-react';

interface EmptyCanvasOnboardingProps {
    isTouchDevice: boolean;
    onGenerateFlow?: () => void;
    onSkip: () => void;
}

/**
 * Empty-state onboarding overlay for a brand-new canvas.
 * Renders ghost nodes + an arrow to teach the user where to start.
 * Dismissed by adding a node or by clicking Skip (see CanvasArea).
 */
export function EmptyCanvasOnboarding({ isTouchDevice, onGenerateFlow, onSkip }: EmptyCanvasOnboardingProps) {
    return (
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
            {/* Ghost nodes — purely decorative, no ReactFlow interaction. */}
            <div className="relative w-full max-w-2xl">
                <div className="flex items-center justify-center gap-6 opacity-40 select-none">
                    <GhostNode label="First task" animated />
                    <GhostArrow />
                    <GhostNode label="Next step" />
                    <GhostArrow />
                    <GhostNode label="Done" tone="done" />
                </div>

                {/* Central call-to-action */}
                <div className="mt-10 text-center space-y-3">
                    <MousePointerClick className="w-10 h-10 text-gray-500 mx-auto" />
                    <p className="text-gray-300 text-sm font-medium">
                        {isTouchDevice ? 'Tap the + button to add your first task' : 'Double-click anywhere to add your first task'}
                    </p>
                    {!isTouchDevice && (
                        <p className="text-gray-500 text-[11px]">
                            Shortcuts:{' '}
                            <kbd className="px-1 py-0.5 rounded bg-gray-800 border border-gray-700">N</kbd> task,{' '}
                            <kbd className="px-1 py-0.5 rounded bg-gray-800 border border-gray-700">G</kbd> group,{' '}
                            <kbd className="px-1 py-0.5 rounded bg-gray-800 border border-gray-700">?</kbd> all shortcuts
                        </p>
                    )}
                    {onGenerateFlow && (
                        <button
                            onClick={onGenerateFlow}
                            className="pointer-events-auto inline-flex items-center gap-2 px-4 py-2.5 mt-2 rounded-lg text-sm font-medium bg-purple-600/20 border border-purple-700/50 text-purple-300 hover:bg-purple-600/30 hover:text-purple-200 transition-colors touch:min-h-[44px]"
                        >
                            <Sparkles className="w-4 h-4" />
                            Or: Generate Flow with AI
                        </button>
                    )}
                </div>
            </div>

            {/* Skip link — top-right of the canvas area */}
            <button
                onClick={onSkip}
                className="pointer-events-auto absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs text-gray-500 hover:text-gray-200 hover:bg-gray-800 transition-colors touch:min-h-[40px]"
                aria-label="Dismiss onboarding hint"
            >
                Skip
                <X className="w-3 h-3" />
            </button>
        </div>
    );
}

function GhostNode({ label, tone, animated }: { label: string; tone?: 'done'; animated?: boolean }) {
    const bg = tone === 'done' ? 'bg-slate-800/60' : 'bg-slate-700/60';
    return (
        <div
            className={`px-4 py-2.5 rounded-lg border-2 border-dashed border-slate-600 ${bg} min-w-[120px] text-center ${animated ? 'animate-pulse' : ''}`}
            aria-hidden="true"
        >
            <span className="text-[11px] text-slate-300 font-medium">{label}</span>
        </div>
    );
}

function GhostArrow() {
    return (
        <svg width="40" height="16" viewBox="0 0 40 16" className="text-slate-600" aria-hidden="true">
            <line x1="0" y1="8" x2="32" y2="8" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
            <path d="M 32 3 L 38 8 L 32 13" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
    );
}
