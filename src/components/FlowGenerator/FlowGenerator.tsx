import React, { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useToastStore } from '../UI/Toast';
import { generateFlow, FlowComplexity } from '../../services/gemini';
import { GenerateFlowModal } from './GenerateFlowModal';
import { DraftReviewPanel } from './DraftReviewPanel';
import { DraftNode, Node, Graph, Edge } from '../../types';

type FlowGeneratorStage = 'prompt' | 'review' | null;

interface FlowGeneratorProps {
    open: boolean;
    onClose: () => void;
}

// Convert draft outline → canvas nodes/edges/graphs
function draftToCanvas(
    draftNodes: DraftNode[],
    projectId: string,
    rootGraphId: string,
): { nodes: Node[]; edges: Edge[]; childGraphs: Graph[] } {
    const canvasNodes: Node[] = [];
    const canvasEdges: Edge[] = [];
    const childGraphs: Graph[] = [];

    const SPACING_X = 280;
    const START_X = 100;
    const START_Y = 100;
    const CHILD_SPACING_X = 250;
    const CHILD_START_X = 80;
    const CHILD_START_Y = 80;

    draftNodes.forEach((draftNode, i) => {
        const nodeId = uuidv4();
        const hasChildren = draftNode.children && draftNode.children.length > 0;

        if (hasChildren) {
            // Container node with child graph
            const childGraphId = uuidv4();
            const childGraph: Graph = {
                id: childGraphId,
                projectId,
                title: draftNode.label,
                nodes: [],
                edges: [],
            };

            // Create child action nodes inside the child graph
            let prevChildId: string | null = null;
            draftNode.children!.forEach((child, ci) => {
                const childNodeId = uuidv4();
                childGraph.nodes.push({
                    id: childNodeId,
                    graphId: childGraphId,
                    type: 'action',
                    title: child.label,
                    x: CHILD_START_X + ci * CHILD_SPACING_X,
                    y: CHILD_START_Y,
                    width: 200,
                    height: 50,
                    status: 'todo',
                });
                // Sequential edges between children
                if (prevChildId) {
                    childGraph.edges.push({
                        id: uuidv4(),
                        graphId: childGraphId,
                        source: prevChildId,
                        target: childNodeId,
                    });
                }
                prevChildId = childNodeId;
            });

            childGraphs.push(childGraph);

            canvasNodes.push({
                id: nodeId,
                graphId: rootGraphId,
                type: 'container',
                title: draftNode.label,
                x: START_X + i * SPACING_X,
                y: START_Y,
                width: 200,
                height: 80,
                childGraphId,
            });
        } else {
            // Simple action node
            canvasNodes.push({
                id: nodeId,
                graphId: rootGraphId,
                type: 'action',
                title: draftNode.label,
                x: START_X + i * SPACING_X,
                y: START_Y,
                width: 200,
                height: 50,
                status: 'todo',
            });
        }

        // Sequential edges between top-level nodes
        if (i > 0 && canvasNodes.length >= 2) {
            canvasEdges.push({
                id: uuidv4(),
                graphId: rootGraphId,
                source: canvasNodes[canvasNodes.length - 2].id,
                target: nodeId,
            });
        }
    });

    return { nodes: canvasNodes, edges: canvasEdges, childGraphs };
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
        const store = useWorkspaceStore.getState();

        // Create a new project
        const projectId = uuidv4();
        const rootGraphId = uuidv4();
        const now = new Date().toISOString();

        const { nodes, edges, childGraphs } = draftToCanvas(draftNodes, projectId, rootGraphId);

        const rootGraph: Graph = {
            id: rootGraphId,
            projectId,
            title: draftTitle,
            nodes,
            edges,
        };

        const newProject = {
            id: projectId,
            title: draftTitle,
            rootGraphId,
            createdAt: now,
            updatedAt: now,
        };

        // Build updated graphs map
        const updatedGraphs = { ...store.graphs, [rootGraphId]: rootGraph };
        childGraphs.forEach(cg => { updatedGraphs[cg.id] = cg; });

        // Update store in one shot — directly set state for atomicity
        useWorkspaceStore.setState({
            projects: [...store.projects, newProject],
            graphs: updatedGraphs,
            activeProjectId: projectId,
            activeGraphId: rootGraphId,
            navStack: [{ graphId: rootGraphId, label: draftTitle }],
            executionMode: false,
        });

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
