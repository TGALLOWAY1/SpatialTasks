import React from 'react';
import { extractUrls, stripTrailingPunctuation } from './urls';

/**
 * Lightweight, safe markdown renderer that returns React elements.
 * No innerHTML — user-supplied markdown cannot inject HTML or scripts.
 */

type InlineToken =
    | { type: 'text'; value: string }
    | { type: 'bold'; children: InlineToken[] }
    | { type: 'italic'; children: InlineToken[] }
    | { type: 'code'; value: string }
    | { type: 'link'; href: string; label: string };

const tokenizeInline = (input: string): InlineToken[] => {
    const tokens: InlineToken[] = [];
    let i = 0;

    const pushText = (s: string) => {
        if (!s) return;
        const last = tokens[tokens.length - 1];
        if (last && last.type === 'text') {
            last.value += s;
        } else {
            tokens.push({ type: 'text', value: s });
        }
    };

    while (i < input.length) {
        const rest = input.slice(i);

        // Inline code: `...`
        const codeMatch = rest.match(/^`([^`]+)`/);
        if (codeMatch) {
            tokens.push({ type: 'code', value: codeMatch[1] });
            i += codeMatch[0].length;
            continue;
        }

        // Bold: **...**
        const boldMatch = rest.match(/^\*\*([\s\S]+?)\*\*/);
        if (boldMatch) {
            tokens.push({ type: 'bold', children: tokenizeInline(boldMatch[1]) });
            i += boldMatch[0].length;
            continue;
        }

        // Italic: *...* (not part of **) or _..._
        const italicAst = rest.match(/^\*([^*\n]+)\*/);
        if (italicAst) {
            tokens.push({ type: 'italic', children: tokenizeInline(italicAst[1]) });
            i += italicAst[0].length;
            continue;
        }
        const italicUnder = rest.match(/^_([^_\n]+)_/);
        if (italicUnder) {
            tokens.push({ type: 'italic', children: tokenizeInline(italicUnder[1]) });
            i += italicUnder[0].length;
            continue;
        }

        // Link: [label](url)
        const linkMatch = rest.match(/^\[([^\]]+)\]\(([^)\s]+)\)/);
        if (linkMatch) {
            tokens.push({ type: 'link', label: linkMatch[1], href: linkMatch[2] });
            i += linkMatch[0].length;
            continue;
        }

        // Bare URL
        const urlMatch = rest.match(/^https?:\/\/[^\s<>()]+/i);
        if (urlMatch) {
            const { url, trailing } = stripTrailingPunctuation(urlMatch[0]);
            tokens.push({ type: 'link', href: url, label: url });
            if (trailing) pushText(trailing);
            i += urlMatch[0].length;
            continue;
        }

        // Plain character — consume until the next special marker
        const nextSpecial = rest.slice(1).search(/[`*_[]|https?:\/\//i);
        const advance = nextSpecial === -1 ? rest.length : nextSpecial + 1;
        pushText(rest.slice(0, advance));
        i += advance;
    }

    return tokens;
};

const renderInline = (tokens: InlineToken[], keyPrefix: string): React.ReactNode[] => {
    return tokens.map((tok, idx) => {
        const key = `${keyPrefix}-${idx}`;
        switch (tok.type) {
            case 'text':
                return <React.Fragment key={key}>{tok.value}</React.Fragment>;
            case 'bold':
                return <strong key={key} className="font-semibold">{renderInline(tok.children, key)}</strong>;
            case 'italic':
                return <em key={key} className="italic">{renderInline(tok.children, key)}</em>;
            case 'code':
                return (
                    <code
                        key={key}
                        className="px-1 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-amber-200 text-[0.85em] font-mono"
                    >
                        {tok.value}
                    </code>
                );
            case 'link':
                return (
                    <a
                        key={key}
                        href={tok.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-sky-400 underline decoration-sky-400/40 hover:text-sky-300 hover:decoration-sky-300 break-words"
                    >
                        {tok.label}
                    </a>
                );
        }
    });
};

interface Block {
    render: () => React.ReactNode;
}

const buildBlocks = (markdown: string): Block[] => {
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    const blocks: Block[] = [];
    let i = 0;
    let blockIdx = 0;

    while (i < lines.length) {
        const line = lines[i];

        // Fenced code block
        const fenceMatch = line.match(/^```\s*(\w+)?\s*$/);
        if (fenceMatch) {
            const lang = fenceMatch[1] ?? '';
            const codeLines: string[] = [];
            i++;
            while (i < lines.length && !lines[i].match(/^```\s*$/)) {
                codeLines.push(lines[i]);
                i++;
            }
            i++; // consume closing fence
            const idx = blockIdx++;
            blocks.push({
                render: () => (
                    <pre
                        key={`b-${idx}`}
                        className="rounded-md bg-slate-950 border border-slate-700 p-2.5 text-[0.8rem] text-slate-200 overflow-x-auto font-mono whitespace-pre"
                        data-lang={lang || undefined}
                    >
                        {codeLines.join('\n')}
                    </pre>
                ),
            });
            continue;
        }

        // Heading
        const h1 = line.match(/^# (.+)$/);
        const h2 = line.match(/^## (.+)$/);
        const h3 = line.match(/^### (.+)$/);
        if (h1 || h2 || h3) {
            const text = (h1 ?? h2 ?? h3)![1].trim();
            const level = h1 ? 1 : h2 ? 2 : 3;
            const idx = blockIdx++;
            const sizeCls =
                level === 1 ? 'text-base font-bold' :
                level === 2 ? 'text-sm font-bold' :
                'text-xs font-semibold uppercase tracking-wider';
            blocks.push({
                render: () => {
                    const children = renderInline(tokenizeInline(text), `b-${idx}`);
                    if (level === 1) return <h3 key={`b-${idx}`} className={`${sizeCls} text-slate-100`}>{children}</h3>;
                    if (level === 2) return <h4 key={`b-${idx}`} className={`${sizeCls} text-slate-100`}>{children}</h4>;
                    return <h5 key={`b-${idx}`} className={`${sizeCls} text-slate-300`}>{children}</h5>;
                },
            });
            i++;
            continue;
        }

        // Unordered list
        if (/^\s*[-*] +/.test(line)) {
            const items: string[] = [];
            while (i < lines.length && /^\s*[-*] +/.test(lines[i])) {
                items.push(lines[i].replace(/^\s*[-*] +/, ''));
                i++;
            }
            const idx = blockIdx++;
            blocks.push({
                render: () => (
                    <ul key={`b-${idx}`} className="list-disc pl-5 space-y-0.5 text-slate-300">
                        {items.map((item, j) => (
                            <li key={j}>{renderInline(tokenizeInline(item), `b-${idx}-${j}`)}</li>
                        ))}
                    </ul>
                ),
            });
            continue;
        }

        // Ordered list
        if (/^\s*\d+\. +/.test(line)) {
            const items: string[] = [];
            while (i < lines.length && /^\s*\d+\. +/.test(lines[i])) {
                items.push(lines[i].replace(/^\s*\d+\. +/, ''));
                i++;
            }
            const idx = blockIdx++;
            blocks.push({
                render: () => (
                    <ol key={`b-${idx}`} className="list-decimal pl-5 space-y-0.5 text-slate-300">
                        {items.map((item, j) => (
                            <li key={j}>{renderInline(tokenizeInline(item), `b-${idx}-${j}`)}</li>
                        ))}
                    </ol>
                ),
            });
            continue;
        }

        // Blank line — separator
        if (line.trim() === '') {
            i++;
            continue;
        }

        // Paragraph: gather contiguous non-blank, non-special lines
        const paraLines: string[] = [];
        while (
            i < lines.length &&
            lines[i].trim() !== '' &&
            !/^```/.test(lines[i]) &&
            !/^#{1,3} /.test(lines[i]) &&
            !/^\s*[-*] +/.test(lines[i]) &&
            !/^\s*\d+\. +/.test(lines[i])
        ) {
            paraLines.push(lines[i]);
            i++;
        }
        if (paraLines.length === 0) continue;
        const idx = blockIdx++;
        blocks.push({
            render: () => (
                <p key={`b-${idx}`} className="text-slate-300 leading-relaxed">
                    {paraLines.map((pl, j) => (
                        <React.Fragment key={j}>
                            {j > 0 && <br />}
                            {renderInline(tokenizeInline(pl), `b-${idx}-${j}`)}
                        </React.Fragment>
                    ))}
                </p>
            ),
        });
    }

    return blocks;
};

export const Markdown: React.FC<{ source: string; className?: string }> = ({ source, className }) => {
    const blocks = React.useMemo(() => buildBlocks(source ?? ''), [source]);
    return (
        <div className={`space-y-2 text-xs leading-relaxed ${className ?? ''}`}>
            {blocks.map(b => b.render())}
        </div>
    );
};

export const extractMarkdownLinks = (source: string): string[] => {
    if (!source) return [];
    const found = new Set<string>(extractUrls(source));
    const linkRe = /\[[^\]]+\]\(([^)\s]+)\)/g;
    let m: RegExpExecArray | null;
    while ((m = linkRe.exec(source)) !== null) {
        found.add(m[1]);
    }
    return Array.from(found);
};
