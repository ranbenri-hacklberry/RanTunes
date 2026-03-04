import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useRanTunesAuth } from './context/RanTunesAuthContext';
import AuthScreen from './pages/AuthScreen';
import MusicPage from './pages/index.jsx';
import DownloadPage from './pages/DownloadPage.jsx';
import MobileLayout from './mobile/MobileLayout';

const supabaseConfigMissing = !import.meta.env?.VITE_SUPABASE_URL || !import.meta.env?.VITE_SUPABASE_ANON_KEY;

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

const App = () => {
    const { isAuthenticated, isLoading } = useRanTunesAuth();

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
                        יש להוסיף את המשתנים הבאים:
                    </p>
                    <div className="bg-slate-900/80 rounded-xl p-4 text-left font-mono text-sm text-slate-300 mb-6">
                        <div className="text-red-400">VITE_SUPABASE_URL</div>
                        <div className="text-red-400">VITE_SUPABASE_ANON_KEY</div>
                    </div>
                </div>
            </div>
        );
    }

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
                    <div>
                        <p className="text-white/60 mb-4 font-medium">הטעינה לוקחת קצת זמן...</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-full text-sm font-bold transition-all"
                        >
                            רענן דף
                        </button>
                    </div>
                )}
            </div>
        );
    }

    if (!isAuthenticated) {
        return <ErrorBoundary><AuthScreen /></ErrorBoundary>;
    }

    return (
        <ErrorBoundary>
            <React.Suspense fallback={<div className="min-h-screen bg-black" />}>
                <AppRoutes />
            </React.Suspense>
        </ErrorBoundary>
    );
};

const AppRoutes = () => {
    const isMobileWidth = window.innerWidth < 768;

    return (
        <Routes>
            <Route path="/mobile/*" element={<MobileLayout />} />
            <Route path="/download" element={<DownloadPage />} />
            <Route path="/*" element={
                isMobileWidth ? <Navigate to="/mobile" replace /> : <MusicPage />
            } />
        </Routes>
    );
};

export default App;
