import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useToastStore } from '../components/UI/Toast';
import {
    fetchWorkspace,
    saveWorkspace,
    debouncedSave,
    hasPendingSave,
} from '../lib/workspaceSync';
import { generateWorkspace } from '../utils/generator';

export function useWorkspaceSync() {
    const user = useAuthStore((state) => state.user);
    const hydrateFromSupabase = useWorkspaceStore(
        (state) => state.hydrateFromSupabase
    );
    const setSupabaseLoaded = useWorkspaceStore(
        (state) => state.setSupabaseLoaded
    );
    const addToast = useToastStore((state) => state.addToast);
    const loadedForUser = useRef<string | null>(null);

    // 1. On auth, load workspace from Supabase
    useEffect(() => {
        if (!user) {
            // If SKIP_AUTH is active, mark as loaded so the app renders
            if (import.meta.env.VITE_SKIP_AUTH === 'true') {
                setSupabaseLoaded(true);
            }
            return;
        }
        // Avoid re-loading if already loaded for this user
        if (loadedForUser.current === user.id) return;

        const load = async () => {
            try {
                const remote = await fetchWorkspace(user.id);

                if (remote) {
                    hydrateFromSupabase(remote);
                } else {
                    // First-time user: check for existing localStorage data
                    const localState = useWorkspaceStore.getState();
                    const hasLocalData =
                        localState._hydrated && localState.projects.length > 0;

                    if (hasLocalData) {
                        // Preserve anonymous localStorage data by saving to Supabase
                        await saveWorkspace(user.id, localState);
                        setSupabaseLoaded(true);
                    } else {
                        // Truly new user: generate default workspace
                        const defaultWs = generateWorkspace('42');
                        hydrateFromSupabase(defaultWs);
                    }
                }

                loadedForUser.current = user.id;
            } catch (err) {
                console.error('Failed to load from Supabase:', err);
                addToast(
                    'Using offline data. Changes will sync when connection is restored.',
                    'info'
                );
                setSupabaseLoaded(true);
            }
        };

        load();
    }, [user, hydrateFromSupabase, setSupabaseLoaded, addToast]);

    // 2. Subscribe to store changes and auto-save to Supabase
    useEffect(() => {
        if (!user) return;

        const unsub = useWorkspaceStore.subscribe((state) => {
            // Skip saves until Supabase data has loaded (avoid overwriting remote with stale local)
            if (!state._supabaseLoaded) return;
            debouncedSave(user.id, state);
        });

        return unsub;
    }, [user]);

    // 3. Warn on unload if there are pending saves
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasPendingSave()) {
                e.preventDefault();
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () =>
            window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);
}
