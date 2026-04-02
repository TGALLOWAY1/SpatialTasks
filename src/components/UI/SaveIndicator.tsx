import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { retrySave } from '../../lib/workspaceSync';
import { Check, Cloud, AlertTriangle, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';

function formatRelativeTime(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 10) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
}

export const SaveIndicator: React.FC = () => {
    const syncStatus = useWorkspaceStore(state => state.syncStatus);
    const syncError = useWorkspaceStore(state => state.syncError);
    const lastSavedAt = useWorkspaceStore(state => state.lastSavedAt);
    const setSyncStatus = useWorkspaceStore(state => state.setSyncStatus);
    const [visible, setVisible] = useState(false);
    const [retrying, setRetrying] = useState(false);
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

    const handleRetry = useCallback(async () => {
        setRetrying(true);
        await retrySave(setSyncStatus);
        setRetrying(false);
    }, [setSyncStatus]);

    if (!visible) return null;

    const savedTimeLabel = lastSavedAt ? `Last saved ${formatRelativeTime(lastSavedAt)}` : undefined;

    return (
        <div
            className={clsx(
                "flex items-center gap-1 text-[11px] transition-opacity duration-300 mr-1",
                syncStatus === 'saving' && "text-gray-500",
                syncStatus === 'saved' && "text-green-500/70",
                syncStatus === 'error' && "text-red-400"
            )}
            title={syncStatus === 'error' && syncError ? syncError : savedTimeLabel}
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
            {syncStatus === 'error' && (
                <button
                    onClick={handleRetry}
                    disabled={retrying}
                    className="ml-0.5 text-red-300 hover:text-red-100 transition-colors disabled:opacity-50"
                    title="Retry sync"
                >
                    <RefreshCw className={clsx("w-3 h-3", retrying && "animate-spin")} />
                </button>
            )}
        </div>
    );
};
