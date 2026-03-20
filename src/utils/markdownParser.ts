import { DraftNode } from '../types';

const VERIFICATION_MARKER = '<!-- verification -->';

export interface ParsedPlan {
    title: string;
    nodes: DraftNode[];
    warnings: string[];
}

/**
 * Parse a markdown implementation plan into DraftNode[] for canvas creation.
 *
 * Parsing rules:
 * - `# Heading` → project title
 * - `## Step Title` → top-level DraftNode (container if it has bullet children, action otherwise)
 * - Text paragraphs under ## → stored in description (becomes meta.notes)
 * - `- bullet` or `* bullet` → child DraftNode (substep)
 * - `### Verification` → verification section stored with marker in description
 * - Nested bullets (indented) → appended to parent bullet label
 */
export function parseMarkdownPlan(
    markdown: string,
    fallbackTitle: string = 'Imported Plan'
): ParsedPlan {
    const warnings: string[] = [];
    const lines = markdown.split('\n');

    let title = '';
    const topLevelNodes: DraftNode[] = [];

    let currentNode: {
        label: string;
        description: string;
        verification: string;
        children: { label: string; description: string }[];
    } | null = null;

    let inVerification = false;
    let counter = 0;

    const flushCurrentNode = () => {
        if (!currentNode) return;

        const children: DraftNode[] | undefined =
            currentNode.children.length > 0
                ? currentNode.children.map((c, i) => ({
                      id: `step-${counter++}`,
                      label: c.label,
                      description: c.description || undefined,
                      order: i,
                  }))
                : undefined;

        let description = currentNode.description.trim();
        if (currentNode.verification.trim()) {
            description += `\n${VERIFICATION_MARKER}\n${currentNode.verification.trim()}`;
        }

        topLevelNodes.push({
            id: `phase-${counter++}`,
            label: currentNode.label,
            description: description || undefined,
            children,
            order: topLevelNodes.length,
        });

        currentNode = null;
        inVerification = false;
    };

    for (const rawLine of lines) {
        const line = rawLine;

        // # Title (h1)
        const h1Match = line.match(/^# (.+)/);
        if (h1Match) {
            if (!title) {
                title = h1Match[1].trim();
            }
            continue;
        }

        // ## Step heading (h2)
        const h2Match = line.match(/^## (.+)/);
        if (h2Match) {
            flushCurrentNode();
            currentNode = {
                label: h2Match[1].trim(),
                description: '',
                verification: '',
                children: [],
            };
            inVerification = false;
            continue;
        }

        // ### Verification sub-heading
        const h3Match = line.match(/^### (.+)/);
        if (h3Match) {
            const heading = h3Match[1].trim().toLowerCase();
            if (
                heading.startsWith('verification') ||
                heading.startsWith('verify') ||
                heading.startsWith('acceptance') ||
                heading.startsWith('check') ||
                heading.startsWith('test')
            ) {
                inVerification = true;
            } else if (currentNode) {
                // Other h3 headings — treat as bold text in description
                if (inVerification) {
                    currentNode.verification += `\n**${h3Match[1].trim()}**\n`;
                } else {
                    currentNode.description += `\n**${h3Match[1].trim()}**\n`;
                }
            }
            continue;
        }

        // Bullet items (- or *)
        const bulletMatch = line.match(/^(\s*)([-*])\s+(.+)/);
        if (bulletMatch && currentNode) {
            const indent = bulletMatch[1].length;
            const text = bulletMatch[3].trim();

            if (inVerification) {
                // Verification bullets stay in verification text
                currentNode.verification += `- ${text}\n`;
            } else if (indent >= 2 && currentNode.children.length > 0) {
                // Nested bullet → append to last child's label
                const lastChild = currentNode.children[currentNode.children.length - 1];
                lastChild.label += ` — ${text}`;
            } else {
                // Top-level bullet → child substep
                currentNode.children.push({ label: text, description: '' });
            }
            continue;
        }

        // Numbered list items (1. 2. etc)
        const numberedMatch = line.match(/^(\s*)\d+\.\s+(.+)/);
        if (numberedMatch && currentNode) {
            const indent = numberedMatch[1].length;
            const text = numberedMatch[2].trim();

            if (inVerification) {
                currentNode.verification += `- ${text}\n`;
            } else if (indent >= 2 && currentNode.children.length > 0) {
                const lastChild = currentNode.children[currentNode.children.length - 1];
                lastChild.label += ` — ${text}`;
            } else {
                currentNode.children.push({ label: text, description: '' });
            }
            continue;
        }

        // Regular text lines
        if (currentNode) {
            const trimmed = line.trim();
            if (trimmed) {
                if (inVerification) {
                    currentNode.verification += `${trimmed}\n`;
                } else {
                    currentNode.description += `${trimmed}\n`;
                }
            }
            continue;
        }
    }

    // Flush last node
    flushCurrentNode();

    // Determine title
    if (!title) {
        title = fallbackTitle;
    }

    // Warnings
    if (topLevelNodes.length === 0) {
        warnings.push('No ## headings found. Make sure your plan uses ## for each step.');
    }

    if (!markdown.trim()) {
        warnings.push('The markdown content is empty.');
    }

    return { title, nodes: topLevelNodes, warnings };
}

/**
 * Split a description that may contain a verification section.
 * Returns { notes, verification } where verification is the content after the marker.
 */
export function splitDescriptionAndVerification(
    description?: string
): { notes: string; verification: string } {
    if (!description) return { notes: '', verification: '' };

    const markerIndex = description.indexOf(VERIFICATION_MARKER);
    if (markerIndex === -1) {
        return { notes: description.trim(), verification: '' };
    }

    const notes = description.substring(0, markerIndex).trim();
    const verification = description.substring(markerIndex + VERIFICATION_MARKER.length).trim();
    return { notes, verification };
}
