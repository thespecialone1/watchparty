import { Play, Pause, RotateCcw, RotateCw, SkipBack, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PlaybackAction = 'play' | 'pause' | 'toggle' | 'seek_forward' | 'seek_backward';

interface PlaybackControlsProps {
    onControl: (action: PlaybackAction, seekSeconds?: number) => void;
    isPlaying?: boolean;
    disabled?: boolean;
    className?: string;
}

export function PlaybackControls({
    onControl,
    isPlaying = true,
    disabled = false,
    className,
}: PlaybackControlsProps) {
    const ControlButton = ({
        onClick,
        children,
        title,
        variant = 'default',
    }: {
        onClick: () => void;
        children: React.ReactNode;
        title: string;
        variant?: 'default' | 'primary';
    }) => (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={cn(
                'h-10 w-10 rounded-full flex items-center justify-center transition-all',
                'hover:scale-105 active:scale-95',
                disabled && 'opacity-50 cursor-not-allowed',
                variant === 'primary'
                    ? 'bg-white/20 hover:bg-white/30 text-white'
                    : 'bg-zinc-700/60 hover:bg-zinc-600/60 text-zinc-200'
            )}
        >
            {children}
        </button>
    );

    return (
        <div className={cn('flex items-center gap-2', className)}>
            {/* Seek -30s */}
            <ControlButton
                onClick={() => onControl('seek_backward', 30)}
                title="Seek -30s"
            >
                <SkipBack className="w-4 h-4" />
            </ControlButton>

            {/* Seek -10s */}
            <ControlButton
                onClick={() => onControl('seek_backward', 10)}
                title="Seek -10s"
            >
                <RotateCcw className="w-4 h-4" />
            </ControlButton>

            {/* Play/Pause toggle */}
            <ControlButton
                onClick={() => onControl('toggle')}
                title={isPlaying ? 'Pause' : 'Play'}
                variant="primary"
            >
                {isPlaying ? (
                    <Pause className="w-5 h-5" />
                ) : (
                    <Play className="w-5 h-5 ml-0.5" />
                )}
            </ControlButton>

            {/* Seek +10s */}
            <ControlButton
                onClick={() => onControl('seek_forward', 10)}
                title="Seek +10s"
            >
                <RotateCw className="w-4 h-4" />
            </ControlButton>

            {/* Seek +30s */}
            <ControlButton
                onClick={() => onControl('seek_forward', 30)}
                title="Seek +30s"
            >
                <SkipForward className="w-4 h-4" />
            </ControlButton>
        </div>
    );
}
