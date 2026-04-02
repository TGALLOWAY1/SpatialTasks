import React, { useEffect, useState, useRef } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { Check, Cloud, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

export const SaveIndicator: React.FC = () => {
    const syncStatus = useWorkspaceStore(state => state.syncStatus);
    const syncError = useWorkspaceStore(state => state.syncError);
    const [visible, setVisible] = useState(false);
    const fadeRef = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
        clearTimeout(fadeRef.current);

        if (syncStatus === 'saving' || syncStatus === 'error') {
            setVisible(true);
        } else if (syncStatus === 'saved') {
            setVisible(true);
            fadeRef.current = setTimeout(() => setVisible(false), 3000);
        } else {
            setVisible(false);
        }

        return () => clearTimeout(fadeRef.current);
    }, [syncStatus]);

    if (!visible) return null;

    return (
        <div
            className={clsx(
                "flex items-center gap-1 text-[11px] transition-opacity duration-300 mr-1",
                syncStatus === 'saving' && "text-gray-500",
                syncStatus === 'saved' && "text-green-500/70",
                syncStatus === 'error' && "text-red-400"
            )}
            title={syncStatus === 'error' && syncError ? syncError : undefined}
        >
            {syncStatus === 'saving' && (
                <Cloud className="w-3 h-3 animate-pulse" />
            )}
            {syncStatus === 'saved' && (
                <Check className="w-3 h-3" />
            )}
            {syncStatus === 'error' && (
                <AlertTriangle className="w-3 h-3" />
            )}
            <span className="hidden sm:inline">
                {syncStatus === 'saving' && 'Saving...'}
                {syncStatus === 'saved' && 'Saved'}
                {syncStatus === 'error' && 'Sync failed'}
            </span>
        </div>
    );
};
