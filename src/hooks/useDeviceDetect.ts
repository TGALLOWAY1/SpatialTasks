import { useState, useEffect } from 'react';

interface DeviceInfo {
    isTouchDevice: boolean;
    isIOS: boolean;
    isMobile: boolean;
    screenSize: 'small' | 'medium' | 'large';
}

function detectDevice(): DeviceInfo {
    const isTouchDevice =
        typeof window !== 'undefined' &&
        (navigator.maxTouchPoints > 0 || matchMedia('(hover: none)').matches);

    const isIOS =
        typeof window !== 'undefined' &&
        isTouchDevice &&
        // CSS-based detection: iOS Safari supports -webkit-touch-callout
        CSS.supports('-webkit-touch-callout', 'none');

    const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const screenSize: DeviceInfo['screenSize'] =
        width < 640 ? 'small' : width < 1024 ? 'medium' : 'large';

    const isMobile = isTouchDevice && width < 1024;

    return { isTouchDevice, isIOS, isMobile, screenSize };
}

export function useDeviceDetect(): DeviceInfo {
    const [device, setDevice] = useState<DeviceInfo>(detectDevice);

    useEffect(() => {
        const handleResize = () => setDevice(detectDevice());
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return device;
}

// Singleton for use outside of React components
let cachedDevice: DeviceInfo | null = null;
export function getDeviceInfo(): DeviceInfo {
    if (!cachedDevice) {
        cachedDevice = detectDevice();
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', () => {
                cachedDevice = detectDevice();
            });
        }
    }
    return cachedDevice;
}
