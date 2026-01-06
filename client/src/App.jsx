import React, { Suspense, lazy } from 'react';
import { useRanTunesAuth } from './context/RanTunesAuthContext';
import AuthScreen from './pages/AuthScreen';

// Lazy load MusicPage for better performance
const MusicPage = lazy(() => import('./pages/index.jsx'));

// Check env vars directly to avoid hoisting issues
const supabaseConfigMissing = !import.meta.env?.VITE_SUPABASE_URL || !import.meta.env?.VITE_SUPABASE_ANON_KEY;

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
        return <AuthScreen />;
    }

    // Show music player if authenticated
    return (
        <Suspense fallback={
            <div className="min-h-screen music-gradient-dark flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
            </div>
        }>
            <MusicPage />
        </Suspense>
    );
};

export default App;
