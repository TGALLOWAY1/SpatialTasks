import React, { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { useKeyboardOffset } from '../../hooks/useKeyboardOffset';

interface FloatingActionButtonProps {
    onSubmit: (title: string) => void;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ onSubmit }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [value, setValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const keyboardOffset = useKeyboardOffset();

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
        }
    }, [isOpen]);

    const handleSubmit = () => {
        const trimmed = value.trim();
        if (trimmed) {
            onSubmit(trimmed);
            setValue('');
            setIsOpen(false);
        }
    };

    return (
        <>
            {/* Bottom sheet input for new task */}
            {isOpen && (
                <div className="fixed inset-0 z-[90]" onClick={() => setIsOpen(false)}>
                    <div className="absolute inset-0 bg-black/40" />
                    <div
                        className="absolute left-0 right-0 bg-slate-800 rounded-t-2xl shadow-2xl p-4 transition-[bottom] duration-100"
                        style={{ bottom: keyboardOffset, paddingBottom: 'calc(16px + var(--sab, 0px))' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3">
                            <input
                                ref={inputRef}
                                value={value}
                                onChange={e => setValue(e.target.value)}
                                placeholder="New task name..."
                                className="flex-1 bg-slate-700 border border-slate-600 text-slate-200 px-4 py-3 rounded-lg text-base outline-none focus:border-purple-500"
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleSubmit();
                                    if (e.key === 'Escape') setIsOpen(false);
                                }}
                            />
                            <button
                                onClick={handleSubmit}
                                className="bg-purple-600 text-white px-5 py-3 rounded-lg font-medium text-base active:bg-purple-500 transition-colors"
                            >
                                Add
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FAB button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className={clsx(
                        "fixed z-[80] w-14 h-14 rounded-full bg-purple-600 text-white shadow-lg",
                        "flex items-center justify-center",
                        "active:bg-purple-500 active:scale-95 transition-all"
                    )}
                    style={{
                        bottom: 'calc(24px + var(--sab, 0px))',
                        right: '24px',
                    }}
                    title="Add new task"
                >
                    <Plus className="w-7 h-7" />
                </button>
            )}
        </>
    );
};
