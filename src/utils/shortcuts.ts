export type ShortcutCategory = 'Canvas' | 'Selection' | 'Edit' | 'Focus View';

export interface Shortcut {
    /** Display-friendly keys. Use 'Cmd' on mac, handled at render time. */
    keys: string[];
    description: string;
    category: ShortcutCategory;
}

/**
 * Canonical list of user-facing keyboard shortcuts.
 *
 * IMPORTANT: When you add a new shortcut anywhere in the codebase,
 * add it here too. This list drives the ? cheatsheet and is the
 * single source of truth users see.
 */
export const SHORTCUTS: Shortcut[] = [
    // Canvas
    { keys: ['N'], description: 'New action task at viewport center', category: 'Canvas' },
    { keys: ['G'], description: 'New container group at viewport center', category: 'Canvas' },
    { keys: ['Double-click'], description: 'Add task at cursor position', category: 'Canvas' },
    { keys: ['Cmd', 'Shift', 'F'], description: 'Fit view to all nodes', category: 'Canvas' },
    { keys: ['Esc'], description: 'Dismiss menus / connect mode / deselect', category: 'Canvas' },

    // Selection
    { keys: ['Cmd', 'A'], description: 'Select all nodes', category: 'Selection' },
    { keys: ['Shift', 'Click'], description: 'Add node to selection', category: 'Selection' },
    { keys: ['Backspace'], description: 'Delete selected nodes/edges', category: 'Selection' },
    { keys: ['Delete'], description: 'Delete selected nodes/edges', category: 'Selection' },
    { keys: ['Arrow ←/→'], description: 'Navigate along edges', category: 'Selection' },
    { keys: ['Arrow ↑/↓'], description: 'Navigate to parallel siblings', category: 'Selection' },

    // Edit
    { keys: ['Cmd', 'Z'], description: 'Undo', category: 'Edit' },
    { keys: ['Cmd', 'Shift', 'Z'], description: 'Redo', category: 'Edit' },
    { keys: ['?'], description: 'Show this cheatsheet', category: 'Edit' },

    // Focus View
    { keys: ['Space'], description: 'Cycle status of hero task', category: 'Focus View' },
    { keys: ['Enter'], description: 'Cycle status of hero task', category: 'Focus View' },
    { keys: ['←'], description: 'Previous task', category: 'Focus View' },
    { keys: ['→'], description: 'Skip to next task', category: 'Focus View' },
];

export const SHORTCUT_CATEGORIES: ShortcutCategory[] = ['Canvas', 'Selection', 'Edit', 'Focus View'];

/** True on platforms where Command is the primary modifier. */
export function isMac(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

/** Display label for a single key, swapping Cmd/Ctrl based on platform. */
export function keyLabel(key: string, mac: boolean): string {
    if (key === 'Cmd') return mac ? '⌘' : 'Ctrl';
    if (key === 'Shift') return mac ? '⇧' : 'Shift';
    if (key === 'Alt') return mac ? '⌥' : 'Alt';
    return key;
}
