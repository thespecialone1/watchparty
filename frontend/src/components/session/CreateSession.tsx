import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useSessionStore } from '@/store/sessionStore';
import { Eye, EyeOff, Copy, Check, Loader2, ArrowLeft, MonitorPlay } from 'lucide-react';

export function CreateSession() {
    const navigate = useNavigate();
    const setSession = useSessionStore((state) => state.setSession);

    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [adminCode, setAdminCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleCreate = async () => {
        // Validation
        if (!name.trim()) {
            toast.error('Please enter a session name');
            return;
        }
        if (name.length < 3 || name.length > 50) {
            toast.error('Session name must be between 3 and 50 characters');
            return;
        }
        if (!password) {
            toast.error('Please enter a password');
            return;
        }
        if (password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            const response = await api.createSession({
                name: name.trim(),
                password,
                admin_code: adminCode.trim()
            });

            // Store session data
            setSession(response.id, response.name, response.token, true, response.ice_servers);
            setShareUrl(response.share_url);

            toast.success('Session created successfully!');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create session';
            toast.error(errorMessage);
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = async () => {
        if (!shareUrl) return;

        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            toast.success('Link copied to clipboard!');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Failed to copy link');
        }
    };

    const handleStartSession = () => {
        const sessionId = localStorage.getItem('session_id');
        if (sessionId) {
            navigate(`/watch/${sessionId}`);
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
                            <MonitorPlay className="w-5 h-5 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-xl font-semibold text-foreground">
                        Create Watch Party
                    </CardTitle>
                    <CardDescription>
                        Start a new session and invite your friends
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!shareUrl ? (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="name">Session Name</Label>
                                <Input
                                    id="name"
                                    placeholder="Movie Night"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    maxLength={50}
                                    disabled={loading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Enter a secure password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={loading}
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
                                <p className="text-xs text-muted-foreground">
                                    Minimum 6 characters
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="adminCode">Admin Code (Optional)</Label>
                                <Input
                                    id="adminCode"
                                    type="password"
                                    placeholder="Required if restricted"
                                    value={adminCode}
                                    onChange={(e) => setAdminCode(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                            <Button
                                onClick={handleCreate}
                                disabled={loading}
                                className="w-full"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create Session'
                                )}
                            </Button>
                        </>
                    ) : (
                        <div className="space-y-4 fade-in">
                            <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                                <p className="text-sm text-primary font-medium">
                                    ✓ Session created successfully!
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>Share Link</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={shareUrl}
                                        readOnly
                                        className="font-mono text-sm"
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={handleCopyLink}
                                    >
                                        {copied ? (
                                            <Check className="h-4 w-4 text-primary" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Share this link with your friends to join
                                </p>
                            </div>

                            <Button
                                onClick={handleStartSession}
                                className="w-full"
                            >
                                Start Watching
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
