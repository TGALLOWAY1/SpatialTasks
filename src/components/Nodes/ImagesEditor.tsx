import { useCallback, useRef, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { ImageAttachment } from '../../types';
import { ImageLightbox } from './ImageLightbox';

interface ImagesEditorProps {
    images: ImageAttachment[];
    onChange: (next: ImageAttachment[]) => void;
    onClose: () => void;
    /** When false, the panel is view-only (no upload/remove controls). */
    canEdit?: boolean;
    accentColor?: 'slate' | 'indigo';
}

const ACCEPTED_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const ACCEPT_ATTR = ACCEPTED_MIME.join(',');
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB per file

const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const readAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });

/**
 * Inline "Visual References" section rendered in the task body when expanded.
 * Shows a thumbnail grid; clicking a thumbnail opens a fullscreen lightbox.
 * Upload / remove controls are only exposed when `canEdit` is true (i.e. when
 * the node is selected), keeping the panel compact in the common read-only case.
 */
export const ImagesEditor = ({
    images,
    onChange,
    onClose,
    canEdit = true,
    accentColor = 'slate',
}: ImagesEditorProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    const isIndigo = accentColor === 'indigo';

    const handlePickFiles = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFiles = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        // Reset so selecting the same file twice still triggers onChange.
        e.target.value = '';
        if (files.length === 0) return;

        setError(null);
        const accepted: ImageAttachment[] = [];
        const errors: string[] = [];

        for (const file of files) {
            if (!ACCEPTED_MIME.includes(file.type)) {
                errors.push(`${file.name}: unsupported type`);
                continue;
            }
            if (file.size > MAX_FILE_BYTES) {
                errors.push(`${file.name}: too large (${formatBytes(file.size)}, max 5 MB)`);
                continue;
            }
            try {
                const dataUrl = await readAsDataUrl(file);
                accepted.push({
                    id: crypto.randomUUID(),
                    dataUrl,
                    name: file.name,
                    mimeType: file.type,
                    addedAt: Date.now(),
                });
            } catch {
                errors.push(`${file.name}: failed to read`);
            }
        }

        if (accepted.length > 0) {
            onChange([...images, ...accepted]);
        }
        if (errors.length > 0) {
            setError(errors.join(' • '));
        }
    }, [images, onChange]);

    const handleRemove = useCallback((id: string) => {
        onChange(images.filter(img => img.id !== id));
    }, [images, onChange]);

    const openLightbox = useCallback((index: number) => {
        setLightboxIndex(index);
    }, []);

    return (
        <>
            <div
                className={`mt-2 rounded border p-2 ${
                    isIndigo
                        ? 'border-indigo-800 bg-indigo-900/30'
                        : 'border-slate-700 bg-slate-900/40'
                }`}
                onMouseDown={e => e.stopPropagation()}
                onClick={e => e.stopPropagation()}
                onPointerDown={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-2">
                    <span className={`text-[11px] font-medium uppercase tracking-wide ${
                        isIndigo ? 'text-indigo-300' : 'text-slate-400'
                    }`}>
                        Visual References
                        {images.length > 0 && (
                            <span className={`ml-1 font-normal ${isIndigo ? 'text-indigo-400/80' : 'text-slate-500'}`}>
                                ({images.length})
                            </span>
                        )}
                    </span>
                    <div className="flex items-center gap-0.5">
                        {canEdit && (
                            <button
                                onClick={handlePickFiles}
                                className={`p-1 rounded transition-colors flex items-center gap-1 ${
                                    isIndigo
                                        ? 'text-indigo-300 hover:bg-indigo-800'
                                        : 'text-slate-300 hover:bg-slate-700'
                                }`}
                                title="Add image"
                            >
                                <Plus className="w-3 h-3" />
                                <span className="text-[10px]">Add</span>
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className={`p-1 rounded transition-colors ${
                                isIndigo ? 'text-indigo-400 hover:bg-indigo-800' : 'text-slate-500 hover:bg-slate-700'
                            }`}
                            title="Hide images"
                            aria-label="Hide images"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                {canEdit && (
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={ACCEPT_ATTR}
                        multiple
                        className="hidden"
                        onChange={handleFiles}
                    />
                )}

                {images.length === 0 ? (
                    <div
                        className={`rounded border border-dashed text-center py-3 px-2 ${
                            isIndigo
                                ? 'border-indigo-800 text-indigo-400'
                                : 'border-slate-700 text-slate-500'
                        }`}
                    >
                        <p className="text-[11px]">No images yet.</p>
                        {canEdit && (
                            <button
                                onClick={handlePickFiles}
                                className={`mt-1 text-[11px] underline ${
                                    isIndigo ? 'text-indigo-300 hover:text-indigo-100' : 'text-slate-300 hover:text-slate-100'
                                }`}
                            >
                                Upload an image
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
                        {images.map((img, idx) => (
                            <div
                                key={img.id}
                                className={`relative group rounded overflow-hidden border ${
                                    isIndigo ? 'border-indigo-800' : 'border-slate-700'
                                }`}
                            >
                                <button
                                    onClick={() => openLightbox(idx)}
                                    className="block w-full aspect-square bg-slate-950"
                                    title={img.name ?? 'View image'}
                                >
                                    <img
                                        src={img.dataUrl}
                                        alt={img.name ?? `Image ${idx + 1}`}
                                        loading="lazy"
                                        className="w-full h-full object-cover"
                                    />
                                </button>
                                {canEdit && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleRemove(img.id); }}
                                        className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-slate-900/80 text-slate-200 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-red-700 transition-opacity flex items-center justify-center"
                                        title="Remove image"
                                        aria-label={`Remove ${img.name ?? 'image'}`}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {error && (
                    <p className={`mt-2 text-[10px] ${isIndigo ? 'text-red-300' : 'text-red-400'}`}>
                        {error}
                    </p>
                )}

                {canEdit && (
                    <p className={`mt-1.5 text-[9px] ${isIndigo ? 'text-indigo-400/80' : 'text-slate-500'}`}>
                        PNG, JPEG, WebP, GIF · up to 5 MB each
                    </p>
                )}
            </div>

            {lightboxIndex !== null && images[lightboxIndex] && (
                <ImageLightbox
                    images={images}
                    index={lightboxIndex}
                    onIndexChange={setLightboxIndex}
                    onClose={() => setLightboxIndex(null)}
                />
            )}
        </>
    );
};
