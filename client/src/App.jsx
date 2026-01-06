import React from 'react';
import { useRanTunesAuth } from './context/RanTunesAuthContext';
import AuthScreen from './pages/AuthScreen';
import MusicPage from './pages/index.jsx';

/**
 * App Component - Routes between Auth and Music based on authentication state
 */
const App = () => {
    const { isAuthenticated, isLoading } = useRanTunesAuth();

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
