import { GeminiSubtask } from '../types';

const GEMINI_ENDPOINT =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export interface MagicExpandResult {
    subtasks: GeminiSubtask[];
}

export interface GeminiError {
    type: 'invalid_key' | 'quota_exceeded' | 'network' | 'parse_error' | 'unknown';
    message: string;
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
