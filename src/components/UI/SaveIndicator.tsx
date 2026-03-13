import React, { useEffect, useState, useRef } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { Check, Cloud } from 'lucide-react';
import { clsx } from 'clsx';

export const SaveIndicator: React.FC = () => {
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
        const unsub = useWorkspaceStore.subscribe(() => {
            // Show "saving" briefly, then "saved"
            setSaveState('saving');
            clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
                setSaveState('saved');
                timeoutRef.current = setTimeout(() => {
                    setSaveState('idle');
                }, 2000);
            }, 300);
        });
        return () => {
            unsub();
            clearTimeout(timeoutRef.current);
        };
    }, []);

    if (saveState === 'idle') return null;

    return (
        <div
            className={clsx(
                "flex items-center gap-1 text-[11px] transition-opacity duration-300 mr-1",
                saveState === 'saving' && "text-gray-500",
                saveState === 'saved' && "text-green-500/70"
            )}
        >
            {saveState === 'saving' ? (
                <Cloud className="w-3 h-3 animate-pulse" />
            ) : (
                <Check className="w-3 h-3" />
            )}
            <span className="hidden sm:inline">{saveState === 'saving' ? 'Saving...' : 'Saved'}</span>
        </div>
    );
};
