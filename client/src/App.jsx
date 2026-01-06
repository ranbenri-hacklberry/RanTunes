import React from 'react';
import { useRanTunesAuth } from './context/RanTunesAuthContext';
import AuthScreen from './pages/AuthScreen';
import MusicPage from './pages/index.jsx';
import { supabaseConfigMissing } from './lib/supabase';

/**
 * App Component - Routes between Auth and Music based on authentication state
 */
const App = () => {
    const { isAuthenticated, isLoading } = useRanTunesAuth();

    // Show configuration error if Supabase is not set up
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
    if (isLoading) {
        return (
            <div className="min-h-screen music-gradient-dark flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
            </div>
        );
    }

    // Show auth screen if not authenticated
    if (!isAuthenticated) {
        return <AuthScreen />;
    }

    // Show music player if authenticated
    return <MusicPage />;
};

export default App;
