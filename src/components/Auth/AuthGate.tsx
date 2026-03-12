import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { AuthScreen } from './AuthScreen';
import { ResetPasswordScreen } from './ResetPasswordScreen';
import { LoadingScreen } from '../UI/LoadingScreen';

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const session = useAuthStore((state) => state.session);
    const loading = useAuthStore((state) => state.loading);
    const setSession = useAuthStore((state) => state.setSession);
    const setLoading = useAuthStore((state) => state.setLoading);
    const [isRecovery, setIsRecovery] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            if (event === 'PASSWORD_RECOVERY') {
                setIsRecovery(true);
            }
        });

        return () => subscription.unsubscribe();
    }, [setSession, setLoading]);

    if (loading) {
        return <LoadingScreen message="Checking session..." />;
    }

    if (isRecovery && session) {
        return <ResetPasswordScreen onDone={() => setIsRecovery(false)} />;
    }

    if (!session) {
        return <AuthScreen />;
    }

    return <>{children}</>;
};
