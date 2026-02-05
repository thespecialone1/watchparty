import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Volume2, VolumeX, Maximize, Minimize, AlertCircle, RefreshCw } from 'lucide-react';

interface VideoPlayerProps {
    stream: MediaStream | null;
    isMuted?: boolean;
    isLocal?: boolean;
    className?: string;
}

export function VideoPlayer({ stream, isMuted = false, isLocal = false, className }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [volume, setVolume] = useState(1);
    const [isInternalMuted, setIsInternalMuted] = useState(isMuted);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(false);
    const [audioBlocked, setAudioBlocked] = useState(false);
    const [hasAudioTrack, setHasAudioTrack] = useState(false);
    const [isStuck, setIsStuck] = useState(false);
    const streamIdRef = useRef<string | null>(null);

    // Sync prop mute state
    useEffect(() => {
        setIsInternalMuted(isMuted);
    }, [isMuted]);

    // Attempt to play video with audio
    const attemptPlay = useCallback(async () => {
        if (!videoRef.current || !stream) return false;

        try {
            // Reset stuck state
            setIsStuck(false);

            // Apply current settings
            videoRef.current.muted = isInternalMuted || isLocal;
            videoRef.current.volume = volume;

            await videoRef.current.play();
            setAudioBlocked(false);
            console.log('[VideoPlayer] Playback started successfully');
            return true;
        } catch (e) {
            console.warn('[VideoPlayer] Autoplay blocked:', e);

            if (videoRef.current) {
                videoRef.current.muted = true;
                try {
                    await videoRef.current.play();
                    setAudioBlocked(!isLocal);
                    console.log('[VideoPlayer] Muted playback started');
                    return true;
                } catch (e2) {
                    console.error('[VideoPlayer] Muted playback also failed:', e2);
                    return false;
                }
            }
            return false;
        }
    }, [stream, isInternalMuted, isLocal, volume]);

    // Handle user clicking to unmute after autoplay block
    const handleUnmute = useCallback(async () => {
        if (!videoRef.current) return;

        videoRef.current.muted = false;
        setIsInternalMuted(false);
        setAudioBlocked(false);

        try {
            await videoRef.current.play();
        } catch (e) {
            console.error('[VideoPlayer] Failed to unmute:', e);
        }
    }, []);

    // Retry playback (for stuck videos)
    const retryPlayback = useCallback(async () => {
        if (!videoRef.current || !stream) return;

        console.log('[VideoPlayer] Retrying playback...');

        // Re-bind stream
        videoRef.current.srcObject = null;
        await new Promise(resolve => setTimeout(resolve, 100));
        videoRef.current.srcObject = stream;

        // Try to play
        await attemptPlay();
    }, [stream, attemptPlay]);

    // Handle stream binding
    useEffect(() => {
        if (!videoRef.current) return;

        if (!stream) {
            videoRef.current.srcObject = null;
            streamIdRef.current = null;
            setHasAudioTrack(false);
            return;
        }

        // Check if stream changed
        const newStreamId = stream.id;
        if (streamIdRef.current !== newStreamId) {
            console.log(`[VideoPlayer] Stream changed: ${streamIdRef.current} -> ${newStreamId}`);
            streamIdRef.current = newStreamId;

            // Bind stream
            videoRef.current.srcObject = stream;

            const audioTracks = stream.getAudioTracks();
            const videoTracks = stream.getVideoTracks();
            setHasAudioTrack(audioTracks.length > 0);

            console.log(`[VideoPlayer] Stream bound - Video: ${videoTracks.length}, Audio: ${audioTracks.length}, isLocal: ${isLocal}`);

            // Listen for track ended events
            videoTracks.forEach(track => {
                track.onended = () => {
                    console.log('[VideoPlayer] Video track ended');
                    setIsStuck(true);
                };
            });

            // Attempt to play
            if (!isLocal) {
                attemptPlay();
            }
        }
    }, [stream, isLocal, attemptPlay]);

    // Monitor for stuck video (no time progress)
    useEffect(() => {
        if (!videoRef.current || !stream || isLocal) return;

        let lastTime = 0;
        let stuckCounter = 0;

        const checkInterval = setInterval(() => {
            if (!videoRef.current) return;

            const currentTime = videoRef.current.currentTime;

            if (currentTime === lastTime && !videoRef.current.paused) {
                stuckCounter++;
                if (stuckCounter >= 3) {
                    console.log('[VideoPlayer] Video appears stuck, attempting recovery...');
                    setIsStuck(true);
                    retryPlayback();
                    stuckCounter = 0;
                }
            } else {
                stuckCounter = 0;
                setIsStuck(false);
            }

            lastTime = currentTime;
        }, 2000);

        return () => clearInterval(checkInterval);
    }, [stream, isLocal, retryPlayback]);

    // Update volume/mute on video element
    useEffect(() => {
        if (videoRef.current) {
            if (!audioBlocked && !isLocal) {
                videoRef.current.muted = isInternalMuted;
            }
            videoRef.current.volume = volume;
        }
    }, [volume, isInternalMuted, audioBlocked, isLocal]);

    const toggleFullscreen = () => {
        if (!containerRef.current || !videoRef.current) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const videoElement = videoRef.current as any;
        if (videoElement.webkitEnterFullscreen) {
            videoElement.webkitEnterFullscreen();
            return;
        }

        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => {
                console.error(`Fullscreen error: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFs = !!document.fullscreenElement;
            setIsFullscreen(isFs);

            // Resume playback if we exited fullscreen and it paused
            if (!isFs && videoRef.current && videoRef.current.paused) {
                console.log('[VideoPlayer] Exited fullscreen, resuming playback...');
                videoRef.current.play().catch(console.warn);
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange); // Safari support
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, []);

    if (!stream) {
        return (
            <div className={cn("overflow-hidden bg-zinc-900 flex items-center justify-center rounded-xl border border-zinc-800/50", className)}>
                <div className="text-center p-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
                        <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <p className="text-zinc-500">
                        {isLocal ? 'Click "Share Screen" to start' : 'Waiting for stream...'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={cn(
                "overflow-hidden bg-zinc-900 relative group rounded-xl",
                "border border-zinc-800/50",
                className,
                isFullscreen && "rounded-none w-full h-full"
            )}
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
            onClick={() => setShowControls(true)}
        >
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-contain"
            />

            {/* Status Badge */}
            <div className="absolute top-3 left-3 z-10 flex gap-2">
                <div className="px-2 py-0.5 bg-red-500/90 rounded text-[10px] font-bold text-white flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    LIVE
                </div>
                {!isLocal && !hasAudioTrack && (
                    <div className="px-2 py-0.5 bg-amber-500/90 rounded text-[10px] font-bold text-white flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        No Audio
                    </div>
                )}
                {isStuck && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            retryPlayback();
                        }}
                        className="px-2 py-0.5 bg-orange-500/90 hover:bg-orange-500 rounded text-[10px] font-bold text-white flex items-center gap-1 cursor-pointer transition-colors"
                    >
                        <RefreshCw className="w-3 h-3" />
                        Retry
                    </button>
                )}
            </div>

            {/* Audio Blocked Banner */}
            {!isLocal && audioBlocked && (
                <button
                    onClick={handleUnmute}
                    className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm cursor-pointer transition-all hover:bg-black/50"
                >
                    <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-zinc-800/80 border border-zinc-700/50">
                        <div className="w-14 h-14 rounded-full bg-zinc-700 flex items-center justify-center">
                            <VolumeX className="w-7 h-7 text-zinc-300" />
                        </div>
                        <div className="text-center">
                            <p className="text-white font-medium">Audio is muted</p>
                            <p className="text-zinc-400 text-sm">Tap to enable audio</p>
                        </div>
                    </div>
                </button>
            )}

            {/* Controls Overlay */}
            <div
                className={cn(
                    "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3 transition-opacity duration-300 flex items-center justify-between gap-4",
                    showControls || !isLocal ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}
            >
                <div className="flex items-center gap-3">
                    {/* Audio Controls (Only for viewers) */}
                    {!isLocal && (
                        <>
                            <button
                                className="h-8 w-8 rounded-full flex items-center justify-center bg-zinc-700/50 hover:bg-zinc-600/50 text-white transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsInternalMuted(!isInternalMuted);
                                }}
                            >
                                {isInternalMuted || volume === 0 ? (
                                    <VolumeX className="h-4 w-4" />
                                ) : (
                                    <Volume2 className="h-4 w-4" />
                                )}
                            </button>

                            {/* Volume slider */}
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={isInternalMuted ? 0 : volume}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                    const newVolume = parseFloat(e.target.value);
                                    setVolume(newVolume);
                                    if (newVolume > 0) setIsInternalMuted(false);
                                    if (newVolume === 0) setIsInternalMuted(true);
                                    if (videoRef.current) {
                                        videoRef.current.volume = newVolume;
                                        videoRef.current.muted = newVolume === 0;
                                    }
                                }}
                                className="w-20 md:w-28 h-1.5 bg-zinc-600 rounded-full appearance-none cursor-pointer 
                                    [&::-webkit-slider-thumb]:appearance-none 
                                    [&::-webkit-slider-thumb]:w-3 
                                    [&::-webkit-slider-thumb]:h-3 
                                    [&::-webkit-slider-thumb]:rounded-full 
                                    [&::-webkit-slider-thumb]:bg-white 
                                    [&::-webkit-slider-thumb]:cursor-pointer
                                    [&::-moz-range-thumb]:w-3 
                                    [&::-moz-range-thumb]:h-3 
                                    [&::-moz-range-thumb]:rounded-full 
                                    [&::-moz-range-thumb]:bg-white 
                                    [&::-moz-range-thumb]:border-0
                                    [&::-moz-range-thumb]:cursor-pointer"
                            />

                            <span className="text-zinc-400 text-xs min-w-[32px]">
                                {Math.round((isInternalMuted ? 0 : volume) * 100)}%
                            </span>
                        </>
                    )}
                </div>

                {/* Fullscreen Toggle */}
                <button
                    className="h-8 w-8 rounded-full flex items-center justify-center bg-zinc-700/50 hover:bg-zinc-600/50 text-white transition-colors"
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleFullscreen();
                    }}
                >
                    {isFullscreen ? (
                        <Minimize className="h-4 w-4" />
                    ) : (
                        <Maximize className="h-4 w-4" />
                    )}
                </button>
            </div>
        </div>
    );
}
