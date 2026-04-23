import React, { useMemo, useState } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../UI/Toast';
import { ConfirmModal } from '../UI/ConfirmModal';
import { FolderDeleteModal } from '../UI/FolderDeleteModal';
import { supabase } from '../../lib/supabase';
import { clsx } from 'clsx';
import { FolderGit2, RefreshCw, Settings, Eye, EyeOff, KeyRound, Trash2, ArrowLeft, ExternalLink, LogOut, User, Lock, Plus, Sparkles, FileUp, Keyboard, Sun, Moon, FolderPlus, ChevronDown, ChevronRight, MoreHorizontal } from 'lucide-react';
import { useDeviceDetect } from '../../hooks/useDeviceDetect';
import type { Project } from '../../types';

interface SidebarProps {
    onGenerateFlow?: () => void;
    onImportPlan?: () => void;
    onShowShortcuts?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onGenerateFlow, onImportPlan, onShowShortcuts }) => {
    const { isMobile } = useDeviceDetect();
    const sidebarOpen = useWorkspaceStore(state => state.sidebarOpen);
    const closeSidebar = useWorkspaceStore(state => state.closeSidebar);
    const projects = useWorkspaceStore(state => state.projects);
    const folders = useWorkspaceStore(state => state.folders);
    const activeProjectId = useWorkspaceStore(state => state.activeProjectId);
    const loadProject = useWorkspaceStore(state => state.loadProject);
    const createProject = useWorkspaceStore(state => state.createProject);
    const deleteProject = useWorkspaceStore(state => state.deleteProject);
    const renameProject = useWorkspaceStore(state => state.renameProject);
    const createFolder = useWorkspaceStore(state => state.createFolder);
    const renameFolder = useWorkspaceStore(state => state.renameFolder);
    const deleteFolder = useWorkspaceStore(state => state.deleteFolder);
    const toggleFolderCollapsed = useWorkspaceStore(state => state.toggleFolderCollapsed);
    const moveProjectToFolder = useWorkspaceStore(state => state.moveProjectToFolder);
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
    // Target folder for inline-create. null = ungrouped root, string = folder id.
    const [creatingInFolderId, setCreatingInFolderId] = useState<string | null>(null);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
    const [editingProjectTitle, setEditingProjectTitle] = useState('');

    // Folder-related state
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderTitle, setNewFolderTitle] = useState('');
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
    const [editingFolderTitle, setEditingFolderTitle] = useState('');
    const [folderDeleteId, setFolderDeleteId] = useState<string | null>(null);
    const [emptyFolderDeleteId, setEmptyFolderDeleteId] = useState<string | null>(null);

    // Drag and drop state
    const [draggingProjectId, setDraggingProjectId] = useState<string | null>(null);
    const [dragOverTarget, setDragOverTarget] = useState<string | null>(null); // 'ungrouped' | folderId

    // Mobile action sheet state
    const [mobileActionProjectId, setMobileActionProjectId] = useState<string | null>(null);
    const [moveSheetProjectId, setMoveSheetProjectId] = useState<string | null>(null);

    const sortedFolders = useMemo(
        () => folders.slice().sort((a, b) => a.order - b.order),
        [folders]
    );
    const ungroupedProjects = useMemo(
        () => projects.filter(p => !p.folderId),
        [projects]
    );
    const projectsByFolder = useMemo(() => {
        const map = new Map<string, Project[]>();
        folders.forEach(f => map.set(f.id, []));
        projects.forEach(p => {
            if (p.folderId && map.has(p.folderId)) {
                map.get(p.folderId)!.push(p);
            }
        });
        return map;
    }, [folders, projects]);

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

    const renderProjectRow = (project: Project) => {
        const isEditing = editingProjectId === project.id;
        const isDragging = draggingProjectId === project.id;
        const canDrag = !isMobile && !isEditing;
        return (
            <div
                key={project.id}
                className={clsx("group relative flex items-center", isDragging && "opacity-50")}
                draggable={canDrag}
                onDragStart={canDrag ? (e) => {
                    e.dataTransfer.setData('application/x-spatialtasks-project', project.id);
                    e.dataTransfer.effectAllowed = 'move';
                    setDraggingProjectId(project.id);
                } : undefined}
                onDragEnd={canDrag ? () => {
                    setDraggingProjectId(null);
                    setDragOverTarget(null);
                } : undefined}
            >
                {isEditing ? (
                    <input
                        autoFocus
                        value={editingProjectTitle}
                        onChange={(e) => setEditingProjectTitle(e.target.value)}
                        onBlur={() => {
                            const trimmed = editingProjectTitle.trim();
                            if (trimmed && trimmed !== project.title) {
                                renameProject(project.id, trimmed);
                            }
                            setEditingProjectId(null);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            if (e.key === 'Escape') setEditingProjectId(null);
                        }}
                        className="w-full px-3 py-2 rounded-md text-sm bg-gray-800 border border-purple-600 text-white placeholder-gray-500 focus:outline-none"
                    />
                ) : (
                    <button
                        onClick={() => { loadProject(project.id); if (isMobile) closeSidebar(); }}
                        onDoubleClick={() => { setEditingProjectId(project.id); setEditingProjectTitle(project.title); }}
                        className={clsx(
                            "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                            activeProjectId === project.id
                                ? "bg-purple-900/30 text-purple-300 border border-purple-800"
                                : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                        )}
                    >
                        {project.title}
                    </button>
                )}
                {!isEditing && isMobile && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setMobileActionProjectId(project.id); }}
                        className="absolute right-1 p-1 rounded text-gray-600 opacity-70 hover:text-gray-300 hover:bg-gray-800 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Project actions"
                    >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                )}
                {!isEditing && !isMobile && projects.length > 1 && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(project.id); }}
                        className="absolute right-1 p-1 rounded text-gray-600 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-gray-800 transition-all"
                        title="Delete project"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        );
    };

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
                        "p-1.5 rounded-md transition-colors touch:min-h-[44px] touch:min-w-[44px] touch:flex touch:items-center touch:justify-center",
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
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 touch:min-h-[44px] touch:min-w-[44px] touch:flex touch:items-center touch:justify-center"
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
                        {/* Generate Flow CTA */}
                        {onGenerateFlow && (
                            <button
                                onClick={() => { onGenerateFlow(); if (isMobile) closeSidebar(); }}
                                className="w-full flex items-center gap-2 px-3 py-2.5 mb-2 rounded-lg text-sm font-medium bg-purple-600/20 border border-purple-700/50 text-purple-300 hover:bg-purple-600/30 hover:text-purple-200 transition-colors"
                            >
                                <Sparkles className="w-4 h-4" />
                                Generate Flow
                            </button>
                        )}
                        {/* Import Plan CTA */}
                        {onImportPlan && (
                            <button
                                onClick={() => { onImportPlan(); if (isMobile) closeSidebar(); }}
                                className="w-full flex items-center gap-2 px-3 py-2.5 mb-3 rounded-lg text-sm font-medium bg-emerald-600/20 border border-emerald-700/50 text-emerald-300 hover:bg-emerald-600/30 hover:text-emerald-200 transition-colors"
                            >
                                <FileUp className="w-4 h-4" />
                                Import Plan
                            </button>
                        )}
                        <div className="flex items-center justify-between mb-2 px-2">
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Projects</h3>
                            <div className="flex items-center gap-0.5">
                                <button
                                    onClick={() => { setIsCreatingFolder(true); setIsCreating(false); }}
                                    className="p-0.5 rounded text-gray-500 hover:text-purple-400 hover:bg-gray-800 transition-colors"
                                    title="New folder"
                                >
                                    <FolderPlus className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => { setIsCreating(true); setCreatingInFolderId(null); setIsCreatingFolder(false); }}
                                    className="p-0.5 rounded text-gray-500 hover:text-purple-400 hover:bg-gray-800 transition-colors"
                                    title="New project"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div className="space-y-1">
                            {isCreatingFolder && (
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const title = newFolderTitle.trim() || 'Untitled Folder';
                                        createFolder(title);
                                        setNewFolderTitle('');
                                        setIsCreatingFolder(false);
                                        addToast(`Created folder "${title}"`, 'success');
                                    }}
                                >
                                    <input
                                        autoFocus
                                        value={newFolderTitle}
                                        onChange={(e) => setNewFolderTitle(e.target.value)}
                                        onBlur={() => {
                                            if (!newFolderTitle.trim()) {
                                                setIsCreatingFolder(false);
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Escape') {
                                                setNewFolderTitle('');
                                                setIsCreatingFolder(false);
                                            }
                                        }}
                                        placeholder="Folder name..."
                                        className="w-full px-3 py-2 rounded-md text-sm bg-gray-800 border border-purple-600 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
                                    />
                                </form>
                            )}
                            {isCreating && creatingInFolderId === null && (
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

                            {/* Ungrouped section — drop zone for projects moved out of folders */}
                            <div
                                className={clsx(
                                    "rounded-md transition-colors",
                                    dragOverTarget === 'ungrouped' && "ring-1 ring-purple-500 bg-purple-900/10"
                                )}
                                onDragOver={(e) => {
                                    if (!draggingProjectId) return;
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';
                                    if (dragOverTarget !== 'ungrouped') setDragOverTarget('ungrouped');
                                }}
                                onDragLeave={(e) => {
                                    const related = e.relatedTarget as globalThis.Node | null;
                                    if (related && e.currentTarget.contains(related)) return;
                                    if (dragOverTarget === 'ungrouped') setDragOverTarget(null);
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    const id = e.dataTransfer.getData('application/x-spatialtasks-project');
                                    if (id) moveProjectToFolder(id, null);
                                    setDragOverTarget(null);
                                    setDraggingProjectId(null);
                                }}
                            >
                                {ungroupedProjects.map(project => renderProjectRow(project))}
                                {folders.length > 0 && ungroupedProjects.length === 0 && (
                                    <div className="px-3 py-1.5 text-[11px] text-gray-600 italic select-none">
                                        Drop here to ungroup
                                    </div>
                                )}
                            </div>

                            {/* Folder sections */}
                            {sortedFolders.map(folder => {
                                const folderProjects = projectsByFolder.get(folder.id) ?? [];
                                const isDragOver = dragOverTarget === folder.id;
                                return (
                                    <div key={folder.id} className="mt-1">
                                        <div
                                            className={clsx(
                                                "group flex items-center rounded-md transition-colors",
                                                isDragOver && "ring-1 ring-purple-500 bg-purple-900/10"
                                            )}
                                            onDragOver={(e) => {
                                                if (!draggingProjectId) return;
                                                e.preventDefault();
                                                e.dataTransfer.dropEffect = 'move';
                                                if (dragOverTarget !== folder.id) setDragOverTarget(folder.id);
                                            }}
                                            onDragLeave={(e) => {
                                                const related = e.relatedTarget as globalThis.Node | null;
                                                if (related && e.currentTarget.contains(related)) return;
                                                if (dragOverTarget === folder.id) setDragOverTarget(null);
                                            }}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                const id = e.dataTransfer.getData('application/x-spatialtasks-project');
                                                if (id) moveProjectToFolder(id, folder.id);
                                                setDragOverTarget(null);
                                                setDraggingProjectId(null);
                                            }}
                                        >
                                            <button
                                                onClick={() => toggleFolderCollapsed(folder.id)}
                                                className="p-1 text-gray-500 hover:text-gray-300 touch:min-h-[44px] touch:min-w-[44px] touch:flex touch:items-center touch:justify-center"
                                                title={folder.collapsed ? 'Expand folder' : 'Collapse folder'}
                                            >
                                                {folder.collapsed
                                                    ? <ChevronRight className="w-3.5 h-3.5" />
                                                    : <ChevronDown className="w-3.5 h-3.5" />}
                                            </button>
                                            {editingFolderId === folder.id ? (
                                                <input
                                                    autoFocus
                                                    value={editingFolderTitle}
                                                    onChange={(e) => setEditingFolderTitle(e.target.value)}
                                                    onBlur={() => {
                                                        const trimmed = editingFolderTitle.trim();
                                                        if (trimmed && trimmed !== folder.title) {
                                                            renameFolder(folder.id, trimmed);
                                                        }
                                                        setEditingFolderId(null);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                                        if (e.key === 'Escape') setEditingFolderId(null);
                                                    }}
                                                    className="flex-1 px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider bg-gray-800 border border-purple-600 text-white focus:outline-none"
                                                />
                                            ) : (
                                                <button
                                                    onClick={() => toggleFolderCollapsed(folder.id)}
                                                    onDoubleClick={() => { setEditingFolderId(folder.id); setEditingFolderTitle(folder.title); }}
                                                    className="flex-1 text-left px-1 py-1 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-200 truncate"
                                                    title={folder.title}
                                                >
                                                    {folder.title}
                                                </button>
                                            )}
                                            {editingFolderId !== folder.id && (
                                                <>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setIsCreating(true);
                                                            setCreatingInFolderId(folder.id);
                                                            setIsCreatingFolder(false);
                                                            // Ensure folder is expanded so the user sees the form
                                                            if (folder.collapsed) toggleFolderCollapsed(folder.id);
                                                        }}
                                                        className="p-1 rounded text-gray-600 opacity-0 group-hover:opacity-100 touch:opacity-70 hover:text-purple-300 hover:bg-gray-800 transition-all touch:min-h-[44px] touch:min-w-[44px] touch:flex touch:items-center touch:justify-center"
                                                        title="New project in folder"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (folderProjects.length === 0) {
                                                                setEmptyFolderDeleteId(folder.id);
                                                            } else {
                                                                setFolderDeleteId(folder.id);
                                                            }
                                                        }}
                                                        className="p-1 mr-1 rounded text-gray-600 opacity-0 group-hover:opacity-100 touch:opacity-70 hover:text-red-400 hover:bg-gray-800 transition-all touch:min-h-[44px] touch:min-w-[44px] touch:flex touch:items-center touch:justify-center"
                                                        title="Delete folder"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                        {!folder.collapsed && (
                                            <div className="pl-4 mt-0.5 space-y-1 border-l border-gray-800 ml-3">
                                                {isCreating && creatingInFolderId === folder.id && (
                                                    <form
                                                        onSubmit={(e) => {
                                                            e.preventDefault();
                                                            const title = newProjectTitle.trim() || 'Untitled Project';
                                                            createProject(title, folder.id);
                                                            setNewProjectTitle('');
                                                            setIsCreating(false);
                                                            setCreatingInFolderId(null);
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
                                                                    setCreatingInFolderId(null);
                                                                }
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Escape') {
                                                                    setNewProjectTitle('');
                                                                    setIsCreating(false);
                                                                    setCreatingInFolderId(null);
                                                                }
                                                            }}
                                                            placeholder="Project name..."
                                                            className="w-full px-3 py-2 rounded-md text-sm bg-gray-800 border border-purple-600 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
                                                        />
                                                    </form>
                                                )}
                                                {folderProjects.map(project => renderProjectRow(project))}
                                                {folderProjects.length === 0 && !(isCreating && creatingInFolderId === folder.id) && (
                                                    <div className="px-3 py-1.5 text-[11px] text-gray-600 italic select-none">
                                                        No projects — drop one here
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-800 space-y-1">
                        {user && (
                            <div className="flex items-center gap-2 text-xs text-gray-400 px-2 py-1">
                                <User className="w-3 h-3 shrink-0" />
                                <span className="truncate">{user.email}</span>
                            </div>
                        )}
                        {onShowShortcuts && (
                            <button
                                onClick={onShowShortcuts}
                                className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 w-full px-2 py-2"
                                title="Show keyboard shortcuts (?)"
                            >
                                <Keyboard className="w-3 h-3" />
                                Keyboard shortcuts
                            </button>
                        )}
                        <button
                            onClick={() => {
                                const next = (settings.theme ?? 'dark') === 'dark' ? 'light' : 'dark';
                                updateSettings({ theme: next });
                            }}
                            className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 w-full px-2 py-2 touch:min-h-[44px]"
                            title={`Switch to ${(settings.theme ?? 'dark') === 'dark' ? 'light' : 'dark'} theme`}
                            aria-label={`Switch to ${(settings.theme ?? 'dark') === 'dark' ? 'light' : 'dark'} theme`}
                        >
                            {(settings.theme ?? 'dark') === 'dark'
                                ? <Sun className="w-3 h-3" />
                                : <Moon className="w-3 h-3" />}
                            {(settings.theme ?? 'dark') === 'dark' ? 'Light theme' : 'Dark theme'}
                        </button>
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

    const folderForDelete = folderDeleteId ? folders.find(f => f.id === folderDeleteId) : null;
    const projectsInDeletingFolder = folderForDelete
        ? projects.filter(p => p.folderId === folderForDelete.id)
        : [];
    const folderDeleteModal = folderForDelete ? (
        <FolderDeleteModal
            folderTitle={folderForDelete.title}
            projectCount={projectsInDeletingFolder.length}
            onKeepProjects={() => {
                deleteFolder(folderForDelete.id, { deleteProjects: false });
                addToast(`Deleted folder "${folderForDelete.title}"`, 'info');
                setFolderDeleteId(null);
            }}
            onDeleteProjects={() => {
                const ok = deleteFolder(folderForDelete.id, { deleteProjects: true });
                if (ok) {
                    addToast(`Deleted folder "${folderForDelete.title}" and its projects`, 'info');
                } else {
                    addToast(`Can't delete — workspace must keep at least one project`, 'error');
                }
                setFolderDeleteId(null);
            }}
            onCancel={() => setFolderDeleteId(null)}
        />
    ) : null;

    const emptyFolderForDelete = emptyFolderDeleteId ? folders.find(f => f.id === emptyFolderDeleteId) : null;
    const emptyFolderDeleteModal = emptyFolderForDelete ? (
        <ConfirmModal
            title="Delete Folder"
            message={`Delete empty folder "${emptyFolderForDelete.title}"?`}
            confirmLabel="Delete Folder"
            danger
            onConfirm={() => {
                deleteFolder(emptyFolderForDelete.id, { deleteProjects: false });
                addToast(`Deleted folder "${emptyFolderForDelete.title}"`, 'info');
                setEmptyFolderDeleteId(null);
            }}
            onCancel={() => setEmptyFolderDeleteId(null)}
        />
    ) : null;

    const mobileActionProject = mobileActionProjectId
        ? projects.find(p => p.id === mobileActionProjectId)
        : null;
    const mobileActionSheet = mobileActionProject ? (
        <div
            className="fixed inset-0 z-[100] flex items-end justify-center"
            onClick={() => setMobileActionProjectId(null)}
        >
            <div className="absolute inset-0 bg-black/60" />
            <div
                className="relative bg-slate-800 border-t border-slate-700 rounded-t-xl shadow-2xl w-full p-4 space-y-2"
                onClick={e => e.stopPropagation()}
            >
                <div className="text-xs uppercase tracking-wider text-slate-500 text-center mb-2 truncate px-2">
                    {mobileActionProject.title}
                </div>
                <button
                    onClick={() => {
                        setEditingProjectId(mobileActionProject.id);
                        setEditingProjectTitle(mobileActionProject.title);
                        setMobileActionProjectId(null);
                    }}
                    className="w-full px-4 py-3 rounded-lg text-sm font-medium bg-slate-700 hover:bg-slate-600 text-slate-100 transition-colors text-left"
                >
                    Rename
                </button>
                <button
                    onClick={() => {
                        setMoveSheetProjectId(mobileActionProject.id);
                        setMobileActionProjectId(null);
                    }}
                    className="w-full px-4 py-3 rounded-lg text-sm font-medium bg-slate-700 hover:bg-slate-600 text-slate-100 transition-colors text-left"
                >
                    Move to folder…
                </button>
                {projects.length > 1 && (
                    <button
                        onClick={() => {
                            setDeleteConfirmId(mobileActionProject.id);
                            setMobileActionProjectId(null);
                        }}
                        className="w-full px-4 py-3 rounded-lg text-sm font-medium bg-red-600/20 text-red-300 hover:bg-red-600/30 transition-colors text-left"
                    >
                        Delete
                    </button>
                )}
                <button
                    onClick={() => setMobileActionProjectId(null)}
                    className="w-full px-4 py-3 rounded-lg text-sm font-medium text-slate-400 bg-slate-900 hover:bg-slate-700 transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
    ) : null;

    const moveSheetProject = moveSheetProjectId
        ? projects.find(p => p.id === moveSheetProjectId)
        : null;
    const moveSheet = moveSheetProject ? (
        <div
            className="fixed inset-0 z-[100] flex items-end justify-center"
            onClick={() => setMoveSheetProjectId(null)}
        >
            <div className="absolute inset-0 bg-black/60" />
            <div
                className="relative bg-slate-800 border-t border-slate-700 rounded-t-xl shadow-2xl w-full p-4 max-h-[70vh] overflow-y-auto space-y-2"
                onClick={e => e.stopPropagation()}
            >
                <div className="text-xs uppercase tracking-wider text-slate-500 text-center mb-2">
                    Move &ldquo;{moveSheetProject.title}&rdquo; to…
                </div>
                <button
                    onClick={() => {
                        moveProjectToFolder(moveSheetProject.id, null);
                        setMoveSheetProjectId(null);
                        addToast('Moved to Ungrouped', 'success');
                    }}
                    disabled={!moveSheetProject.folderId}
                    className={clsx(
                        "w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left",
                        !moveSheetProject.folderId
                            ? "bg-slate-900 text-slate-500 cursor-default"
                            : "bg-slate-700 hover:bg-slate-600 text-slate-100"
                    )}
                >
                    Ungrouped {!moveSheetProject.folderId && '(current)'}
                </button>
                {sortedFolders.map(folder => {
                    const isCurrent = moveSheetProject.folderId === folder.id;
                    return (
                        <button
                            key={folder.id}
                            onClick={() => {
                                moveProjectToFolder(moveSheetProject.id, folder.id);
                                setMoveSheetProjectId(null);
                                addToast(`Moved to "${folder.title}"`, 'success');
                            }}
                            disabled={isCurrent}
                            className={clsx(
                                "w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left",
                                isCurrent
                                    ? "bg-slate-900 text-slate-500 cursor-default"
                                    : "bg-slate-700 hover:bg-slate-600 text-slate-100"
                            )}
                        >
                            {folder.title} {isCurrent && '(current)'}
                        </button>
                    );
                })}
                <button
                    onClick={() => {
                        const title = window.prompt('New folder name');
                        const trimmed = (title ?? '').trim();
                        if (!trimmed) return;
                        const id = createFolder(trimmed);
                        moveProjectToFolder(moveSheetProject.id, id);
                        setMoveSheetProjectId(null);
                        addToast(`Created folder "${trimmed}"`, 'success');
                    }}
                    className="w-full px-4 py-3 rounded-lg text-sm font-medium bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 transition-colors text-left flex items-center gap-2"
                >
                    <FolderPlus className="w-4 h-4" />
                    New folder…
                </button>
                <button
                    onClick={() => setMoveSheetProjectId(null)}
                    className="w-full px-4 py-3 rounded-lg text-sm font-medium text-slate-400 bg-slate-900 hover:bg-slate-700 transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
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
                {folderDeleteModal}
                {emptyFolderDeleteModal}
                {mobileActionSheet}
                {moveSheet}
            </>
        );
    }

    return (
        <>
            {sidebarContent}
            {resetConfirmModal}
            {deleteConfirmModal}
            {folderDeleteModal}
            {emptyFolderDeleteModal}
        </>
    );
};
