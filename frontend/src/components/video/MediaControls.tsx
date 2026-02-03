import { cn } from '@/lib/utils';
import {
    Mic,
    MicOff,
    Video,
    VideoOff,
    MonitorUp,
    MonitorOff,
    MessageSquare,
    LogOut,
    Settings,
} from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface MediaControlsProps {
    // Audio/Video state
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
    onToggleAudio: () => void;
    onToggleVideo: () => void;

    // Screen share state
    isScreenSharing?: boolean;
    onToggleScreenShare?: () => void;
    canScreenShare?: boolean;

    // Chat panel
    isChatOpen?: boolean;
    onToggleChat?: () => void;
    unreadCount?: number;

    // Leave
    onLeave: () => void;

    // Optional settings
    onOpenSettings?: () => void;

    className?: string;
}

interface ControlButtonProps {
    icon: React.ReactNode;
    activeIcon?: React.ReactNode;
    label: string;
    isActive?: boolean;
    isDestructive?: boolean;
    onClick: () => void;
    badge?: number;
    disabled?: boolean;
}

function ControlButton({
    icon,
    activeIcon,
    label,
    isActive = true,
    isDestructive = false,
    onClick,
    badge,
    disabled = false,
}: ControlButtonProps) {
    return (
        <TooltipProvider delayDuration={300}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={onClick}
                        disabled={disabled}
                        className={cn(
                            'relative w-12 h-12 rounded-full flex items-center justify-center',
                            'transition-all duration-200 ease-out',
                            'focus:outline-none focus:ring-2 focus:ring-purple-500/50',
                            disabled && 'opacity-50 cursor-not-allowed',
                            isDestructive
                                ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25'
                                : isActive
                                    ? 'bg-slate-700/80 hover:bg-slate-600/80 text-white shadow-lg shadow-black/20'
                                    : 'bg-red-500/90 hover:bg-red-600 text-white shadow-lg shadow-red-500/25'
                        )}
                    >
                        {isActive ? icon : (activeIcon || icon)}

                        {/* Badge for unread count */}
                        {badge !== undefined && badge > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-purple-500 text-white text-xs font-bold flex items-center justify-center">
                                {badge > 9 ? '9+' : badge}
                            </span>
                        )}
                    </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-slate-800 text-white border-slate-700">
                    {label}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

export function MediaControls({
    isAudioEnabled,
    isVideoEnabled,
    onToggleAudio,
    onToggleVideo,
    isScreenSharing = false,
    onToggleScreenShare,
    canScreenShare = true,
    isChatOpen = true,
    onToggleChat,
    unreadCount = 0,
    onLeave,
    onOpenSettings,
    className,
}: MediaControlsProps) {
    return (
        <div
            className={cn(
                'flex items-center gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-4 rounded-full',
                'bg-gradient-to-r from-[#1a1a2e]/95 to-[#2a2a40]/95 backdrop-blur-2xl',
                'border border-white/10 shadow-2xl shadow-purple-900/20',
                className
            )}
        >
            {/* Audio toggle */}
            <ControlButton
                icon={<Mic className="w-5 h-5" />}
                activeIcon={<MicOff className="w-5 h-5" />}
                label={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
                isActive={isAudioEnabled}
                onClick={onToggleAudio}
            />

            {/* Video toggle */}
            <ControlButton
                icon={<Video className="w-5 h-5" />}
                activeIcon={<VideoOff className="w-5 h-5" />}
                label={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                isActive={isVideoEnabled}
                onClick={onToggleVideo}
            />

            {/* Screen share */}
            {onToggleScreenShare && canScreenShare && (
                <ControlButton
                    icon={isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />}
                    label={isScreenSharing ? 'Stop sharing' : 'Share screen'}
                    isActive={!isScreenSharing}
                    onClick={onToggleScreenShare}
                />
            )}

            {/* Divider */}
            <div className="w-px h-8 bg-white/10 mx-1" />

            {/* Chat toggle */}
            {onToggleChat && (
                <ControlButton
                    icon={<MessageSquare className="w-5 h-5" />}
                    label={isChatOpen ? 'Close chat' : 'Open chat'}
                    isActive={true}
                    onClick={onToggleChat}
                    badge={!isChatOpen ? unreadCount : undefined}
                />
            )}

            {/* Settings */}
            {onOpenSettings && (
                <ControlButton
                    icon={<Settings className="w-5 h-5" />}
                    label="Settings"
                    isActive={true}
                    onClick={onOpenSettings}
                />
            )}

            {/* Leave button */}
            <ControlButton
                icon={<LogOut className="w-5 h-5" />}
                label="Leave session"
                isDestructive={true}
                onClick={onLeave}
            />
        </div>
    );
}
