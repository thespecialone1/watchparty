import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MonitorPlay, Users, Shield, Zap } from 'lucide-react';

export function Home() {
    const navigate = useNavigate();

    const features = [
        {
            icon: MonitorPlay,
            title: 'Screen Sharing',
            description: 'Share your screen in 1080p at 30fps with your friends',
        },
        {
            icon: Users,
            title: 'Watch Together',
            description: 'Invite up to 10 friends to watch together in real-time',
        },
        {
            icon: Shield,
            title: 'Password Protected',
            description: 'Keep your sessions private with secure password protection',
        },
        {
            icon: Zap,
            title: 'Low Latency',
            description: 'Experience real-time streaming with minimal delay',
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-dark flex flex-col">
            {/* Hero section */}
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="max-w-4xl mx-auto text-center space-y-8">
                    <div className="space-y-4 fade-in">
                        <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-purple-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                            WatchParty
                        </h1>
                        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
                            Share your screen and watch together with friends in real-time.
                            Create a private session and start streaming instantly.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center fade-in">
                        <Button
                            size="lg"
                            className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-lg px-8"
                            onClick={() => navigate('/create')}
                        >
                            Create Session
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            className="text-lg px-8"
                            onClick={() => navigate('/join')}
                        >
                            Join Session
                        </Button>
                    </div>

                    {/* Features grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-8">
                        {features.map((feature, index) => (
                            <Card
                                key={feature.title}
                                className="glass-card text-left fade-in"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-primary/10">
                                            <feature.icon className="h-5 w-5 text-primary" />
                                        </div>
                                        <CardTitle className="text-lg">{feature.title}</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <CardDescription className="text-base">
                                        {feature.description}
                                    </CardDescription>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="py-4 text-center text-sm text-muted-foreground">
                <p>Built with React, WebRTC, and ❤️</p>
            </footer>
        </div>
    );
}
