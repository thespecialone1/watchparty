import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Signal, SignalHigh, SignalLow, SignalMedium } from 'lucide-react';
import { QualityMetrics } from '@/types/webrtc';

interface ConnectionQualityProps {
    metrics: QualityMetrics;
}

export function ConnectionQuality({ metrics }: ConnectionQualityProps) {
    const getQuality = () => {
        const { packetLoss, rtt } = metrics;

        if (packetLoss > 0.05 || rtt > 200) {
            return {
                level: 'Poor',
                icon: SignalLow,
                variant: 'destructive' as const,
                color: 'text-red-400'
            };
        }
        if (packetLoss > 0.02 || rtt > 100) {
            return {
                level: 'Fair',
                icon: SignalMedium,
                variant: 'warning' as const,
                color: 'text-yellow-400'
            };
        }
        if (rtt > 0) {
            return {
                level: 'Excellent',
                icon: SignalHigh,
                variant: 'success' as const,
                color: 'text-green-400'
            };
        }
        return {
            level: 'Connecting',
            icon: Signal,
            variant: 'secondary' as const,
            color: 'text-muted-foreground'
        };
    };

    const quality = getQuality();
    const Icon = quality.icon;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Badge variant={quality.variant} className="gap-1 cursor-help">
                        <Icon className={`h-3 w-3 ${quality.color}`} />
                        {quality.level}
                    </Badge>
                </TooltipTrigger>
                <TooltipContent>
                    <div className="space-y-1 text-xs">
                        <p>RTT: {metrics.rtt.toFixed(0)}ms</p>
                        <p>Packet Loss: {(metrics.packetLoss * 100).toFixed(1)}%</p>
                        <p>Bandwidth: {(metrics.bandwidth / 1000).toFixed(1)} Mbps</p>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
