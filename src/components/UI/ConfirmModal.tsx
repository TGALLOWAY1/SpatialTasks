import React, { useEffect, useRef } from 'react';
import { clsx } from 'clsx';

interface ConfirmModalProps {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    danger = false,
    onConfirm,
    onCancel,
}) => {
    const confirmRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        document.addEventListener('keydown', handleEscape);
        confirmRef.current?.focus();
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onCancel]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onCancel}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60" />

            {/* Modal */}
            <div
                className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-w-sm w-[calc(100%-2rem)] mx-4 p-6"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
                <p className="text-slate-300 text-sm mb-6">{message}</p>

                <div className="flex flex-col-reverse touch:flex-col-reverse sm:flex-row sm:justify-end gap-2">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2.5 touch:py-3 rounded-lg text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 transition-colors touch:w-full sm:w-auto"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        ref={confirmRef}
                        onClick={onConfirm}
                        className={clsx(
                            "px-4 py-2.5 touch:py-3 rounded-lg text-sm font-medium transition-colors touch:w-full sm:w-auto",
                            danger
                                ? "bg-red-600 hover:bg-red-500 text-white"
                                : "bg-purple-600 hover:bg-purple-500 text-white"
                        )}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};
