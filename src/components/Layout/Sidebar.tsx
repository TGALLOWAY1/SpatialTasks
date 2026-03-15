import React, { useState } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../UI/Toast';
import { ConfirmModal } from '../UI/ConfirmModal';
import { supabase } from '../../lib/supabase';
import { clsx } from 'clsx';
import { FolderGit2, RefreshCw, Settings, Eye, EyeOff, KeyRound, Trash2, ArrowLeft, ExternalLink, LogOut, User, Lock, Plus } from 'lucide-react';
import { useDeviceDetect } from '../../hooks/useDeviceDetect';

export const Sidebar: React.FC = () => {
    const { isMobile } = useDeviceDetect();
    const sidebarOpen = useWorkspaceStore(state => state.sidebarOpen);
    const closeSidebar = useWorkspaceStore(state => state.closeSidebar);
    const projects = useWorkspaceStore(state => state.projects);
    const activeProjectId = useWorkspaceStore(state => state.activeProjectId);
    const loadProject = useWorkspaceStore(state => state.loadProject);
    const createProject = useWorkspaceStore(state => state.createProject);
    const deleteProject = useWorkspaceStore(state => state.deleteProject);
    const resetWorkspace = useWorkspaceStore(state => state.resetWorkspace);
    const settings = useWorkspaceStore(state => state.settings);
    const updateSettings = useWorkspaceStore(state => state.updateSettings);
    const addToast = useToastStore(state => state.addToast);
    const user = useAuthStore(state => state.user);

    const [showSettings, setShowSettings] = useState(false);
    const [showKey, setShowKey] = useState(false);
    const [keyInput, setKeyInput] = useState(settings.geminiApiKey || '');
    const [newPassword, setNewPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newProjectTitle, setNewProjectTitle] = useState('');
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const geminiStatus = settings.geminiStatus || (settings.geminiApiKey ? 'configured' : 'no_key');

    const handleSaveKey = () => {
        const trimmed = keyInput.trim();
        if (trimmed) {
            updateSettings({ geminiApiKey: trimmed, geminiStatus: 'configured' });
            addToast('Gemini API key saved.', 'success');
        } else {
            updateSettings({ geminiApiKey: undefined, geminiStatus: 'no_key' });
            addToast('API key cleared.', 'info');
        }
    };

    const handleChangePassword = async () => {
        if (newPassword.length < 6) {
            addToast('Password must be at least 6 characters.', 'error');
            return;
        }
        setChangingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            addToast('Password updated.', 'success');
            setNewPassword('');
        } catch (err: any) {
            addToast(err.message || 'Failed to update password.', 'error');
        } finally {
            setChangingPassword(false);
        }
    };

    const handleRemoveKey = () => {
        setKeyInput('');
        updateSettings({ geminiApiKey: undefined, geminiStatus: 'no_key' });
        addToast('API key removed.', 'info');
    };

    // On mobile, hide unless drawer is open
    if (isMobile && !sidebarOpen) return null;

    const sidebarContent = (
        <div className={clsx(
            "bg-gray-900 border-r border-gray-800 flex flex-col h-full",
            isMobile ? "w-[80vw] max-w-[320px]" : "w-64"
        )}>
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FolderGit2 className="w-5 h-5 text-purple-400" />
                    SpatialTasks
                </h2>
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={clsx(
                        "p-1.5 rounded-md transition-colors",
                        showSettings
                            ? "bg-gray-700 text-white"
                            : "text-gray-500 hover:text-white hover:bg-gray-800"
                    )}
                    title="Settings"
                >
                    <Settings className="w-4 h-4" />
                </button>
            </div>

            {showSettings ? (
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <button
                        onClick={() => setShowSettings(false)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-3 h-3" />
                        Back to projects
                    </button>

                    <div>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                            Gemini API Key
                        </h3>

                        <div className="flex items-center gap-1 mb-2">
                            <KeyRound className="w-3.5 h-3.5 text-gray-500" />
                            <div className="flex items-center gap-1.5">
                                <div className={clsx(
                                    "w-2 h-2 rounded-full",
                                    geminiStatus === 'configured' && "bg-green-500",
                                    geminiStatus === 'error' && "bg-red-500",
                                    geminiStatus === 'no_key' && "bg-gray-600",
                                )} />
                                <span className="text-xs text-gray-400">
                                    {geminiStatus === 'configured' && 'Key configured'}
                                    {geminiStatus === 'error' && 'Last request failed'}
                                    {geminiStatus === 'no_key' && 'No key configured'}
                                </span>
                            </div>
                        </div>

                        <div className="relative mb-2">
                            <input
                                type={showKey ? 'text' : 'password'}
                                value={keyInput}
                                onChange={(e) => setKeyInput(e.target.value)}
                                placeholder="Paste your API key..."
                                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 pr-8"
                            />
                            <button
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                            >
                                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleSaveKey}
                                disabled={!keyInput.trim()}
                                className={clsx(
                                    "flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                                    keyInput.trim()
                                        ? "bg-purple-600 hover:bg-purple-500 text-white"
                                        : "bg-gray-800 text-gray-600 cursor-not-allowed"
                                )}
                            >
                                Save Key
                            </button>
                            {settings.geminiApiKey && (
                                <button
                                    onClick={handleRemoveKey}
                                    className="px-3 py-1.5 rounded-md text-xs font-medium bg-gray-800 text-red-400 hover:bg-red-950 hover:text-red-300 transition-colors flex items-center gap-1"
                                >
                                    <Trash2 className="w-3 h-3" />
                                    Remove
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-gray-800">
                        <h4 className="text-xs font-semibold text-gray-400">How to get a key</h4>
                        <ol className="text-xs text-gray-500 leading-relaxed space-y-2 list-decimal list-outside pl-4">
                            <li>
                                Visit{' '}
                                <a
                                    href="https://aistudio.google.com/apikey"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-purple-400 hover:text-purple-300 underline underline-offset-2 inline-flex items-center gap-0.5"
                                >
                                    Google AI Studio
                                    <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                            </li>
                            <li>Sign in with your Google account</li>
                            <li>Click <span className="text-gray-300 font-medium">Create API Key</span> and select a project</li>
                            <li>Copy the key and paste it above</li>
                        </ol>

                        <p className="text-xs text-gray-500 leading-relaxed">
                            Once saved, container nodes will show a <span className="text-purple-400">sparkle</span> button to auto-generate subtasks with Gemini AI.
                        </p>
                        <p className="text-[10px] text-gray-600 leading-relaxed">
                            Your key is stored locally in this browser only and never sent to our servers. It is sent only to Google's Gemini API.
                        </p>
                    </div>

                    <div className="pt-3 border-t border-gray-800">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                            Change Password
                        </h3>
                        <div className="relative mb-2">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="New password (min 6 chars)"
                                minLength={6}
                                className="w-full bg-gray-800 border border-gray-700 rounded-md pl-9 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
                            />
                        </div>
                        <button
                            onClick={handleChangePassword}
                            disabled={!newPassword.trim() || newPassword.length < 6 || changingPassword}
                            className={clsx(
                                "w-full px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                                newPassword.trim() && newPassword.length >= 6 && !changingPassword
                                    ? "bg-purple-600 hover:bg-purple-500 text-white"
                                    : "bg-gray-800 text-gray-600 cursor-not-allowed"
                            )}
                        >
                            {changingPassword ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex-1 overflow-y-auto p-2">
                        <div className="flex items-center justify-between mb-2 px-2">
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Projects</h3>
                            <button
                                onClick={() => setIsCreating(true)}
                                className="p-0.5 rounded text-gray-500 hover:text-purple-400 hover:bg-gray-800 transition-colors"
                                title="New project"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-1">
                            {isCreating && (
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const title = newProjectTitle.trim() || 'Untitled Project';
                                        createProject(title);
                                        setNewProjectTitle('');
                                        setIsCreating(false);
                                        addToast(`Created "${title}"`, 'success');
                                    }}
                                >
                                    <input
                                        autoFocus
                                        value={newProjectTitle}
                                        onChange={(e) => setNewProjectTitle(e.target.value)}
                                        onBlur={() => {
                                            if (!newProjectTitle.trim()) {
                                                setIsCreating(false);
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Escape') {
                                                setNewProjectTitle('');
                                                setIsCreating(false);
                                            }
                                        }}
                                        placeholder="Project name..."
                                        className="w-full px-3 py-2 rounded-md text-sm bg-gray-800 border border-purple-600 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
                                    />
                                </form>
                            )}
                            {projects.map(project => (
                                <div key={project.id} className="group relative flex items-center">
                                    <button
                                        onClick={() => { loadProject(project.id); if (isMobile) closeSidebar(); }}
                                        className={clsx(
                                            "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                                            activeProjectId === project.id
                                                ? "bg-purple-900/30 text-purple-300 border border-purple-800"
                                                : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                                        )}
                                    >
                                        {project.title}
                                    </button>
                                    {projects.length > 1 && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(project.id); }}
                                            className="absolute right-1 p-1 rounded text-gray-600 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-gray-800 transition-all"
                                            title="Delete project"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-800 space-y-1">
                        {user && (
                            <div className="flex items-center gap-2 text-xs text-gray-400 px-2 py-1">
                                <User className="w-3 h-3 shrink-0" />
                                <span className="truncate">{user.email}</span>
                            </div>
                        )}
                        <button
                            onClick={() => setShowResetConfirm(true)}
                            className="flex items-center gap-2 text-xs text-gray-500 hover:text-red-400 w-full px-2 py-2"
                        >
                            <RefreshCw className="w-3 h-3" />
                            Reset to Demo Data
                        </button>
                        <button
                            onClick={() => supabase.auth.signOut()}
                            className="flex items-center gap-2 text-xs text-gray-500 hover:text-red-400 w-full px-2 py-2"
                        >
                            <LogOut className="w-3 h-3" />
                            Sign Out
                        </button>
                    </div>
                </>
            )}
        </div>
    );

    const deleteConfirmProject = deleteConfirmId ? projects.find(p => p.id === deleteConfirmId) : null;
    const deleteConfirmModal = deleteConfirmProject ? (
        <ConfirmModal
            title="Delete Project"
            message={`Delete "${deleteConfirmProject.title}" and all its contents? This cannot be undone.`}
            confirmLabel="Delete Project"
            danger
            onConfirm={() => {
                deleteProject(deleteConfirmProject.id);
                setDeleteConfirmId(null);
                addToast(`Deleted "${deleteConfirmProject.title}"`, 'info');
            }}
            onCancel={() => setDeleteConfirmId(null)}
        />
    ) : null;

    const resetConfirmModal = showResetConfirm ? (
        <ConfirmModal
            title="Reset to Demo Data"
            message="This will delete all your projects and replace them with sample data. This cannot be undone."
            confirmLabel="Reset Everything"
            danger
            onConfirm={() => {
                resetWorkspace(Math.random().toString());
                setShowResetConfirm(false);
                addToast('Workspace reset to demo data.', 'info');
            }}
            onCancel={() => setShowResetConfirm(false)}
        />
    ) : null;

    if (isMobile) {
        return (
            <>
                <div className="fixed inset-0 z-[80] flex" style={{ paddingTop: 'var(--sat, 0px)' }}>
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={closeSidebar}
                    />
                    {/* Drawer */}
                    <div className="relative z-10 animate-slide-in-left">
                        {sidebarContent}
                    </div>
                </div>
                {resetConfirmModal}
                {deleteConfirmModal}
            </>
        );
    }

    return (
        <>
            {sidebarContent}
            {resetConfirmModal}
            {deleteConfirmModal}
        </>
    );
};
