import { useState, useCallback, useEffect, useRef } from 'react';

export interface VoiceChatState {
    stream: MediaStream | null;
    isAudioEnabled: boolean;
    audioDevices: MediaDeviceInfo[];
    selectedAudioDevice: string | null;
    error: string | null;
    isLoading: boolean;
}

export interface UseVoiceChatReturn extends VoiceChatState {
    startVoiceChat: () => Promise<MediaStream | null>;
    stopVoiceChat: () => void;
    toggleAudio: () => void;
    selectAudioDevice: (deviceId: string) => Promise<void>;
}

export const useVoiceChat = (): UseVoiceChatReturn => {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedAudioDevice, setSelectedAudioDevice] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const streamRef = useRef<MediaStream | null>(null);

    // Get available audio devices
    const refreshDevices = useCallback(async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            setAudioDevices(devices.filter(d => d.kind === 'audioinput'));
        } catch (err) {
            console.error('[VoiceChat] Failed to enumerate devices:', err);
        }
    }, []);

    // Listen for device changes
    useEffect(() => {
        refreshDevices();
        navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
        return () => {
            navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
        };
    }, [refreshDevices]);

    const startVoiceChat = useCallback(async (): Promise<MediaStream | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const constraints: MediaStreamConstraints = {
                audio: selectedAudioDevice
                    ? { deviceId: { exact: selectedAudioDevice } }
                    : true,
                video: false, // Audio only - no video
            };

            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

            console.log('[VoiceChat] Voice chat started:');
            console.log(`  - Audio tracks: ${mediaStream.getAudioTracks().length}`);

            streamRef.current = mediaStream;
            setStream(mediaStream);
            setIsLoading(false);

            // Refresh devices after getting permission
            await refreshDevices();

            return mediaStream;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to access microphone';
            console.error('[VoiceChat] Error:', errorMessage);
            setError(errorMessage);
            setIsLoading(false);
            return null;
        }
    }, [selectedAudioDevice, refreshDevices]);

    const stopVoiceChat = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                track.stop();
                console.log(`[VoiceChat] Stopped ${track.kind} track`);
            });
            streamRef.current = null;
            setStream(null);
        }
    }, []);

    const toggleAudio = useCallback(() => {
        if (streamRef.current) {
            const audioTracks = streamRef.current.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = !track.enabled;
                console.log(`[VoiceChat] Audio ${track.enabled ? 'enabled' : 'disabled'}`);
            });
            setIsAudioEnabled(audioTracks[0]?.enabled ?? false);
        }
    }, []);

    const selectAudioDevice = useCallback(async (deviceId: string) => {
        setSelectedAudioDevice(deviceId);
        if (streamRef.current) {
            // Restart with new device
            stopVoiceChat();
            await startVoiceChat();
        }
    }, [stopVoiceChat, startVoiceChat]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    return {
        stream,
        isAudioEnabled,
        audioDevices,
        selectedAudioDevice,
        error,
        isLoading,
        startVoiceChat,
        stopVoiceChat,
        toggleAudio,
        selectAudioDevice,
    };
};

// Keep old export for backward compatibility during transition
export const useUserMedia = useVoiceChat;
