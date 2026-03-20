import React, { useState, useCallback } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useToastStore } from '../UI/Toast';
import { generateFlow, FlowComplexity } from '../../services/gemini';
import { GenerateFlowModal } from './GenerateFlowModal';
import { DraftReviewPanel } from './DraftReviewPanel';
import { DraftNode } from '../../types';
import { createProjectFromDraft } from '../../utils/draftUtils';

type FlowGeneratorStage = 'prompt' | 'review' | null;

interface FlowGeneratorProps {
    open: boolean;
    onClose: () => void;
}

export const FlowGenerator: React.FC<FlowGeneratorProps> = ({ open, onClose }) => {
    const [stage, setStage] = useState<FlowGeneratorStage>('prompt');
    const [loading, setLoading] = useState(false);
    const [draftTitle, setDraftTitle] = useState('');
    const [draftNodes, setDraftNodes] = useState<DraftNode[]>([]);
    const [sourcePrompt, setSourcePrompt] = useState('');
    const [lastComplexity, setLastComplexity] = useState<FlowComplexity>('standard');

    const settings = useWorkspaceStore(state => state.settings);
    const addToast = useToastStore(state => state.addToast);

    const handleClose = useCallback(() => {
        setStage('prompt');
        setLoading(false);
        setDraftTitle('');
        setDraftNodes([]);
        setSourcePrompt('');
        onClose();
    }, [onClose]);

    const handleGenerate = useCallback(async (prompt: string, complexity: FlowComplexity) => {
        const apiKey = settings.geminiApiKey;
        if (!apiKey) {
            addToast('Set your Gemini API key in Settings first.', 'error');
            return;
        }

        setSourcePrompt(prompt);
        setLastComplexity(complexity);
        setLoading(true);

        try {
            const result = await generateFlow(apiKey, prompt, complexity);
            setDraftTitle(result.title);
            setDraftNodes(result.nodes);
            setStage('review');
        } catch (err: any) {
            const message = err?.message || 'Failed to generate flow. Try again.';
            addToast(message, 'error');
            if (err?.type === 'invalid_key') {
                useWorkspaceStore.getState().updateSettings({ geminiStatus: 'error' });
            }
        } finally {
            setLoading(false);
        }
    }, [settings.geminiApiKey, addToast]);

    const handleRegenerate = useCallback(() => {
        handleGenerate(sourcePrompt, lastComplexity);
    }, [sourcePrompt, lastComplexity, handleGenerate]);

    const handleCreateOnCanvas = useCallback(() => {
        createProjectFromDraft(draftTitle, draftNodes);
        addToast(`Created "${draftTitle}" with ${draftNodes.length} phases.`, 'success');
        handleClose();
    }, [draftTitle, draftNodes, addToast, handleClose]);

    if (!open) return null;

    if (stage === 'review' && draftNodes.length > 0) {
        return (
            <DraftReviewPanel
                title={draftTitle}
                nodes={draftNodes}
                sourcePrompt={sourcePrompt}
                onUpdateTitle={setDraftTitle}
                onUpdateNodes={setDraftNodes}
                onCreateOnCanvas={handleCreateOnCanvas}
                onRegenerate={handleRegenerate}
                onDiscard={handleClose}
                loading={loading}
            />
        );
    }

    return (
        <GenerateFlowModal
            onGenerate={handleGenerate}
            onClose={handleClose}
            loading={loading}
        />
    );
};
