import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useSessionStore } from '@/store/sessionStore';
import { Crown, Users } from 'lucide-react';

export function ParticipantsList() {
    const { participants, isHost } = useSessionStore();

    const participantArray = Array.from(participants.values());

    return (
        <Card className="glass-card h-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Participants
                    <Badge variant="secondary" className="ml-auto">
                        {participantArray.length}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[200px] px-4">
                    <div className="space-y-2">
                        {participantArray.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No other participants yet
                            </p>
                        ) : (
                            participantArray.map((participant) => (
                                <div
                                    key={participant.id}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                                >
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                            {participant.username.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                            {participant.username}
                                        </p>
                                    </div>
                                    {participant.id === participants.keys().next().value && (
                                        <Crown className="h-4 w-4 text-yellow-400" />
                                    )}
                                </div>
                            ))
                        )}

                        {/* Self indicator */}
                        <div className="flex items-center gap-3 p-2 rounded-lg bg-primary/10 border border-primary/20">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                    {isHost ? 'H' : 'Y'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                    You {isHost && '(Host)'}
                                </p>
                            </div>
                            {isHost && <Crown className="h-4 w-4 text-yellow-400" />}
                        </div>
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
