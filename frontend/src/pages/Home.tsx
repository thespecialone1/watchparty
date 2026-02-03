import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MonitorPlay, Users, Shield, Zap, ArrowRight } from 'lucide-react';

export function Home() {
    const navigate = useNavigate();

    const features = [
        {
            icon: MonitorPlay,
            title: 'Screen Sharing',
            description: 'Share your screen in high quality with your friends',
        },
        {
            icon: Users,
            title: 'Watch Together',
            description: 'Invite friends to watch together in real-time',
        },
        {
            icon: Shield,
            title: 'Private Sessions',
            description: 'Password protected rooms for your privacy',
        },
        {
            icon: Zap,
            title: 'Low Latency',
            description: 'Real-time streaming with minimal delay',
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-warm flex flex-col relative">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-subtle pointer-events-none" />

            {/* Header */}
            <header className="relative z-10 px-6 py-5 flex items-center justify-between max-w-6xl mx-auto w-full">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                        <MonitorPlay className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-semibold text-foreground">WatchParty</span>
                </div>
                <nav className="hidden md:flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/join')}
                    >
                        Join Session
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => navigate('/create')}
                    >
                        Create Session
                    </Button>
                </nav>
            </header>

            {/* Hero section */}
            <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
                <div className="max-w-3xl mx-auto text-center space-y-10">
                    {/* Main headline */}
                    <div className="space-y-5 fade-in">
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-semibold text-foreground tracking-tight leading-[1.1]">
                            Watch together,
                            <br />
                            <span className="text-muted-foreground">anywhere</span>
                        </h1>
                        <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
                            Share your screen and experience content together with friends in real-time. Simple, private, and instant.
                        </p>
                    </div>

                    {/* CTA buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center fade-in" style={{ animationDelay: '100ms' }}>
                        <Button
                            size="lg"
                            onClick={() => navigate('/create')}
                            className="group"
                        >
                            Start a Session
                            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            onClick={() => navigate('/join')}
                        >
                            Join with Code
                        </Button>
                    </div>

                    {/* Features grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 fade-in" style={{ animationDelay: '200ms' }}>
                        {features.map((feature) => (
                            <div
                                key={feature.title}
                                className="p-4 rounded-xl bg-card/40 border border-border/50 text-left transition-colors hover:bg-card/60"
                            >
                                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center mb-3">
                                    <feature.icon className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <h3 className="text-sm font-medium text-foreground mb-1">
                                    {feature.title}
                                </h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 py-6 text-center">
                <p className="text-xs text-muted-foreground/60">
                    Simple screen sharing for everyone
                </p>
            </footer>
        </div>
    );
}
