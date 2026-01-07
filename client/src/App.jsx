import React from 'react';
import { useRanTunesAuth } from './context/RanTunesAuthContext';
import AuthScreen from './pages/AuthScreen';
import MusicPage from './pages/index.jsx';

// Check env vars directly to avoid hoisting issues
const supabaseConfigMissing = !import.meta.env?.VITE_SUPABASE_URL || !import.meta.env?.VITE_SUPABASE_ANON_KEY;

/**
 * Error Boundary Component to catch runtime crashes
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error('RanTunes Crash:', error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center" dir="rtl">
                    <div className="max-w-md w-full bg-slate-800 rounded-3xl p-8 border border-red-500/30">
                        <h1 className="text-white text-2xl font-bold mb-4">אופס, משהו השתבש</h1>
                        <p className="text-slate-400 mb-6">האפליקציה נתקלה בשגיאה לא צפויה.</p>
                        <pre className="bg-black/50 p-4 rounded-xl text-red-400 text-xs text-left overflow-auto mb-6 max-h-40 font-mono">
                            {this.state.error?.toString()}
                        </pre>
                        <div className="flex gap-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-500 transition-colors"
                            >
                                נסה טעינה מחדש
                            </button>
                            <button
                                onClick={() => {
                                    localStorage.clear();
                                    sessionStorage.clear();
                                    window.location.href = '/';
                                }}
                                className="px-6 py-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl font-bold hover:bg-red-500/20 transition-colors"
                            >
                                התנתק ואפס
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

/**
 * App Component - Routes between Auth and Music based on authentication state
 */
const App = () => {
    const { isAuthenticated, isLoading } = useRanTunesAuth();

    // Show friendly error if Supabase not configured
    if (supabaseConfigMissing) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6" dir="rtl">
                <div className="max-w-md w-full bg-slate-800/80 rounded-3xl p-8 border border-red-500/30 shadow-2xl text-center">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                        <span className="text-3xl">⚠️</span>
                    </div>
                    <h1 className="text-white text-2xl font-black mb-4">שגיאת הגדרות</h1>
                    <p className="text-slate-400 mb-6 leading-relaxed">
                        משתני הסביבה של Supabase חסרים.<br />
                        יש להוסיף את המשתנים הבאים ב-Vercel:
                    </p>
                    <div className="bg-slate-900/80 rounded-xl p-4 text-left font-mono text-sm text-slate-300 mb-6">
                        <div className="text-red-400">VITE_SUPABASE_URL</div>
                        <div className="text-red-400">VITE_SUPABASE_ANON_KEY</div>
                    </div>
                    <p className="text-slate-500 text-sm">
                        לאחר הוספת המשתנים, יש לבצע Redeploy
                    </p>
                </div>
            </div>
        );
    }

    // Show loading spinner while checking auth
    const [showRetry, setShowRetry] = React.useState(false);

    React.useEffect(() => {
        if (isLoading) {
            const timer = setTimeout(() => setShowRetry(true), 10000);
            return () => clearTimeout(timer);
        } else {
            setShowRetry(false);
        }
    }, [isLoading]);

    if (isLoading) {
        return (
            <div className="min-h-screen music-gradient-dark flex flex-col items-center justify-center p-6 text-center">
                <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-6" />
                {showRetry && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <p className="text-white/60 mb-4 font-medium">הטעינה לוקחת קצת זמן...</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-full text-sm font-bold transition-all shadow-lg hover:shadow-purple-500/25"
                        >
                            רענן דף
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // Show auth screen if not authenticated
    if (!isAuthenticated) {
        return <ErrorBoundary><AuthScreen /></ErrorBoundary>;
    }

    // Music App with Mobile Routing
    return (
        <ErrorBoundary>
            <React.Suspense fallback={<div className="min-h-screen bg-black" />}>
                <MobileRouterWrapper />
            </React.Suspense>
        </ErrorBoundary>
    );
};

// Internal wrapper to handle routing logic cleanly
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import MobileLayout from './mobile/MobileLayout';
import SpotifyService from './lib/spotifyService';

const MobileRouterWrapper = () => {
    const [isVerifying, setIsVerifying] = React.useState(true);
    const location = useLocation();

    // Global session verification on load
    React.useEffect(() => {
        const verifySession = async () => {
            // Skip verification if on a callback page
            if (location.pathname.includes('/callback')) {
                setIsVerifying(false);
                return;
            }

            // Skip if already in the middle of OAuth
            if (sessionStorage.getItem('spotify_code_verifier')) {
                setIsVerifying(false);
                return;
            }

            // Only verify if we're supposed to be using Spotify
            const musicSource = localStorage.getItem('music_source');
            if (musicSource !== 'spotify' && !SpotifyService.isSpotifyLoggedIn()) {
                setIsVerifying(false);
                return;
            }

            try {
                console.log('🎵 [App] Verifying Spotify session...');

                // Real API check
                await SpotifyService.getCurrentUser();

                console.log('✅ [App] Spotify session verified');
                setIsVerifying(false);
            } catch (err) {
                console.warn('❌ [App] Spotify session invalid, redirecting to login:', err.message);
                SpotifyService.loginWithSpotify();
            }
        };

        verifySession();
    }, [location.pathname]);

    if (isVerifying) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center space-y-6">
                <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white tracking-widest uppercase opacity-50">RanTunes</h1>
                    <p className="text-white/30 text-xs mt-2 font-mono">Verifying Session...</p>
                </div>
            </div>
        );
    }

    return <AppRoutes />;
};

const AppRoutes = () => {
    const isMobileWidth = window.innerWidth < 768;

    return (
        <Routes>
            {/* Mobile Route - MobileLayout handles all tabs internally */}
            <Route path="/mobile/*" element={<MobileLayout />} />

            {/* Desktop / Default Route */}
            <Route path="/*" element={
                isMobileWidth ? <Navigate to="/mobile" replace /> : <MusicPage />
            } />
        </Routes>
    );
};

export default App;
