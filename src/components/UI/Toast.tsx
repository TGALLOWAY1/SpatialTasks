import React from 'react';
import { create } from 'zustand';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { clsx } from 'clsx';

interface Toast {
    id: string;
    message: string;
    type: 'error' | 'success' | 'info';
}

interface ToastStore {
    toasts: Toast[];
    addToast: (message: string, type?: Toast['type']) => void;
    removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set, get) => ({
    toasts: [],
    addToast: (message, type = 'error') => {
        const id = crypto.randomUUID();
        set({ toasts: [...get().toasts, { id, message, type }] });
        setTimeout(() => {
            set({ toasts: get().toasts.filter(t => t.id !== id) });
        }, 5000);
    },
    removeToast: (id) => {
        set({ toasts: get().toasts.filter(t => t.id !== id) });
    },
}));

const ToastIcon = ({ type }: { type: Toast['type'] }) => {
    switch (type) {
        case 'error': return <AlertCircle className="w-4 h-4 flex-shrink-0" />;
        case 'success': return <CheckCircle2 className="w-4 h-4 flex-shrink-0" />;
        case 'info': return <Info className="w-4 h-4 flex-shrink-0" />;
    }
};

export const ToastContainer: React.FC = () => {
    const toasts = useToastStore(state => state.toasts);
    const removeToast = useToastStore(state => state.removeToast);

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={clsx(
                        "flex items-center gap-2 px-4 py-3 rounded-lg shadow-xl border text-sm animate-slide-in",
                        toast.type === 'error' && "bg-red-950 border-red-800 text-red-200",
                        toast.type === 'success' && "bg-green-950 border-green-800 text-green-200",
                        toast.type === 'info' && "bg-blue-950 border-blue-800 text-blue-200",
                    )}
                >
                    <ToastIcon type={toast.type} />
                    <span className="flex-1">{toast.message}</span>
                    <button onClick={() => removeToast(toast.id)} className="opacity-60 hover:opacity-100">
                        <X className="w-3 h-3" />
                    </button>
                </div>
            ))}
        </div>
    );
};
