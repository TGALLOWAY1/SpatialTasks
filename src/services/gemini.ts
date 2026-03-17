import { GeminiSubtask, DraftNode } from '../types';

const GEMINI_ENDPOINT =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export interface MagicExpandResult {
    subtasks: GeminiSubtask[];
}

export interface GeminiError {
    type: 'invalid_key' | 'quota_exceeded' | 'network' | 'parse_error' | 'unknown';
    message: string;
}

export type FlowComplexity = 'simple' | 'standard' | 'detailed';

export interface GenerateFlowResult {
    title: string;
    nodes: DraftNode[];
}

export async function generateFlow(
    apiKey: string,
    userPrompt: string,
    complexity: FlowComplexity = 'standard'
): Promise<GenerateFlowResult> {
    const stepRange = complexity === 'simple' ? '3-5' : complexity === 'detailed' ? '8-12' : '5-8';
    const nestingGuide = complexity === 'simple'
        ? 'Do NOT use nested substeps.'
        : 'Use nested substeps when a phase has 2-4 concrete sub-actions.';

    const prompt = `You are a workflow generation assistant. Given a user's intent, generate a structured workflow broken into phases with optional substeps.

User intent: "${userPrompt}"

Return a JSON object with:
- "title": a concise title for this workflow (2-5 words)
- "nodes": an array of top-level phase objects

Each phase object has:
- "label": a clear, actionable phase name (2-5 words, start with a verb)
- "children": optional array of substep objects, each with just a "label" field

Rules:
- Generate ${stepRange} top-level phases
- ${nestingGuide}
- Make steps specific and actionable
- Prefer verbs at the start of each step
- Avoid vague items like "do the thing" or "finalize everything"
- Order phases logically
- Return ONLY valid JSON, no other text`;

    const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.7,
        },
    };

    let response: Response;
    try {
        response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
    } catch {
        throw { type: 'network', message: 'Network error. Check your connection.' } as GeminiError;
    }

    if (!response.ok) {
        if (response.status === 400 || response.status === 403) {
            throw { type: 'invalid_key', message: 'Invalid API key. Check your Gemini key in settings.' } as GeminiError;
        }
        if (response.status === 429) {
            throw { type: 'quota_exceeded', message: 'Quota exceeded. Try again later.' } as GeminiError;
        }
        throw { type: 'unknown', message: `API error: ${response.status}` } as GeminiError;
    }

    const data = await response.json();

    try {
        const text = data.candidates[0].content.parts[0].text;
        const parsed = JSON.parse(text);

        if (!parsed.title || !Array.isArray(parsed.nodes) || parsed.nodes.length === 0) {
            throw new Error('Invalid response structure');
        }

        // Normalize into DraftNode format with IDs and order
        let counter = 0;
        const nodes: DraftNode[] = parsed.nodes.map((n: any) => {
            const parentId = `phase-${counter++}`;
            const children = Array.isArray(n.children)
                ? n.children.map((c: any) => ({
                    id: `step-${counter++}`,
                    label: c.label || 'Untitled',
                    order: 0,
                    children: undefined,
                }))
                : undefined;
            if (children) {
                children.forEach((c: DraftNode, i: number) => { c.order = i; });
            }
            return {
                id: parentId,
                label: n.label || 'Untitled Phase',
                children,
                order: 0,
            } as DraftNode;
        });
        nodes.forEach((n: DraftNode, i: number) => { n.order = i; });

        return { title: parsed.title, nodes };
    } catch {
        throw { type: 'parse_error', message: 'Failed to parse AI response. Try again.' } as GeminiError;
    }
}

export async function magicExpand(
    apiKey: string,
    nodeTitle: string,
    nodeNotes?: string
): Promise<MagicExpandResult> {
    const contextPart = nodeNotes ? `\nAdditional context: ${nodeNotes}` : '';

    const prompt = `You are a task decomposition assistant. Given a task title, break it down into concrete subtasks.

Task: "${nodeTitle}"${contextPart}

Return a JSON array of subtasks. Each subtask has:
- "id": a short unique slug (e.g., "research", "draft-outline")
- "title": a clear, actionable title (2-6 words)
- "dependsOn": array of other subtask ids that must be completed first (empty array if none)

Rules:
- Return 3 to 7 subtasks
- Make them specific and actionable
- Order them logically with dependencies
- The first subtask should have no dependencies
- Return ONLY the JSON array, no other text`;

    const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.7,
        },
    };

    let response: Response;
    try {
        response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
    } catch {
        throw { type: 'network', message: 'Network error. Check your connection.' } as GeminiError;
    }

    if (!response.ok) {
        if (response.status === 400 || response.status === 403) {
            throw { type: 'invalid_key', message: 'Invalid API key. Check your Gemini key in settings.' } as GeminiError;
        }
        if (response.status === 429) {
            throw { type: 'quota_exceeded', message: 'Quota exceeded. Try again later.' } as GeminiError;
        }
        throw { type: 'unknown', message: `API error: ${response.status}` } as GeminiError;
    }

    const data = await response.json();

    try {
        const text = data.candidates[0].content.parts[0].text;
        const subtasks: GeminiSubtask[] = JSON.parse(text);

        if (!Array.isArray(subtasks) || subtasks.length === 0) {
            throw new Error('Empty response');
        }
        for (const st of subtasks) {
            if (!st.id || !st.title || !Array.isArray(st.dependsOn)) {
                throw new Error('Malformed subtask');
            }
        }

        return { subtasks };
    } catch {
        throw { type: 'parse_error', message: 'Failed to parse AI response. Try again.' } as GeminiError;
    }
}
