import { useState, useEffect } from 'react';

/**
 * Returns the offset (in px) that bottom-anchored elements should apply
 * when the iOS virtual keyboard is open. Uses the Visual Viewport API.
 */
export function useKeyboardOffset(): number {
    const [offset, setOffset] = useState(0);

    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return;

        const handleResize = () => {
            // When keyboard opens, visualViewport.height shrinks
            const keyboardHeight = window.innerHeight - vv.height;
            setOffset(keyboardHeight > 0 ? keyboardHeight : 0);
        };

        vv.addEventListener('resize', handleResize);
        vv.addEventListener('scroll', handleResize);
        return () => {
            vv.removeEventListener('resize', handleResize);
            vv.removeEventListener('scroll', handleResize);
        };
    }, []);

    return offset;
}
