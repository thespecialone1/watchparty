import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useSessionStore } from '@/store/sessionStore';
import { Eye, EyeOff, Loader2, Users } from 'lucide-react';

export function JoinSession() {
    const navigate = useNavigate();
    const { sessionId: paramSessionId } = useParams<{ sessionId: string }>();
    const { setSession, sessionId: currentSessionId, isHost } = useSessionStore();

    // If already host of this session, redirect to watch room
    if (isHost && currentSessionId === paramSessionId) {
        navigate(`/watch/${paramSessionId}`);
        return null;
    }

    const [sessionId, setSessionId] = useState(paramSessionId || '');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleJoin = async () => {
        if (!sessionId.trim()) {
            toast.error('Please enter a session ID');
            return;
        }
        if (!password) {
            toast.error('Please enter the password');
            return;
        }

        setLoading(true);
        try {
            const response = await api.joinSession({
                session_id: sessionId.trim(),
                password
            });

            // Store session data
            setSession(response.id, response.name, response.token, false);

            toast.success('Joined session successfully!');
            navigate(`/watch/${response.id}`);
        } catch (error: unknown) {
            // Handle specific error types
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
                if (axiosError.response?.status === 404) {
                    toast.error('Session not found or has expired');
                } else if (axiosError.response?.status === 401) {
                    toast.error('Invalid password');
                } else if (axiosError.response?.status === 403) {
                    toast.error('Session is full');
                } else {
                    toast.error(axiosError.response?.data?.message || 'Failed to join session');
                }
            } else {
                toast.error('Failed to join session');
            }
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !loading) {
            handleJoin();
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-dark p-4">
            <Card className="w-full max-w-md glass-card fade-in">
                <CardHeader className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Users className="h-6 w-6 text-purple-400" />
                        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
                            Join Watch Party
                        </CardTitle>
                    </div>
                    <CardDescription>
                        Enter the session details to join your friends
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="sessionId">Session ID</Label>
                        <Input
                            id="sessionId"
                            placeholder="Enter session ID"
                            value={sessionId}
                            onChange={(e) => setSessionId(e.target.value)}
                            disabled={loading || !!paramSessionId}
                            onKeyPress={handleKeyPress}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter session password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                onKeyPress={handleKeyPress}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={loading}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                            </Button>
                        </div>
                    </div>
                    <Button
                        onClick={handleJoin}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Joining...
                            </>
                        ) : (
                            'Join Session'
                        )}
                    </Button>

                    <div className="text-center">
                        <Button
                            variant="link"
                            onClick={() => navigate('/')}
                            className="text-muted-foreground hover:text-purple-400"
                        >
                            Or create a new session
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
