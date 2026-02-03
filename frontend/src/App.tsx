import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Home } from '@/pages/Home';
import { CreateSession } from '@/components/session/CreateSession';
import { JoinSession } from '@/components/session/JoinSession';
import { WatchRoom } from '@/pages/WatchRoom';

function App() {
    return (
        <TooltipProvider>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/create" element={<CreateSession />} />
                <Route path="/join" element={<JoinSession />} />
                <Route path="/join/:sessionId" element={<JoinSession />} />
                <Route path="/watch/:sessionId" element={<WatchRoom />} />
            </Routes>
            <Toaster
                position="top-right"
                richColors
                theme="dark"
                toastOptions={{
                    className: 'glass-card',
                }}
            />
        </TooltipProvider>
    );
}

export default App;
