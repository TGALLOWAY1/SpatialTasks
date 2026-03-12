import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { MenuItem } from './ContextMenu';

interface ActionSheetProps {
    items: MenuItem[];
    onClose: () => void;
}

export const ActionSheet: React.FC<ActionSheetProps> = ({ items, onClose }) => {
    const [visible, setVisible] = useState(false);
    const [expandedSubmenu, setExpandedSubmenu] = useState<number | null>(null);

    useEffect(() => {
        // Trigger slide-up animation
        requestAnimationFrame(() => setVisible(true));

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const handleDismiss = () => {
        setVisible(false);
        setTimeout(onClose, 200);
    };

    return (
        <div className="fixed inset-0 z-[100]" onClick={handleDismiss}>
            {/* Backdrop */}
            <div className={clsx(
                "absolute inset-0 bg-black/50 transition-opacity duration-200",
                visible ? "opacity-100" : "opacity-0"
            )} />

            {/* Sheet */}
            <div
                className={clsx(
                    "absolute bottom-0 left-0 right-0 bg-slate-800 rounded-t-2xl shadow-2xl transition-transform duration-200 ease-out",
                    visible ? "translate-y-0" : "translate-y-full"
                )}
                style={{ paddingBottom: 'calc(12px + var(--sab, 0px))' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Drag handle indicator */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 rounded-full bg-slate-600" />
                </div>

                {/* Menu items */}
                <div className="px-2 pb-2">
                    {items.map((item, i) => (
                        <div key={i}>
                            <button
                                onClick={() => {
                                    if (item.submenu) {
                                        setExpandedSubmenu(expandedSubmenu === i ? null : i);
                                    } else if (!item.disabled) {
                                        item.onClick();
                                        handleDismiss();
                                    }
                                }}
                                disabled={item.disabled}
                                className={clsx(
                                    "w-full text-left px-4 py-3.5 text-base flex items-center gap-3 rounded-lg transition-colors min-h-[48px]",
                                    item.disabled && "opacity-40 cursor-not-allowed",
                                    item.danger
                                        ? "text-red-400 active:bg-red-500/20"
                                        : "text-slate-200 active:bg-slate-700"
                                )}
                            >
                                {item.icon && <span className="w-5 h-5 flex-shrink-0">{item.icon}</span>}
                                <span className="flex-1 font-medium">{item.label}</span>
                                {item.submenu && (
                                    <span className={clsx(
                                        "text-slate-500 transition-transform",
                                        expandedSubmenu === i && "rotate-90"
                                    )}>&#9656;</span>
                                )}
                            </button>

                            {/* Inline expanded submenu */}
                            {item.submenu && expandedSubmenu === i && (
                                <div className="ml-4 border-l-2 border-slate-700 pl-2 mb-1">
                                    {item.submenu.map((sub, j) => (
                                        <button
                                            key={j}
                                            onClick={() => {
                                                if (!sub.disabled) {
                                                    sub.onClick();
                                                    handleDismiss();
                                                }
                                            }}
                                            disabled={sub.disabled}
                                            className={clsx(
                                                "w-full text-left px-4 py-3 text-sm flex items-center gap-3 rounded-lg transition-colors min-h-[44px]",
                                                sub.disabled && "opacity-40 cursor-not-allowed",
                                                sub.danger
                                                    ? "text-red-400 active:bg-red-500/20"
                                                    : "text-slate-300 active:bg-slate-700"
                                            )}
                                        >
                                            {sub.icon && <span className="w-4 h-4 flex-shrink-0">{sub.icon}</span>}
                                            <span className="flex-1">{sub.label}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Cancel button */}
                <div className="px-2 pt-1">
                    <div className="border-t border-slate-700 pt-2">
                        <button
                            onClick={handleDismiss}
                            className="w-full text-center px-4 py-3.5 text-base font-medium text-slate-400 rounded-lg active:bg-slate-700 transition-colors min-h-[48px]"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
