import type { AccentColor } from '../types';

/**
 * Palette of accent colors available to nodes.
 * Keep in sync with the `AccentColor` type in `src/types/index.ts`.
 * Order here drives the picker layout.
 */
export const ACCENT_COLORS: AccentColor[] = ['gray', 'red', 'amber', 'green', 'blue', 'purple', 'pink'];

/**
 * Solid-fill Tailwind class for the 3px left-edge bar on nodes.
 * Written as static strings so Tailwind's JIT keeps them.
 */
export const ACCENT_BAR: Record<AccentColor, string> = {
    gray: 'bg-gray-400',
    red: 'bg-red-500',
    amber: 'bg-amber-500',
    green: 'bg-emerald-500',
    blue: 'bg-sky-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
};

/**
 * Solid-fill Tailwind class for the 8px list-view dot.
 */
export const ACCENT_DOT: Record<AccentColor, string> = {
    gray: 'bg-gray-400',
    red: 'bg-red-500',
    amber: 'bg-amber-500',
    green: 'bg-emerald-500',
    blue: 'bg-sky-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
};

/** Friendly label used by the picker for accessibility. */
export const ACCENT_LABEL: Record<AccentColor, string> = {
    gray: 'Gray',
    red: 'Red',
    amber: 'Amber',
    green: 'Green',
    blue: 'Blue',
    purple: 'Purple',
    pink: 'Pink',
};
