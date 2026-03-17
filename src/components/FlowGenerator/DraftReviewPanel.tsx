import React, { useState } from 'react';
import { clsx } from 'clsx';
import { DraftNode } from '../../types';
import {
    GripVertical, Trash2, Plus, ChevronRight, ChevronDown,
    Pencil, Check, X, RotateCcw, ArrowRight, IndentIncrease, IndentDecrease,
} from 'lucide-react';

interface DraftReviewPanelProps {
    title: string;
    nodes: DraftNode[];
    sourcePrompt: string;
    onUpdateTitle: (title: string) => void;
    onUpdateNodes: (nodes: DraftNode[]) => void;
    onCreateOnCanvas: () => void;
    onRegenerate: () => void;
    onDiscard: () => void;
    loading?: boolean;
}

// Recursive component for rendering draft nodes
const DraftNodeItem: React.FC<{
    node: DraftNode;
    depth: number;
    onUpdate: (id: string, updates: Partial<DraftNode>) => void;
    onDelete: (id: string) => void;
    onAddChild: (parentId: string) => void;
    onAddSibling: (afterId: string) => void;
    onMoveUp: (id: string) => void;
    onMoveDown: (id: string) => void;
    onIndent: (id: string) => void;
    onOutdent: (id: string) => void;
    isFirst: boolean;
    isLast: boolean;
}> = ({ node, depth, onUpdate, onDelete, onAddChild, onAddSibling, onMoveUp, onMoveDown, onIndent, onOutdent, isFirst, isLast }) => {
    const [editing, setEditing] = useState(false);
    const [editValue, setEditValue] = useState(node.label);
    const [collapsed, setCollapsed] = useState(false);

    const hasChildren = node.children && node.children.length > 0;

    const handleSaveEdit = () => {
        const trimmed = editValue.trim();
        if (trimmed && trimmed !== node.label) {
            onUpdate(node.id, { label: trimmed });
        }
        setEditing(false);
    };

    return (
        <div>
            <div
                className={clsx(
                    "group flex items-center gap-1 py-1.5 px-2 rounded-md hover:bg-slate-700/50 transition-colors",
                    depth === 0 ? "bg-slate-800/50" : ""
                )}
                style={{ paddingLeft: `${depth * 20 + 8}px` }}
            >
                {/* Collapse toggle for nodes with children */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className={clsx(
                        "w-4 h-4 flex items-center justify-center shrink-0",
                        hasChildren ? "text-slate-400 hover:text-white" : "invisible"
                    )}
                >
                    {hasChildren && (collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </button>

                {/* Drag handle */}
                <GripVertical className="w-3 h-3 text-slate-600 shrink-0 opacity-0 group-hover:opacity-100 cursor-grab" />

                {/* Label or edit input */}
                {editing ? (
                    <div className="flex-1 flex items-center gap-1">
                        <input
                            autoFocus
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveEdit();
                                if (e.key === 'Escape') { setEditValue(node.label); setEditing(false); }
                            }}
                            className="flex-1 bg-slate-900 border border-purple-500 rounded px-2 py-0.5 text-sm text-white outline-none"
                        />
                        <button onClick={handleSaveEdit} className="p-0.5 text-green-400 hover:text-green-300">
                            <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setEditValue(node.label); setEditing(false); }} className="p-0.5 text-slate-400 hover:text-white">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ) : (
                    <span
                        className={clsx(
                            "flex-1 text-sm cursor-pointer select-none",
                            depth === 0 ? "text-white font-medium" : "text-slate-300"
                        )}
                        onDoubleClick={() => { setEditValue(node.label); setEditing(true); }}
                    >
                        {node.label}
                    </span>
                )}

                {/* Actions */}
                {!editing && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => { setEditValue(node.label); setEditing(true); }}
                            className="p-1 text-slate-400 hover:text-white rounded"
                            title="Rename"
                        >
                            <Pencil className="w-3 h-3" />
                        </button>
                        {depth === 0 && (
                            <button
                                onClick={() => onAddChild(node.id)}
                                className="p-1 text-slate-400 hover:text-purple-400 rounded"
                                title="Add substep"
                            >
                                <Plus className="w-3 h-3" />
                            </button>
                        )}
                        {!isFirst && (
                            <button
                                onClick={() => onMoveUp(node.id)}
                                className="p-1 text-slate-400 hover:text-white rounded rotate-[-90deg]"
                                title="Move up"
                            >
                                <ArrowRight className="w-3 h-3" />
                            </button>
                        )}
                        {!isLast && (
                            <button
                                onClick={() => onMoveDown(node.id)}
                                className="p-1 text-slate-400 hover:text-white rounded rotate-90"
                                title="Move down"
                            >
                                <ArrowRight className="w-3 h-3" />
                            </button>
                        )}
                        {depth === 1 && (
                            <button
                                onClick={() => onOutdent(node.id)}
                                className="p-1 text-slate-400 hover:text-white rounded"
                                title="Outdent to top level"
                            >
                                <IndentDecrease className="w-3 h-3" />
                            </button>
                        )}
                        {depth === 0 && (
                            <button
                                onClick={() => onIndent(node.id)}
                                className="p-1 text-slate-400 hover:text-white rounded"
                                title="Indent under previous"
                            >
                                <IndentIncrease className="w-3 h-3" />
                            </button>
                        )}
                        <button
                            onClick={() => onDelete(node.id)}
                            className="p-1 text-slate-400 hover:text-red-400 rounded"
                            title="Delete"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                )}
            </div>

            {/* Children */}
            {hasChildren && !collapsed && (
                <div>
                    {node.children!.map((child, i) => (
                        <DraftNodeItem
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            onUpdate={onUpdate}
                            onDelete={onDelete}
                            onAddChild={onAddChild}
                            onAddSibling={onAddSibling}
                            onMoveUp={onMoveUp}
                            onMoveDown={onMoveDown}
                            onIndent={onIndent}
                            onOutdent={onOutdent}
                            isFirst={i === 0}
                            isLast={i === node.children!.length - 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

let nextId = 1000;
const genId = () => `draft-${nextId++}`;

export const DraftReviewPanel: React.FC<DraftReviewPanelProps> = ({
    title,
    nodes,
    sourcePrompt,
    onUpdateTitle,
    onUpdateNodes,
    onCreateOnCanvas,
    onRegenerate,
    onDiscard,
    loading = false,
}) => {
    const [editingTitle, setEditingTitle] = useState(false);
    const [titleInput, setTitleInput] = useState(title);

    // Deep clone helper
    const cloneNodes = (ns: DraftNode[]): DraftNode[] => JSON.parse(JSON.stringify(ns));

    const handleUpdate = (id: string, updates: Partial<DraftNode>) => {
        const updateRecursive = (ns: DraftNode[]): DraftNode[] =>
            ns.map(n => ({
                ...n,
                ...(n.id === id ? updates : {}),
                children: n.children ? updateRecursive(n.children) : undefined,
            }));
        onUpdateNodes(updateRecursive(cloneNodes(nodes)));
    };

    const handleDelete = (id: string) => {
        const deleteRecursive = (ns: DraftNode[]): DraftNode[] =>
            ns.filter(n => n.id !== id).map(n => ({
                ...n,
                children: n.children ? deleteRecursive(n.children) : undefined,
            }));
        onUpdateNodes(deleteRecursive(cloneNodes(nodes)));
    };

    const handleAddChild = (parentId: string) => {
        const newChild: DraftNode = { id: genId(), label: 'New step', order: 0 };
        const updated = cloneNodes(nodes).map(n => {
            if (n.id === parentId) {
                const children = n.children ? [...n.children, newChild] : [newChild];
                children.forEach((c, i) => { c.order = i; });
                return { ...n, children };
            }
            return n;
        });
        onUpdateNodes(updated);
    };

    const handleAddSibling = (_afterId: string) => {
        // Add a new top-level node at the end
        const newNode: DraftNode = { id: genId(), label: 'New Phase', order: nodes.length };
        onUpdateNodes([...cloneNodes(nodes), newNode]);
    };

    const handleMoveUp = (id: string) => {
        const moveInList = (ns: DraftNode[]): DraftNode[] => {
            const idx = ns.findIndex(n => n.id === id);
            if (idx > 0) {
                const copy = [...ns];
                [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
                copy.forEach((n, i) => { n.order = i; });
                return copy;
            }
            return ns.map(n => ({
                ...n,
                children: n.children ? moveInList(n.children) : undefined,
            }));
        };
        onUpdateNodes(moveInList(cloneNodes(nodes)));
    };

    const handleMoveDown = (id: string) => {
        const moveInList = (ns: DraftNode[]): DraftNode[] => {
            const idx = ns.findIndex(n => n.id === id);
            if (idx >= 0 && idx < ns.length - 1) {
                const copy = [...ns];
                [copy[idx], copy[idx + 1]] = [copy[idx + 1], copy[idx]];
                copy.forEach((n, i) => { n.order = i; });
                return copy;
            }
            return ns.map(n => ({
                ...n,
                children: n.children ? moveInList(n.children) : undefined,
            }));
        };
        onUpdateNodes(moveInList(cloneNodes(nodes)));
    };

    const handleIndent = (id: string) => {
        // Move a top-level node to be a child of the previous top-level node
        const idx = nodes.findIndex(n => n.id === id);
        if (idx <= 0) return;
        const updated = cloneNodes(nodes);
        const [node] = updated.splice(idx, 1);
        const prevNode = updated[idx - 1];
        const asChild: DraftNode = { ...node, children: undefined };
        prevNode.children = prevNode.children ? [...prevNode.children, asChild] : [asChild];
        prevNode.children.forEach((c, i) => { c.order = i; });
        updated.forEach((n, i) => { n.order = i; });
        onUpdateNodes(updated);
    };

    const handleOutdent = (id: string) => {
        // Move a child node to be a top-level node after its parent
        const updated = cloneNodes(nodes);
        for (let pi = 0; pi < updated.length; pi++) {
            const parent = updated[pi];
            if (!parent.children) continue;
            const ci = parent.children.findIndex(c => c.id === id);
            if (ci < 0) continue;
            const [child] = parent.children.splice(ci, 1);
            parent.children.forEach((c, i) => { c.order = i; });
            if (parent.children.length === 0) parent.children = undefined;
            const promoted: DraftNode = { ...child, order: pi + 1 };
            updated.splice(pi + 1, 0, promoted);
            updated.forEach((n, i) => { n.order = i; });
            onUpdateNodes(updated);
            return;
        }
    };

    const handleAddPhase = () => {
        const newNode: DraftNode = { id: genId(), label: 'New Phase', order: nodes.length };
        onUpdateNodes([...cloneNodes(nodes), newNode]);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onDiscard}>
            <div className="absolute inset-0 bg-black/60" />
            <div
                className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-w-lg w-[calc(100%-2rem)] mx-4 max-h-[80vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-slate-700 shrink-0">
                    <div className="flex items-center justify-between mb-1">
                        {editingTitle ? (
                            <div className="flex items-center gap-2 flex-1">
                                <input
                                    autoFocus
                                    value={titleInput}
                                    onChange={e => setTitleInput(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') { onUpdateTitle(titleInput.trim() || title); setEditingTitle(false); }
                                        if (e.key === 'Escape') { setTitleInput(title); setEditingTitle(false); }
                                    }}
                                    className="flex-1 bg-slate-900 border border-purple-500 rounded px-2 py-1 text-white text-lg font-semibold outline-none"
                                />
                                <button onClick={() => { onUpdateTitle(titleInput.trim() || title); setEditingTitle(false); }} className="text-green-400 hover:text-green-300">
                                    <Check className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <h3
                                className="text-white font-semibold text-lg cursor-pointer hover:text-purple-300 transition-colors"
                                onDoubleClick={() => { setTitleInput(title); setEditingTitle(true); }}
                                title="Double-click to rename"
                            >
                                {title}
                            </h3>
                        )}
                        <button
                            onClick={onDiscard}
                            className="p-1 rounded text-gray-400 hover:text-white hover:bg-slate-700 transition-colors ml-2"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-xs text-slate-500">
                        From: "{sourcePrompt}" — double-click items to rename
                    </p>
                </div>

                {/* Scrollable outline */}
                <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
                    {nodes.map((node, i) => (
                        <DraftNodeItem
                            key={node.id}
                            node={node}
                            depth={0}
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                            onAddChild={handleAddChild}
                            onAddSibling={handleAddSibling}
                            onMoveUp={handleMoveUp}
                            onMoveDown={handleMoveDown}
                            onIndent={handleIndent}
                            onOutdent={handleOutdent}
                            isFirst={i === 0}
                            isLast={i === nodes.length - 1}
                        />
                    ))}

                    <button
                        onClick={handleAddPhase}
                        className="flex items-center gap-1.5 px-3 py-2 mt-2 text-xs text-slate-400 hover:text-purple-400 hover:bg-slate-700/50 rounded-md transition-colors w-full"
                    >
                        <Plus className="w-3 h-3" />
                        Add phase
                    </button>
                </div>

                {/* Footer actions */}
                <div className="p-4 border-t border-slate-700 flex flex-col sm:flex-row gap-2 shrink-0">
                    <button
                        onClick={onRegenerate}
                        disabled={loading}
                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 transition-colors"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Regenerate
                    </button>
                    <button
                        onClick={onDiscard}
                        className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 transition-colors"
                    >
                        Discard
                    </button>
                    <button
                        onClick={onCreateOnCanvas}
                        disabled={nodes.length === 0}
                        className={clsx(
                            "flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors",
                            nodes.length > 0
                                ? "bg-purple-600 hover:bg-purple-500 text-white"
                                : "bg-slate-700 text-slate-500 cursor-not-allowed"
                        )}
                    >
                        <ArrowRight className="w-4 h-4" />
                        Create on Canvas
                    </button>
                </div>
            </div>
        </div>
    );
};
