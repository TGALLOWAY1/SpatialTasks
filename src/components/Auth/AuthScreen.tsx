import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useToastStore } from '../UI/Toast';
import { FolderGit2, Mail, Lock, Github } from 'lucide-react';
import { clsx } from 'clsx';

type AuthTab = 'signin' | 'signup' | 'forgot';

export const AuthScreen: React.FC = () => {
    const [tab, setTab] = useState<AuthTab>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const addToast = useToastStore((state) => state.addToast);

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(
                email.trim(),
                { redirectTo: window.location.origin }
            );
            if (error) throw error;
            addToast('Password reset email sent. Check your inbox.', 'success');
            setTab('signin');
        } catch (err: any) {
            addToast(err.message || 'Failed to send reset email.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !password.trim()) return;

        setLoading(true);
        try {
            if (tab === 'signin') {
                const { error } = await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password,
                });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signUp({
                    email: email.trim(),
                    password,
                });
                if (error) throw error;
                addToast('Account created! You can now sign in.', 'success');
            }
        } catch (err: any) {
            addToast(err.message || 'Authentication failed.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOAuth = async (provider: 'google' | 'github') => {
        const { error } = await supabase.auth.signInWithOAuth({ provider });
        if (error) {
            addToast(error.message || 'OAuth sign-in failed.', 'error');
        }
    };

    return (
        <div className="flex items-center justify-center w-screen h-screen bg-black">
            <div className="w-full max-w-sm mx-4">
                <div className="flex flex-col items-center gap-2 mb-8">
                    <FolderGit2 className="w-10 h-10 text-purple-400" />
                    <h1 className="text-2xl font-bold text-white">SpatialTasks</h1>
                    <p className="text-sm text-gray-500">
                        Spatial task management with AI
                    </p>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                    {tab === 'forgot' ? (
                        <>
                            <h3 className="text-sm font-medium text-white mb-1">Reset password</h3>
                            <p className="text-xs text-gray-500 mb-4">
                                Enter your email and we'll send a reset link.
                            </p>
                            <form onSubmit={handleForgotPassword} className="space-y-4">
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Email"
                                        className="w-full bg-gray-800 border border-gray-700 rounded-md pl-10 pr-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={clsx(
                                        'w-full py-2.5 rounded-md text-sm font-medium transition-colors',
                                        loading
                                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                            : 'bg-purple-600 hover:bg-purple-500 text-white'
                                    )}
                                >
                                    {loading ? 'Sending...' : 'Send Reset Link'}
                                </button>
                            </form>
                            <button
                                onClick={() => setTab('signin')}
                                className="w-full text-center text-xs text-gray-500 hover:text-gray-300 mt-3 transition-colors"
                            >
                                Back to sign in
                            </button>
                        </>
                    ) : (
                    <>
                    {/* Tab Toggle */}
                    <div className="flex mb-6 bg-gray-800 rounded-md p-0.5">
                        <button
                            onClick={() => setTab('signin')}
                            className={clsx(
                                'flex-1 py-2 text-sm font-medium rounded-md transition-colors',
                                tab === 'signin'
                                    ? 'bg-gray-700 text-white'
                                    : 'text-gray-400 hover:text-gray-300'
                            )}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => setTab('signup')}
                            className={clsx(
                                'flex-1 py-2 text-sm font-medium rounded-md transition-colors',
                                tab === 'signup'
                                    ? 'bg-gray-700 text-white'
                                    : 'text-gray-400 hover:text-gray-300'
                            )}
                        >
                            Sign Up
                        </button>
                    </div>

                    {/* Email/Password Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email"
                                className="w-full bg-gray-800 border border-gray-700 rounded-md pl-10 pr-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
                                required
                            />
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                minLength={6}
                                className="w-full bg-gray-800 border border-gray-700 rounded-md pl-10 pr-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className={clsx(
                                'w-full py-2.5 rounded-md text-sm font-medium transition-colors',
                                loading
                                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                    : 'bg-purple-600 hover:bg-purple-500 text-white'
                            )}
                        >
                            {loading
                                ? 'Please wait...'
                                : tab === 'signin'
                                  ? 'Sign In'
                                  : 'Create Account'}
                        </button>
                    </form>

                    {tab === 'signin' && (
                        <button
                            onClick={() => setTab('forgot')}
                            className="w-full text-right text-xs text-gray-500 hover:text-gray-300 mt-2 transition-colors"
                        >
                            Forgot password?
                        </button>
                    )}

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-5">
                        <div className="flex-1 border-t border-gray-800" />
                        <span className="text-xs text-gray-600">or</span>
                        <div className="flex-1 border-t border-gray-800" />
                    </div>

                    {/* OAuth Buttons */}
                    <div className="space-y-2">
                        <button
                            onClick={() => handleOAuth('google')}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors border border-gray-700"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path
                                    fill="currentColor"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                            Continue with Google
                        </button>
                        <button
                            onClick={() => handleOAuth('github')}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors border border-gray-700"
                        >
                            <Github className="w-4 h-4" />
                            Continue with GitHub
                        </button>
                    </div>
                    </>
                    )}
                </div>
            </div>
        </div>
    );
};
