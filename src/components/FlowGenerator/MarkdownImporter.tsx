import React, { useState, useCallback, useRef } from 'react';
import { useToastStore } from '../UI/Toast';
import { DraftReviewPanel } from './DraftReviewPanel';
import { DraftNode } from '../../types';
import { parseMarkdownPlan } from '../../utils/markdownParser';
import { createProjectFromDraft } from '../../utils/draftUtils';
import { FileUp, Upload, ClipboardPaste, X, AlertTriangle, FileText } from 'lucide-react';
import { clsx } from 'clsx';

type ImporterStage = 'upload' | 'review';

interface MarkdownImporterProps {
    open: boolean;
    onClose: () => void;
}

export const MarkdownImporter: React.FC<MarkdownImporterProps> = ({ open, onClose }) => {
    const [stage, setStage] = useState<ImporterStage>('upload');
    const [activeTab, setActiveTab] = useState<'file' | 'paste'>('file');
    const [pasteContent, setPasteContent] = useState('');
    const [draftTitle, setDraftTitle] = useState('');
    const [draftNodes, setDraftNodes] = useState<DraftNode[]>([]);
    const [warnings, setWarnings] = useState<string[]>([]);
    const [dragOver, setDragOver] = useState(false);
    const [fileName, setFileName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const addToast = useToastStore(state => state.addToast);

    const handleClose = useCallback(() => {
        setStage('upload');
        setPasteContent('');
        setDraftTitle('');
        setDraftNodes([]);
        setWarnings([]);
        setDragOver(false);
        setFileName('');
        onClose();
    }, [onClose]);

    const processMarkdown = useCallback((content: string, fallbackTitle?: string) => {
        const result = parseMarkdownPlan(content, fallbackTitle);

        if (result.nodes.length === 0) {
            addToast('Could not parse any steps from the markdown. Ensure you use ## headings for each step.', 'error');
            return;
        }

        setDraftTitle(result.title);
        setDraftNodes(result.nodes);
        setWarnings(result.warnings);
        setStage('review');
    }, [addToast]);

    const handleFileRead = useCallback((file: File) => {
        if (!file.name.match(/\.(md|txt|markdown)$/i)) {
            addToast('Please upload a .md, .txt, or .markdown file.', 'error');
            return;
        }

        setFileName(file.name);
        const fallbackTitle = file.name.replace(/\.(md|txt|markdown)$/i, '');

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            if (!content?.trim()) {
                addToast('The file is empty.', 'error');
                return;
            }
            processMarkdown(content, fallbackTitle);
        };
        reader.onerror = () => {
            addToast('Failed to read the file.', 'error');
        };
        reader.readAsText(file);
    }, [processMarkdown, addToast]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileRead(file);
    }, [handleFileRead]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setDragOver(false);
    }, []);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileRead(file);
    }, [handleFileRead]);

    const handlePasteSubmit = useCallback(() => {
        if (!pasteContent.trim()) {
            addToast('Please paste some markdown content first.', 'error');
            return;
        }
        processMarkdown(pasteContent);
    }, [pasteContent, processMarkdown, addToast]);

    const handleCreateOnCanvas = useCallback(() => {
        createProjectFromDraft(draftTitle, draftNodes);
        addToast(`Created "${draftTitle}" with ${draftNodes.length} steps.`, 'success');
        handleClose();
    }, [draftTitle, draftNodes, addToast, handleClose]);

    const handleReUpload = useCallback(() => {
        setStage('upload');
        setDraftNodes([]);
        setWarnings([]);
    }, []);

    if (!open) return null;

    // Stage 2: Review using DraftReviewPanel
    if (stage === 'review' && draftNodes.length > 0) {
        return (
            <DraftReviewPanel
                title={draftTitle}
                nodes={draftNodes}
                sourcePrompt={fileName ? `Imported from: ${fileName}` : 'Pasted markdown'}
                onUpdateTitle={setDraftTitle}
                onUpdateNodes={setDraftNodes}
                onCreateOnCanvas={handleCreateOnCanvas}
                onRegenerate={handleReUpload}
                onDiscard={handleClose}
            />
        );
    }

    // Stage 1: Upload
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={handleClose}>
            <div className="absolute inset-0 bg-black/60" />
            <div
                className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-w-lg w-[calc(100%-2rem)] mx-4 flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FileUp className="w-5 h-5 text-emerald-400" />
                        <h3 className="text-white font-semibold text-lg">Import Implementation Plan</h3>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1 rounded text-gray-400 hover:text-white hover:bg-slate-700 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-700">
                    <button
                        onClick={() => setActiveTab('file')}
                        className={clsx(
                            "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
                            activeTab === 'file'
                                ? "text-emerald-400 border-b-2 border-emerald-400 bg-slate-800"
                                : "text-slate-400 hover:text-white"
                        )}
                    >
                        <Upload className="w-4 h-4" />
                        Upload File
                    </button>
                    <button
                        onClick={() => setActiveTab('paste')}
                        className={clsx(
                            "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
                            activeTab === 'paste'
                                ? "text-emerald-400 border-b-2 border-emerald-400 bg-slate-800"
                                : "text-slate-400 hover:text-white"
                        )}
                    >
                        <ClipboardPaste className="w-4 h-4" />
                        Paste Markdown
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    {activeTab === 'file' ? (
                        <div>
                            {/* Drop Zone */}
                            <div
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onClick={() => fileInputRef.current?.click()}
                                className={clsx(
                                    "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                                    dragOver
                                        ? "border-emerald-400 bg-emerald-900/20"
                                        : "border-slate-600 hover:border-slate-500 hover:bg-slate-700/30"
                                )}
                            >
                                <FileText className={clsx(
                                    "w-10 h-10 mx-auto mb-3",
                                    dragOver ? "text-emerald-400" : "text-slate-500"
                                )} />
                                <p className="text-sm text-slate-300 mb-1">
                                    {dragOver ? 'Drop your file here' : 'Drop your markdown file here'}
                                </p>
                                <p className="text-xs text-slate-500">
                                    or click to browse — accepts .md, .txt, .markdown
                                </p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".md,.txt,.markdown"
                                    onChange={handleFileInput}
                                    className="hidden"
                                />
                            </div>

                            {/* Format hint */}
                            <div className="mt-4 bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                                <p className="text-xs font-medium text-slate-400 mb-2">Expected format:</p>
                                <pre className="text-xs text-slate-500 leading-relaxed font-mono">
{`# Plan Title

## Step 1: Setup
Description of what to do...
- Substep one
- Substep two

### Verification
- Check that X works

## Step 2: Implementation
...`}
                                </pre>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <textarea
                                value={pasteContent}
                                onChange={e => setPasteContent(e.target.value)}
                                placeholder="Paste your implementation plan markdown here..."
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 resize-none font-mono"
                                rows={12}
                            />
                            <button
                                onClick={handlePasteSubmit}
                                disabled={!pasteContent.trim()}
                                className={clsx(
                                    "mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors",
                                    pasteContent.trim()
                                        ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                                        : "bg-slate-700 text-slate-500 cursor-not-allowed"
                                )}
                            >
                                <FileUp className="w-4 h-4" />
                                Parse & Review
                            </button>
                        </div>
                    )}

                    {/* Warnings */}
                    {warnings.length > 0 && (
                        <div className="mt-3 bg-amber-900/20 border border-amber-800/50 rounded-lg p-3">
                            {warnings.map((w, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs text-amber-300">
                                    <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                                    <span>{w}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
