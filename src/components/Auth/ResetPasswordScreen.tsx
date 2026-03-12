import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useToastStore } from '../UI/Toast';
import { FolderGit2, Lock } from 'lucide-react';
import { clsx } from 'clsx';

export const ResetPasswordScreen: React.FC<{ onDone: () => void }> = ({
    onDone,
}) => {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const addToast = useToastStore((state) => state.addToast);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirm) {
            addToast('Passwords do not match.', 'error');
            return;
        }
        if (password.length < 6) {
            addToast('Password must be at least 6 characters.', 'error');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            addToast('Password updated successfully.', 'success');
            onDone();
        } catch (err: any) {
            addToast(err.message || 'Failed to update password.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center w-screen h-screen bg-black">
            <div className="w-full max-w-sm mx-4">
                <div className="flex flex-col items-center gap-2 mb-8">
                    <FolderGit2 className="w-10 h-10 text-purple-400" />
                    <h1 className="text-2xl font-bold text-white">
                        Set New Password
                    </h1>
                    <p className="text-sm text-gray-500">
                        Enter your new password below.
                    </p>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="New password"
                                minLength={6}
                                className="w-full bg-gray-800 border border-gray-700 rounded-md pl-10 pr-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
                                required
                            />
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="password"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                placeholder="Confirm password"
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
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
