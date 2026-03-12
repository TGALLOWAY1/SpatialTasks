import React, { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';

export interface MenuItem {
    label: string;
    shortcut?: string;
    icon?: React.ReactNode;
    danger?: boolean;
    disabled?: boolean;
    onClick: () => void;
    submenu?: MenuItem[];
}

interface ContextMenuProps {
    x: number;
    y: number;
    items: MenuItem[];
    onClose: () => void;
}

const SubMenu: React.FC<{ items: MenuItem[]; parentRight: number; parentTop: number }> = ({ items, parentRight, parentTop }) => {
    return (
        <div
            className="absolute bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 min-w-[160px] z-[60]"
            style={{ left: parentRight, top: parentTop }}
        >
            {items.map((item, i) => (
                <button
                    key={i}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!item.disabled) item.onClick();
                    }}
                    disabled={item.disabled}
                    className={clsx(
                        "w-full text-left px-3 py-1.5 touch:py-3 touch:px-4 text-sm flex items-center gap-2 transition-colors touch:min-h-[48px]",
                        item.disabled && "opacity-40 cursor-not-allowed",
                        item.danger
                            ? "text-red-400 hover:bg-red-500/20"
                            : "text-slate-200 hover:bg-slate-700"
                    )}
                >
                    {item.icon && <span className="w-4 h-4 flex-shrink-0">{item.icon}</span>}
                    <span className="flex-1">{item.label}</span>
                    {item.shortcut && <span className="text-[10px] text-slate-500 ml-2">{item.shortcut}</span>}
                </button>
            ))}
        </div>
    );
};

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [activeSubmenu, setActiveSubmenu] = useState<number | null>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) {
                onClose();
            }
        };
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    // Adjust position to stay within viewport
    const adjustedX = Math.min(x, window.innerWidth - 200);
    const adjustedY = Math.min(y, window.innerHeight - items.length * 36 - 20);

    return (
        <div
            ref={menuRef}
            className="fixed bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 min-w-[180px] z-50"
            style={{ left: adjustedX, top: adjustedY }}
        >
            {items.map((item, i) => (
                <div
                    key={i}
                    className="relative"
                    onMouseEnter={() => item.submenu ? setActiveSubmenu(i) : setActiveSubmenu(null)}
                    onMouseLeave={() => setActiveSubmenu(null)}
                >
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!item.disabled && item.submenu) {
                                // Toggle submenu on click (needed for touch devices)
                                setActiveSubmenu(activeSubmenu === i ? null : i);
                            } else if (!item.disabled) {
                                item.onClick();
                                onClose();
                            }
                        }}
                        disabled={item.disabled}
                        className={clsx(
                            "w-full text-left px-3 py-1.5 touch:py-3 touch:px-4 text-sm flex items-center gap-2 transition-colors touch:min-h-[48px]",
                            item.disabled && "opacity-40 cursor-not-allowed",
                            item.danger
                                ? "text-red-400 hover:bg-red-500/20"
                                : "text-slate-200 hover:bg-slate-700"
                        )}
                    >
                        {item.icon && <span className="w-4 h-4 flex-shrink-0">{item.icon}</span>}
                        <span className="flex-1">{item.label}</span>
                        {item.shortcut && <span className="text-[10px] text-slate-500 ml-2">{item.shortcut}</span>}
                        {item.submenu && <span className="text-slate-500 ml-1">&#9656;</span>}
                    </button>
                    {item.submenu && activeSubmenu === i && (
                        <SubMenu items={item.submenu.map(sub => ({
                            ...sub,
                            onClick: () => { sub.onClick(); onClose(); }
                        }))} parentRight={180} parentTop={0} />
                    )}
                </div>
            ))}
        </div>
    );
};
