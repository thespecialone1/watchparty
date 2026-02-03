import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, MessageSquare } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { ChatMessage as ChatMessageType } from '@/types/message';
import { cn } from '@/lib/utils';

interface ChatPanelProps {
    onSendMessage: (message: string) => void;
    userId: string;
}

function ChatMessage({ message, isOwn }: { message: ChatMessageType; isOwn: boolean }) {
    const time = new Date(message.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <div className={cn('flex gap-2', isOwn && 'flex-row-reverse')}>
            <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                    {message.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
            </Avatar>
            <div className={cn('max-w-[80%]', isOwn && 'text-right')}>
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-muted-foreground">
                        {isOwn ? 'You' : message.username}
                    </span>
                    <span className="text-xs text-muted-foreground">{time}</span>
                </div>
                <div
                    className={cn(
                        'px-3 py-2 rounded-lg text-sm',
                        isOwn
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground'
                    )}
                >
                    {message.message}
                </div>
            </div>
        </div>
    );
}

export function ChatPanel({ onSendMessage, userId }: ChatPanelProps) {
    const [message, setMessage] = useState('');
    const messages = useChatStore((state) => state.messages);
    const resetUnreadCount = useChatStore((state) => state.resetUnreadCount);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Reset unread count when panel opens
    useEffect(() => {
        resetUnreadCount();
    }, [resetUnreadCount]);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = () => {
        if (message.trim()) {
            onSendMessage(message.trim());
            setMessage('');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <Card className="glass-card h-full flex flex-col">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Chat
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0 min-h-0">
                <ScrollArea className="flex-1 px-4" ref={scrollRef}>
                    <div className="space-y-4 py-2">
                        {messages.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">
                                No messages yet. Start the conversation!
                            </p>
                        ) : (
                            messages.map((msg) => (
                                <ChatMessage
                                    key={msg.id}
                                    message={msg}
                                    isOwn={msg.userId === userId}
                                />
                            ))
                        )}
                    </div>
                </ScrollArea>
                <div className="p-4 border-t flex gap-2">
                    <Input
                        placeholder="Type a message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="flex-1"
                    />
                    <Button onClick={handleSend} size="icon" disabled={!message.trim()}>
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
