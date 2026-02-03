import { useState, useCallback } from 'react';
import { useConnectionStore } from '@/store/connectionStore';

interface ScreenCaptureOptions {
    audio?: boolean;
    video?: {
        width?: number;
        height?: number;
        frameRate?: number;
    };
}

// Browser detection helpers
const isChromium = (): boolean => {
    const userAgent = navigator.userAgent;
    return /Chrome|Chromium|Edg|OPR|Brave/.test(userAgent) && !/Firefox/.test(userAgent);
};

const isWindows = (): boolean => navigator.platform.includes('Win');
const isChromeOS = (): boolean => /CrOS/.test(navigator.userAgent);
const isMacOS = (): boolean => navigator.platform.includes('Mac');

export interface AudioCapabilityInfo {
    canCaptureSystemAudio: boolean;
    canCaptureTabAudio: boolean;
    recommendation: string;
}

export const getAudioCapabilities = (): AudioCapabilityInfo => {
    const chromium = isChromium();
    const windows = isWindows();
    const chromeOS = isChromeOS();
    const mac = isMacOS();

    if (chromium && (windows || chromeOS)) {
        return {
            canCaptureSystemAudio: true,
            canCaptureTabAudio: true,
            recommendation: 'Full system audio supported! Check "Share system audio" when sharing your screen.',
        };
    } else if (chromium && mac) {
        return {
            canCaptureSystemAudio: false,
            canCaptureTabAudio: true,
            recommendation: 'On Mac, only Chrome tab audio is supported. Share a Chrome tab to capture audio.',
        };
    } else {
        // Firefox, Safari, or other browsers
        return {
            canCaptureSystemAudio: false,
            canCaptureTabAudio: false,
            recommendation: 'Your browser has limited audio sharing. Use Chrome/Edge for best audio support.',
        };
    }
};

export const useScreenCapture = () => {
    const [error, setError] = useState<string | null>(null);
    const { localStream, isScreenSharing, setLocalStream, setIsScreenSharing } = useConnectionStore();

    const startCapture = useCallback(async (options: ScreenCaptureOptions = {}) => {
        try {
            // Build display media constraints with Chrome-specific options
            const displayMediaOptions: DisplayMediaStreamOptions = {
                video: {
                    width: { ideal: options.video?.width || 1920 },
                    height: { ideal: options.video?.height || 1080 },
                    frameRate: { ideal: options.video?.frameRate || 30 },
                },
                audio: options.audio !== undefined ? options.audio : true,
            };

            // Add Chrome-specific systemAudio constraint for Windows/ChromeOS
            if (isChromium() && (isWindows() || isChromeOS())) {
                // @ts-expect-error - systemAudio is a Chrome-specific extension
                displayMediaOptions.systemAudio = 'include';
                console.log('[ScreenCapture] Requesting system audio (Chrome/Windows/ChromeOS)');
            }

            // Add preferCurrentTab for better picker on Chrome
            if (isChromium()) {
                // @ts-expect-error - preferCurrentTab is Chrome-specific
                displayMediaOptions.preferCurrentTab = false;
                // @ts-expect-error - selfBrowserSurface enables showing current tab option
                displayMediaOptions.selfBrowserSurface = 'include';
                // @ts-expect-error - surfaceSwitching allows switching sources mid-share
                displayMediaOptions.surfaceSwitching = 'include';
                // @ts-expect-error - monitorTypeSurfaces includes screen/window/tab options
                displayMediaOptions.monitorTypeSurfaces = 'include';
            }

            const mediaStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);

            // Log capture diagnostics
            const videoTracks = mediaStream.getVideoTracks();
            const audioTracks = mediaStream.getAudioTracks();
            const capabilities = getAudioCapabilities();

            console.log('[ScreenCapture] Capture started:');
            console.log(`  - Browser: ${isChromium() ? 'Chromium-based' : 'Other'}`);
            console.log(`  - Platform: ${isWindows() ? 'Windows' : isMacOS() ? 'macOS' : isChromeOS() ? 'ChromeOS' : 'Other'}`);
            console.log(`  - Video tracks: ${videoTracks.length}`);
            console.log(`  - Audio tracks: ${audioTracks.length}`);
            console.log(`  - Capability: ${capabilities.recommendation}`);

            if (audioTracks.length === 0) {
                console.warn('[ScreenCapture] ⚠️ No audio track captured!');
                console.warn(`  Recommendation: ${capabilities.recommendation}`);
            } else {
                audioTracks.forEach((track, i) => {
                    console.log(`  - Audio track ${i}: enabled=${track.enabled}, muted=${track.muted}, label="${track.label}"`);
                });
            }

            // Handle when user stops sharing via browser UI
            mediaStream.getVideoTracks()[0].addEventListener('ended', () => {
                stopCapture();
            });

            setLocalStream(mediaStream);
            setIsScreenSharing(true);
            setError(null);

            return mediaStream;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to capture screen';
            console.error('Screen capture error:', errorMessage);
            setError(errorMessage);
            setIsScreenSharing(false);
            return null;
        }
    }, [setLocalStream, setIsScreenSharing]);

    const stopCapture = useCallback(() => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
            setIsScreenSharing(false);
        }
    }, [localStream, setLocalStream, setIsScreenSharing]);

    const switchSource = useCallback(async (options: ScreenCaptureOptions = {}) => {
        stopCapture();
        return await startCapture(options);
    }, [startCapture, stopCapture]);

    return {
        stream: localStream,
        isCapturing: isScreenSharing,
        error,
        startCapture,
        stopCapture,
        switchSource,
    };
};
