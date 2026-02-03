import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useSessionStore } from '@/store/sessionStore';
import { Eye, EyeOff, Loader2, Users, ArrowLeft } from 'lucide-react';

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
        <div className="flex items-center justify-center min-h-screen bg-gradient-warm p-4 relative">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-subtle pointer-events-none" />

            {/* Back button */}
            <button
                onClick={() => navigate('/')}
                className="absolute top-6 left-6 z-10 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back
            </button>

            <Card className="w-full max-w-md relative z-10 fade-in">
                <CardHeader className="space-y-1">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-xl font-semibold text-foreground">
                        Join Watch Party
                    </CardTitle>
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
                        className="w-full"
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
                            onClick={() => navigate('/create')}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            Or create a new session
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
