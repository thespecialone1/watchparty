import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { MicOff, VideoOff } from 'lucide-react';

interface UserVideoTileProps {
    stream: MediaStream | null;
    name: string;
    isLocal?: boolean;
    isMuted?: boolean;
    isVideoOff?: boolean;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

export function UserVideoTile({
    stream,
    name,
    isLocal = false,
    isMuted = false,
    isVideoOff = false,
    size = 'md',
    className,
}: UserVideoTileProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [hasVideo, setHasVideo] = useState(false);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
            const videoTracks = stream.getVideoTracks();
            setHasVideo(videoTracks.length > 0 && videoTracks[0].enabled);

            // Listen for track enabled/disabled changes
            videoTracks.forEach(track => {
                track.onended = () => setHasVideo(false);
                track.onmute = () => setHasVideo(false);
                track.onunmute = () => setHasVideo(true);
            });
        } else {
            setHasVideo(false);
        }
    }, [stream]);

    // Update hasVideo when isVideoOff prop changes
    useEffect(() => {
        setHasVideo(!isVideoOff && stream !== null);
    }, [isVideoOff, stream]);

    const sizeClasses = {
        sm: 'w-20 h-14',
        md: 'w-32 h-24',
        lg: 'w-40 h-30',
        xl: 'w-44 h-32 sm:w-48 sm:h-36', // BIGGER size for video calls
    };

    const avatarSizes = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
        xl: 'w-14 h-14 text-lg',
    };

    const initials = name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <div
            className={cn(
                'relative rounded-xl overflow-hidden bg-zinc-800',
                'border border-zinc-700/50',
                sizeClasses[size],
                className
            )}
        >
            {/* Video element */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isLocal} // Always mute local to prevent feedback
                className={cn(
                    'w-full h-full object-cover',
                    isLocal && 'scale-x-[-1]', // Mirror local video
                    (!hasVideo || isVideoOff) && 'hidden'
                )}
            />

            {/* Avatar placeholder when video is off */}
            {(!hasVideo || isVideoOff) && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
                    <div className={cn(
                        'rounded-full bg-zinc-700 flex items-center justify-center',
                        avatarSizes[size]
                    )}>
                        <span className="text-zinc-300 font-medium">{initials}</span>
                    </div>
                </div>
            )}

            {/* Name label */}
            <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-gradient-to-t from-black/70 to-transparent">
                <div className="flex items-center gap-1">
                    <span className="text-white text-xs font-medium truncate">
                        {isLocal ? 'You' : name}
                    </span>
                    {isMuted && (
                        <MicOff className="w-3 h-3 text-red-400 flex-shrink-0" />
                    )}
                </div>
            </div>

            {/* Status indicators - top right */}
            {(isMuted || isVideoOff) && (
                <div className="absolute top-1 right-1 flex gap-0.5">
                    {isMuted && (
                        <div className="w-5 h-5 rounded-full bg-red-500/80 flex items-center justify-center">
                            <MicOff className="w-2.5 h-2.5 text-white" />
                        </div>
                    )}
                    {isVideoOff && (
                        <div className="w-5 h-5 rounded-full bg-red-500/80 flex items-center justify-center">
                            <VideoOff className="w-2.5 h-2.5 text-white" />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
