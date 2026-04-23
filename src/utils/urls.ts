export const URL_REGEX = /https?:\/\/[^\s<>()]+/gi;

const TRAILING_PUNCT = /^(.*?)([.,;:!?)\]]+)$/;

export const stripTrailingPunctuation = (url: string): { url: string; trailing: string } => {
    const match = url.match(TRAILING_PUNCT);
    if (match && match[1]) return { url: match[1], trailing: match[2] };
    return { url, trailing: '' };
};

export const extractUrls = (text: string): string[] => {
    if (!text) return [];
    const matches = text.match(URL_REGEX) ?? [];
    return Array.from(new Set(matches.map(u => stripTrailingPunctuation(u).url)));
};
