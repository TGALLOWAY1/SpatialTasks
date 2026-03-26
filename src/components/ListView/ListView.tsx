import React, { useMemo, useState, useCallback } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { Node, Graph } from '../../types';
import { isNodeBlocked, getContainerProgress } from '../../utils/logic';
import {
    CheckCircle2, Circle, Clock, Lock, Layers, ArrowRightCircle,
    Pencil, Sparkles, Loader2, ChevronRight, ChevronDown, GitBranch,
} from 'lucide-react';
import { clsx } from 'clsx';
import { v4 as uuidv4 } from 'uuid';
import { magicExpand, GeminiError } from '../../services/gemini';
import { useToastStore } from '../UI/Toast';
import { ConfirmModal } from '../UI/ConfirmModal';

const StatusIcon = ({ status, blocked, size = 'sm' }: { status?: string; blocked?: boolean; size?: 'sm' | 'md' }) => {
    const cls = size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
    if (blocked) return <Lock className={clsx(cls, 'text-gray-500')} />;
    switch (status) {
        case 'done': return <CheckCircle2 className={clsx(cls, 'text-green-400')} />;
        case 'in_progress': return <Clock className={clsx(cls, 'text-blue-400')} />;
        default: return <Circle className={clsx(cls, 'text-gray-500')} />;
    }
};

/**
 * Topological sort of nodes based on edges, grouping parallel tasks by depth.
 * Returns an array of { node, depth } where depth indicates dependency level.
 */
function topoSortWithDepth(graph: Graph): { node: Node; depth: number }[] {
    const nodeMap = new Map(graph.nodes.map(n => [n.id, n]));
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();
    const depthMap = new Map<string, number>();

    for (const n of graph.nodes) {
        inDegree.set(n.id, 0);
        adj.set(n.id, []);
    }
    for (const e of graph.edges) {
        if (nodeMap.has(e.source) && nodeMap.has(e.target)) {
            adj.get(e.source)!.push(e.target);
            inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
        }
    }

    // BFS-based topological sort with depth tracking
    const queue: string[] = [];
    for (const [id, deg] of inDegree) {
        if (deg === 0) {
            queue.push(id);
            depthMap.set(id, 0);
        }
    }

    const sorted: string[] = [];
    while (queue.length > 0) {
        const id = queue.shift()!;
        sorted.push(id);
        const currentDepth = depthMap.get(id) ?? 0;
        for (const neighbor of adj.get(id) ?? []) {
            const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
            inDegree.set(neighbor, newDeg);
            // Take max depth from all predecessors
            depthMap.set(neighbor, Math.max(depthMap.get(neighbor) ?? 0, currentDepth + 1));
            if (newDeg === 0) {
                queue.push(neighbor);
            }
        }
    }

    // Include any nodes not in the sorted result (disconnected/cycle)
    for (const n of graph.nodes) {
        if (!sorted.includes(n.id)) {
            sorted.push(n.id);
            depthMap.set(n.id, 0);
        }
    }

    return sorted.map(id => ({
        node: nodeMap.get(id)!,
        depth: depthMap.get(id) ?? 0,
    }));
}

/**
 * Check how many nodes share the same depth (parallel tasks).
 */
function getParallelCounts(items: { node: Node; depth: number }[]): Map<number, number> {
    const counts = new Map<number, number>();
    for (const item of items) {
        counts.set(item.depth, (counts.get(item.depth) ?? 0) + 1);
    }
    return counts;
}

const ActionItem: React.FC<{ node: Node; blocked: boolean; depth: number; isParallel: boolean }> = ({ node, blocked, depth, isParallel }) => {
    const cycleNodeStatus = useWorkspaceStore(state => state.cycleNodeStatus);
    const updateNode = useWorkspaceStore(state => state.updateNode);
    const [editing, setEditing] = useState(false);
    const [editValue, setEditValue] = useState(node.title);

    const handleStatusClick = useCallback(() => {
        if (blocked) return;
        cycleNodeStatus(node.id);
    }, [blocked, cycleNodeStatus, node.id]);

    const save = useCallback(() => {
        if (editValue.trim() && editValue.trim() !== node.title) {
            updateNode(node.id, { title: editValue.trim() });
        }
        setEditing(false);
    }, [editValue, node.title, node.id, updateNode]);

    return (
        <div
            className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors',
                blocked ? 'bg-slate-900/50 border-slate-800 opacity-70' : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600',
                node.status === 'done' && 'opacity-60',
            )}
            style={{ marginLeft: depth * 24 }}
        >
            {isParallel && (
                <GitBranch className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 -rotate-90" />
            )}
            <button
                onClick={handleStatusClick}
                className={clsx(
                    'flex-shrink-0 transition-transform touch:min-h-[44px] touch:min-w-[44px] touch:flex touch:items-center touch:justify-center',
                    !blocked && 'hover:scale-110 cursor-pointer'
                )}
            >
                <StatusIcon status={node.status} blocked={blocked} size="md" />
            </button>

            {editing ? (
                <input
                    className="bg-transparent border-b border-slate-500 outline-none text-sm text-slate-200 flex-1"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter') save();
                        if (e.key === 'Escape') setEditing(false);
                    }}
                    onBlur={save}
                    autoFocus
                />
            ) : (
                <span
                    className={clsx(
                        'text-sm text-slate-200 flex-1 cursor-text',
                        node.status === 'done' && 'line-through text-slate-400',
                        blocked && 'text-slate-500',
                    )}
                    onDoubleClick={() => { setEditing(true); setEditValue(node.title); }}
                >
                    {node.title}
                </span>
            )}

            {blocked && (
                <span className="text-[10px] text-red-300 bg-red-900/60 px-1.5 py-0.5 rounded-full border border-red-800/50 flex-shrink-0">
                    Blocked
                </span>
            )}

            {!editing && (
                <button
                    onClick={() => { setEditing(true); setEditValue(node.title); }}
                    className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
                >
                    <Pencil className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );
};

const ContainerItem: React.FC<{
    node: Node;
    depth: number;
    isParallel: boolean;
    expanded: boolean;
    onToggle: () => void;
}> = ({ node, depth, isParallel, expanded, onToggle }) => {
    const enterGraph = useWorkspaceStore(state => state.enterGraph);
    const activeGraphId = useWorkspaceStore(state => state.activeGraphId);
    const graphs = useWorkspaceStore(state => state.graphs);
    const settings = useWorkspaceStore(state => state.settings);
    const addGraph = useWorkspaceStore(state => state.addGraph);
    const removeGraphTree = useWorkspaceStore(state => state.removeGraphTree);
    const updateNode = useWorkspaceStore(state => state.updateNode);
    const updateSettings = useWorkspaceStore(state => state.updateSettings);
    const addToast = useToastStore(state => state.addToast);

    const [expanding, setExpanding] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editValue, setEditValue] = useState(node.title);
    const [showExpandConfirm, setShowExpandConfirm] = useState(false);

    const progress = useMemo(() => getContainerProgress(node, { graphs } as any), [node, graphs]);
    const hasApiKey = !!settings.geminiApiKey;
    const hasExistingChildren = !!(node.childGraphId && graphs[node.childGraphId]?.nodes.length > 0);
    const percentage = Math.round(progress * 100);

    const saveTitle = useCallback(() => {
        if (editValue.trim() && editValue.trim() !== node.title) {
            updateNode(node.id, { title: editValue.trim() });
        }
        setEditing(false);
    }, [editValue, node.title, node.id, updateNode]);

    const handleEnter = () => {
        if (node.childGraphId) {
            enterGraph(node.childGraphId, node.id, node.title);
        } else {
            const currentGraph = activeGraphId ? graphs[activeGraphId] : null;
            const projectId = currentGraph?.projectId || '';
            const childGraphId = uuidv4();
            const childGraph: Graph = {
                id: childGraphId, projectId, title: node.title,
                nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 },
            };
            addGraph(childGraph);
            updateNode(node.id, { childGraphId });
            enterGraph(childGraphId, node.id, node.title);
        }
    };

    const doMagicExpand = async () => {
        setExpanding(true);
        try {
            const result = await magicExpand(settings.geminiApiKey!, node.title, node.meta?.notes);

            // Clean up old child graph tree to prevent orphans
            if (node.childGraphId) {
                removeGraphTree(node.childGraphId);
            }

            const currentGraph = activeGraphId ? graphs[activeGraphId] : null;
            const projectId = currentGraph?.projectId || '';
            const childGraphId = uuidv4();
            const childGraph: Graph = {
                id: childGraphId, projectId, title: node.title,
                nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 },
            };
            const idMap: Record<string, string> = {};
            result.subtasks.forEach((subtask, index) => {
                const nodeId = uuidv4();
                idMap[subtask.id] = nodeId;
                childGraph.nodes.push({
                    id: nodeId, graphId: childGraphId, type: 'action', title: subtask.title,
                    x: index * 250, y: (index % 2 === 0) ? 0 : 50, width: 200, height: 80, status: 'todo',
                });
            });
            result.subtasks.forEach((subtask) => {
                const targetId = idMap[subtask.id];
                subtask.dependsOn.forEach((depSlug) => {
                    const sourceId = idMap[depSlug];
                    if (sourceId && targetId) {
                        childGraph.edges.push({ id: uuidv4(), graphId: childGraphId, source: sourceId, target: targetId });
                    }
                });
            });
            addGraph(childGraph);
            updateNode(node.id, { childGraphId });
            enterGraph(childGraphId, node.id, node.title);
            addToast(`Generated ${result.subtasks.length} subtasks for "${node.title}"`, 'success');
        } catch (err) {
            const geminiErr = err as GeminiError;
            addToast(geminiErr.message || 'Magic Expand failed.', 'error');
            if (geminiErr.type === 'invalid_key') updateSettings({ geminiStatus: 'error' });
        } finally {
            setExpanding(false);
        }
    };

    const handleMagicExpand = () => {
        if (!settings.geminiApiKey) return;
        if (hasExistingChildren) { setShowExpandConfirm(true); return; }
        doMagicExpand();
    };

    return (
        <>
            <div
                className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-indigo-950/50 border-indigo-800/50 hover:border-indigo-600/50 transition-colors"
                style={{ marginLeft: depth * 24 }}
            >
                {/* Expand/collapse toggle */}
                <button
                    onClick={onToggle}
                    className="flex-shrink-0 text-indigo-400 hover:text-indigo-200 transition-colors p-0.5"
                    title={expanded ? 'Collapse' : 'Expand'}
                >
                    {expanded
                        ? <ChevronDown className="w-4 h-4" />
                        : <ChevronRight className="w-4 h-4" />
                    }
                </button>

                {isParallel && (
                    <GitBranch className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 -rotate-90" />
                )}

                <Layers className="w-5 h-5 text-indigo-400 flex-shrink-0" />

                <div className="flex-1 min-w-0">
                    {editing ? (
                        <input
                            className="bg-transparent border-b border-indigo-500 outline-none text-sm text-indigo-100 font-bold w-full"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') saveTitle();
                                if (e.key === 'Escape') setEditing(false);
                            }}
                            onBlur={saveTitle}
                            autoFocus
                        />
                    ) : (
                        <span
                            className="font-bold text-sm text-indigo-100 block cursor-text"
                            onDoubleClick={() => { setEditing(true); setEditValue(node.title); }}
                        >
                            {node.title}
                        </span>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                        <div className="h-1.5 flex-1 bg-indigo-900 rounded-full overflow-hidden max-w-[120px]">
                            <div
                                className="h-full bg-indigo-400 transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                        <span className="text-[10px] text-indigo-300">{percentage}%</span>
                    </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                    {!editing && (
                        <button
                            onClick={() => { setEditing(true); setEditValue(node.title); }}
                            className="text-indigo-400 hover:text-indigo-200 transition-colors p-1"
                        >
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {hasApiKey && (
                        <button
                            onClick={handleMagicExpand}
                            disabled={expanding}
                            className="text-purple-300 hover:text-purple-100 transition-all p-1 disabled:opacity-50 touch:min-h-[44px] touch:min-w-[44px] touch:flex touch:items-center touch:justify-center"
                            title="Magic Expand"
                        >
                            {expanding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        </button>
                    )}
                    <button
                        onClick={handleEnter}
                        className="text-indigo-200 hover:text-white transition-all p-1 touch:min-h-[44px] touch:min-w-[44px] touch:flex touch:items-center touch:justify-center"
                        title="Enter subgraph"
                    >
                        <ArrowRightCircle className="w-5 h-5" />
                    </button>
                </div>
            </div>
            {showExpandConfirm && (
                <ConfirmModal
                    title="Replace Subtasks"
                    message="This container already has subtasks. Replace them with AI-generated ones?"
                    confirmLabel="Replace"
                    danger
                    onConfirm={() => { setShowExpandConfirm(false); doMagicExpand(); }}
                    onCancel={() => setShowExpandConfirm(false)}
                />
            )}
        </>
    );
};

/**
 * Renders the inline-expanded children of a container, recursively.
 */
const ExpandedChildren: React.FC<{
    childGraphId: string;
    parentDepth: number;
    expandedContainers: Set<string>;
    toggleExpand: (id: string) => void;
}> = ({ childGraphId, parentDepth, expandedContainers, toggleExpand }) => {
    const graphs = useWorkspaceStore(state => state.graphs);
    const childGraph = graphs[childGraphId];

    const sortedItems = useMemo(() => {
        if (!childGraph) return [];
        return topoSortWithDepth(childGraph);
    }, [childGraph]);

    const parallelCounts = useMemo(() => getParallelCounts(sortedItems), [sortedItems]);

    if (!childGraph || sortedItems.length === 0) {
        return (
            <div
                className="text-xs text-gray-500 italic py-2 px-4"
                style={{ marginLeft: (parentDepth + 1) * 24 }}
            >
                No subtasks yet
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {/* Subtle connector line */}
            {sortedItems.map(({ node, depth }) => {
                const itemDepth = parentDepth + 1 + depth;
                const isParallel = (parallelCounts.get(depth) ?? 0) > 1;

                if (node.type === 'container') {
                    const isExpanded = expandedContainers.has(node.id);
                    return (
                        <div key={node.id}>
                            <ContainerItem
                                node={node}
                                depth={itemDepth}
                                isParallel={isParallel}
                                expanded={isExpanded}
                                onToggle={() => toggleExpand(node.id)}
                            />
                            {isExpanded && node.childGraphId && (
                                <ExpandedChildren
                                    childGraphId={node.childGraphId}
                                    parentDepth={itemDepth}
                                    expandedContainers={expandedContainers}
                                    toggleExpand={toggleExpand}
                                />
                            )}
                        </div>
                    );
                }

                const blocked = isNodeBlocked(node, childGraph);
                return (
                    <ActionItem
                        key={node.id}
                        node={node}
                        blocked={blocked}
                        depth={itemDepth}
                        isParallel={isParallel}
                    />
                );
            })}
        </div>
    );
};

export const ListView: React.FC = () => {
    const activeGraphId = useWorkspaceStore(state => state.activeGraphId);
    const graphs = useWorkspaceStore(state => state.graphs);
    const addNode = useWorkspaceStore(state => state.addNode);

    const graph = activeGraphId ? graphs[activeGraphId] : null;

    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [expandedContainers, setExpandedContainers] = useState<Set<string>>(new Set());

    const toggleExpand = useCallback((id: string) => {
        setExpandedContainers(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    // Topologically sort nodes with depth for dependency-aware ordering
    const sortedItems = useMemo(() => {
        if (!graph) return [];
        return topoSortWithDepth(graph);
    }, [graph]);

    const parallelCounts = useMemo(() => getParallelCounts(sortedItems), [sortedItems]);

    const getNextNodePosition = useCallback(() => {
        if (!graph || graph.nodes.length === 0) {
            return { x: 0, y: 0 };
        }
        const sortedByY = [...graph.nodes].sort((a, b) => (a.y + (a.height ?? 50)) - (b.y + (b.height ?? 50)));
        const lastNode = sortedByY[sortedByY.length - 1];
        return {
            x: lastNode.x,
            y: lastNode.y + (lastNode.height ?? 50) + 30,
        };
    }, [graph]);

    const handleAddTask = useCallback(() => {
        if (!newTaskTitle.trim() || !activeGraphId) return;
        const pos = getNextNodePosition();
        addNode({
            id: uuidv4(),
            graphId: activeGraphId,
            type: 'action',
            title: newTaskTitle.trim(),
            x: pos.x,
            y: pos.y,
            width: 200,
            height: 50,
            status: 'todo',
        });
        setNewTaskTitle('');
    }, [newTaskTitle, activeGraphId, addNode, getNextNodePosition]);

    if (!graph) {
        return <div className="text-gray-500 flex items-center justify-center h-full">No graph selected</div>;
    }

    const doneCount = graph.nodes.filter(n => n.type === 'action' && n.status === 'done').length;
    const totalActions = graph.nodes.filter(n => n.type === 'action').length;

    return (
        <div className="flex-1 h-full bg-gray-950 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
                {/* Summary header */}
                {totalActions > 0 && (
                    <div className="flex items-center justify-between px-2 pb-2 border-b border-gray-800">
                        <span className="text-xs text-gray-400">
                            {doneCount} of {totalActions} tasks complete
                        </span>
                        <div className="h-1.5 w-24 bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-green-500 transition-all duration-500"
                                style={{ width: `${totalActions > 0 ? (doneCount / totalActions) * 100 : 0}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Dependency-sorted task list */}
                {sortedItems.map(({ node, depth }) => {
                    const isParallel = (parallelCounts.get(depth) ?? 0) > 1;

                    if (node.type === 'container') {
                        const isExpanded = expandedContainers.has(node.id);
                        return (
                            <div key={node.id}>
                                <ContainerItem
                                    node={node}
                                    depth={depth}
                                    isParallel={isParallel}
                                    expanded={isExpanded}
                                    onToggle={() => toggleExpand(node.id)}
                                />
                                {isExpanded && node.childGraphId && (
                                    <div className="mt-2 space-y-2 relative">
                                        {/* Vertical connector line for nesting */}
                                        <div
                                            className="absolute top-0 bottom-0 border-l-2 border-indigo-800/40"
                                            style={{ left: (depth + 1) * 24 + 8 }}
                                        />
                                        <ExpandedChildren
                                            childGraphId={node.childGraphId}
                                            parentDepth={depth}
                                            expandedContainers={expandedContainers}
                                            toggleExpand={toggleExpand}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    }
                    const blocked = graph ? isNodeBlocked(node, graph) : false;
                    return (
                        <ActionItem
                            key={node.id}
                            node={node}
                            blocked={blocked}
                            depth={depth}
                            isParallel={isParallel}
                        />
                    );
                })}

                {/* Quick add */}
                <div className="flex items-center gap-2 pt-2">
                    <input
                        className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-purple-500 placeholder-slate-500"
                        placeholder="Add a new task..."
                        value={newTaskTitle}
                        onChange={e => setNewTaskTitle(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') handleAddTask();
                        }}
                    />
                    <button
                        onClick={handleAddTask}
                        disabled={!newTaskTitle.trim()}
                        className="px-4 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors touch:min-h-[44px]"
                    >
                        Add
                    </button>
                </div>

                {sortedItems.length === 0 && (
                    <div className="text-center text-gray-500 py-12">
                        <p className="text-lg mb-2">No tasks yet</p>
                        <p className="text-sm">Add a task above to get started</p>
                    </div>
                )}
            </div>
        </div>
    );
};
