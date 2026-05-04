import React, { useState, useCallback, useRef } from 'react';
import { useToastStore } from '../UI/Toast';
import { DraftReviewPanel } from './DraftReviewPanel';
import { DraftNode } from '../../types';
import { parseMarkdownPlan } from '../../utils/markdownParser';
import { createProjectFromDraft } from '../../utils/draftUtils';
import { PLAN_TEMPLATES, AI_PROMPT_TEMPLATE } from '../../utils/planTemplates';
import {
    FileUp, Upload, ClipboardPaste, X, AlertTriangle, FileText,
    LayoutTemplate, Sparkles, Copy, ExternalLink, Check,
} from 'lucide-react';
import { clsx } from 'clsx';

type ImporterStage = 'upload' | 'review';
type ImporterTab = 'file' | 'paste' | 'template' | 'ai';

interface MarkdownImporterProps {
    open: boolean;
    onClose: () => void;
    onLaunchGenerator?: () => void;
}

export const MarkdownImporter: React.FC<MarkdownImporterProps> = ({ open, onClose, onLaunchGenerator }) => {
    const [stage, setStage] = useState<ImporterStage>('upload');
    const [activeTab, setActiveTab] = useState<ImporterTab>('file');
    const [pasteContent, setPasteContent] = useState('');
    const [draftTitle, setDraftTitle] = useState('');
    const [draftNodes, setDraftNodes] = useState<DraftNode[]>([]);
    const [warnings, setWarnings] = useState<string[]>([]);
    const [dragOver, setDragOver] = useState(false);
    const [fileName, setFileName] = useState('');
    const [aiGoal, setAiGoal] = useState('');
    const [copied, setCopied] = useState(false);
    const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const addToast = useToastStore(state => state.addToast);

    const handleClose = useCallback(() => {
        setStage('upload');
        setActiveTab('file');
        setPasteContent('');
        setDraftTitle('');
        setDraftNodes([]);
        setWarnings([]);
        setDragOver(false);
        setFileName('');
        setAiGoal('');
        setCopied(false);
        setCopiedTemplateId(null);
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

    const handleTemplateSelect = useCallback((templateId: string) => {
        const tpl = PLAN_TEMPLATES.find(t => t.id === templateId);
        if (!tpl) return;
        setPasteContent(tpl.markdown);
        setActiveTab('paste');
        addToast(`Loaded "${tpl.label}" template — edit below then Parse & Review.`, 'success');
    }, [addToast]);

    const handleCopyTemplate = useCallback(async (templateId: string) => {
        const tpl = PLAN_TEMPLATES.find(t => t.id === templateId);
        if (!tpl) return;
        try {
            await navigator.clipboard.writeText(tpl.markdown);
            setCopiedTemplateId(templateId);
            addToast(`Copied "${tpl.label}" — paste it into a coding agent or the Paste tab.`, 'success');
            window.setTimeout(() => {
                setCopiedTemplateId(prev => (prev === templateId ? null : prev));
            }, 2000);
        } catch {
            addToast('Could not access the clipboard. Open the template and copy manually.', 'error');
        }
    }, [addToast]);

    const handleCopyPrompt = useCallback(async () => {
        const goal = aiGoal.trim() || '[USER GOAL]';
        const prompt = AI_PROMPT_TEMPLATE.replace('[USER GOAL]', goal);
        try {
            await navigator.clipboard.writeText(prompt);
            setCopied(true);
            addToast('Prompt copied — paste it into ChatGPT or Claude.', 'success');
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            addToast('Could not access the clipboard. Select and copy the prompt manually.', 'error');
        }
    }, [aiGoal, addToast]);

    const handleLaunchGenerator = useCallback(() => {
        if (!onLaunchGenerator) return;
        handleClose();
        onLaunchGenerator();
    }, [onLaunchGenerator, handleClose]);

    const handleCreateOnCanvas = useCallback(() => {
        const { warnings: importWarnings } = createProjectFromDraft(draftTitle, draftNodes);
        addToast(`Created "${draftTitle}" with ${draftNodes.length} steps.`, 'success');
        importWarnings.forEach(w => addToast(w, 'info'));
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

    const tabs: { id: ImporterTab; label: string; icon: React.ReactNode }[] = [
        { id: 'file', label: 'Upload', icon: <Upload className="w-4 h-4" /> },
        { id: 'paste', label: 'Paste', icon: <ClipboardPaste className="w-4 h-4" /> },
        { id: 'template', label: 'Templates', icon: <LayoutTemplate className="w-4 h-4" /> },
        { id: 'ai', label: 'AI Prompt', icon: <Sparkles className="w-4 h-4" /> },
    ];

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
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={clsx(
                                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors",
                                activeTab === tab.id
                                    ? "text-emerald-400 border-b-2 border-emerald-400 bg-slate-800"
                                    : "text-slate-400 hover:text-white",
                            )}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-4">
                    {activeTab === 'file' && (
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
                                        : "border-slate-600 hover:border-slate-500 hover:bg-slate-700/30",
                                )}
                            >
                                <FileText className={clsx(
                                    "w-10 h-10 mx-auto mb-3",
                                    dragOver ? "text-emerald-400" : "text-slate-500",
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

## Phase 1: Setup
- Task: First step
- Task: Second step

## Phase 2: Build (parallel)
- Task: Frontend
- Task: Backend
  depends_on: Frontend

### Verification
- Check that X works`}
                                </pre>
                            </div>
                        </div>
                    )}

                    {activeTab === 'paste' && (
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
                                        : "bg-slate-700 text-slate-500 cursor-not-allowed",
                                )}
                            >
                                <FileUp className="w-4 h-4" />
                                Parse & Review
                            </button>
                        </div>
                    )}

                    {activeTab === 'template' && (
                        <div className="space-y-2">
                            <p className="text-xs text-slate-400 mb-2">
                                Pick a starter template — click the card to load it into the Paste tab, or use the copy icon to grab the markdown for a coding agent.
                            </p>
                            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                                {PLAN_TEMPLATES.map(tpl => {
                                    const isCopied = copiedTemplateId === tpl.id;
                                    return (
                                        <div
                                            key={tpl.id}
                                            className="group relative flex items-stretch bg-slate-900/50 hover:bg-slate-900 border border-slate-700 hover:border-emerald-500 rounded-lg transition-colors"
                                        >
                                            <button
                                                onClick={() => handleTemplateSelect(tpl.id)}
                                                className="flex-1 text-left p-3 pr-2 min-w-0"
                                            >
                                                <div className="text-sm font-semibold text-white">{tpl.label}</div>
                                                <div className="text-xs text-slate-400 mt-0.5">{tpl.description}</div>
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCopyTemplate(tpl.id);
                                                }}
                                                title={isCopied ? 'Copied!' : 'Copy markdown to clipboard'}
                                                aria-label={`Copy ${tpl.label} markdown to clipboard`}
                                                className={clsx(
                                                    "shrink-0 self-center mr-2 p-2 rounded-md border transition-colors",
                                                    isCopied
                                                        ? "border-emerald-500 bg-emerald-900/40 text-emerald-300"
                                                        : "border-slate-700 bg-slate-800/60 text-slate-400 hover:text-emerald-300 hover:border-emerald-500 hover:bg-slate-800",
                                                )}
                                            >
                                                {isCopied
                                                    ? <Check className="w-4 h-4" />
                                                    : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {activeTab === 'ai' && (
                        <div className="space-y-3">
                            <p className="text-xs text-slate-400">
                                Copy the prompt into ChatGPT or Claude, then paste the response into the <span className="text-slate-200 font-medium">Paste</span> tab.
                            </p>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Your goal</label>
                                <input
                                    type="text"
                                    value={aiGoal}
                                    onChange={e => setAiGoal(e.target.value)}
                                    placeholder="e.g. Launch a new marketing website"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                                />
                            </div>
                            <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-3 max-h-48 overflow-y-auto">
                                <pre className="text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
                                    {AI_PROMPT_TEMPLATE.replace('[USER GOAL]', aiGoal.trim() || '[USER GOAL]')}
                                </pre>
                            </div>
                            <button
                                onClick={handleCopyPrompt}
                                className={clsx(
                                    "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors",
                                    copied
                                        ? "bg-emerald-700 text-white"
                                        : "bg-emerald-600 hover:bg-emerald-500 text-white",
                                )}
                            >
                                <Copy className="w-4 h-4" />
                                {copied ? 'Copied!' : 'Copy Prompt'}
                            </button>
                            {onLaunchGenerator && (
                                <button
                                    onClick={handleLaunchGenerator}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 hover:bg-slate-700/40 transition-colors"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Prefer in-app generation? Open Generate Flow with AI
                                </button>
                            )}
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
