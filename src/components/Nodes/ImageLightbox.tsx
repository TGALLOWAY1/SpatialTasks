import { useCallback, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { ImageAttachment } from '../../types';

interface ImageLightboxProps {
    images: ImageAttachment[];
    index: number;
    onIndexChange: (next: number) => void;
    onClose: () => void;
}

/**
 * Fullscreen lightbox for viewing image attachments at full resolution.
 * Click backdrop or press Escape to close. Arrow keys / on-screen chevrons
 * step through the array when more than one image is present.
 */
export const ImageLightbox = ({ images, index, onIndexChange, onClose }: ImageLightboxProps) => {
    const current = images[index];
    const hasMultiple = images.length > 1;

    const goPrev = useCallback(() => {
        if (!hasMultiple) return;
        onIndexChange((index - 1 + images.length) % images.length);
    }, [index, images.length, hasMultiple, onIndexChange]);

    const goNext = useCallback(() => {
        if (!hasMultiple) return;
        onIndexChange((index + 1) % images.length);
    }, [index, images.length, hasMultiple, onIndexChange]);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onClose();
            } else if (e.key === 'ArrowLeft') {
                e.stopPropagation();
                goPrev();
            } else if (e.key === 'ArrowRight') {
                e.stopPropagation();
                goNext();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [goPrev, goNext, onClose]);

    if (!current) return null;

    return (
        <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85"
            onClick={onClose}
            onMouseDown={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
        >
            <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="absolute top-4 right-4 p-2 rounded-full bg-slate-900/80 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center z-10"
                title="Close (Esc)"
                aria-label="Close image viewer"
            >
                <X className="w-5 h-5" />
            </button>

            {hasMultiple && (
                <>
                    <button
                        onClick={(e) => { e.stopPropagation(); goPrev(); }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/80 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center z-10"
                        title="Previous (←)"
                        aria-label="Previous image"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); goNext(); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/80 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center z-10"
                        title="Next (→)"
                        aria-label="Next image"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </>
            )}

            <img
                src={current.dataUrl}
                alt={current.name ?? 'Attached image'}
                className="max-h-[90vh] max-w-[90vw] object-contain rounded shadow-2xl"
                onClick={e => e.stopPropagation()}
            />

            {hasMultiple && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/80 text-slate-200 text-xs px-3 py-1 rounded-full">
                    {index + 1} / {images.length}
                </div>
            )}
        </div>
    );
};
