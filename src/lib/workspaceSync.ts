import { supabase } from './supabase';
import { Workspace, GeminiConnectionStatus } from '../types';

const GEMINI_LOCAL_KEY = 'spatialtasks-gemini-config';

// --- Gemini Key Isolation ---
// Gemini API keys stay in localStorage only, never sent to Supabase.

export function stripGeminiKeys(workspace: Workspace): Workspace {
    const { geminiApiKey, geminiStatus, ...restSettings } = workspace.settings;
    return {
        ...workspace,
        settings: restSettings,
    };
}

export function saveGeminiConfig(config: {
    geminiApiKey?: string;
    geminiStatus?: GeminiConnectionStatus;
}) {
    localStorage.setItem(GEMINI_LOCAL_KEY, JSON.stringify(config));
}

export function loadGeminiConfig(): {
    geminiApiKey?: string;
    geminiStatus?: GeminiConnectionStatus;
} {
    try {
        const raw = localStorage.getItem(GEMINI_LOCAL_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

// --- Supabase CRUD ---

export async function fetchWorkspace(
    userId: string
): Promise<Workspace | null> {
    const { data, error } = await supabase
        .from('workspaces')
        .select('data')
        .eq('user_id', userId)
        .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return data.data as Workspace;
}

export async function saveWorkspace(
    userId: string,
    workspace: Workspace
): Promise<void> {
    const cleaned = stripGeminiKeys(workspace);

    const { error } = await supabase.from('workspaces').upsert(
        {
            user_id: userId,
            data: cleaned,
            version: cleaned.version,
        },
        { onConflict: 'user_id' }
    );

    if (error) throw error;
}

// --- Debounced Save ---

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let _pendingSave = false;

export function debouncedSave(
    userId: string,
    workspace: Workspace,
    onSyncStatus: (status: 'saving' | 'saved' | 'error', error?: string | null) => void,
    delayMs = 2000
) {
    if (saveTimer) clearTimeout(saveTimer);
    _pendingSave = true;

    saveTimer = setTimeout(async () => {
        onSyncStatus('saving');
        try {
            await saveWorkspace(userId, workspace);
            _pendingSave = false;
            onSyncStatus('saved');
        } catch (err) {
            console.error('Failed to save workspace to Supabase:', err);
            _pendingSave = false;
            const message = err instanceof Error ? err.message : 'Sync failed';
            onSyncStatus('error', message);
            // Data is safe in localStorage — will retry on next state change
        }
    }, delayMs);
}

export function hasPendingSave(): boolean {
    return _pendingSave;
}
