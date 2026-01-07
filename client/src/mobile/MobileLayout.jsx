import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Settings, LogOut, X } from 'lucide-react';
import MobileNavbar from './components/MobileNavbar';
import MobileMiniPlayer from './components/MobileMiniPlayer';
import MobileFullPlayer from './components/MobileFullPlayer';
import MobileAlbums from './pages/MobileAlbums';
import MobilePlaylists from './pages/MobilePlaylists';
import MobileArtists from './pages/MobileArtists';
import MobileFavorites from './pages/MobileFavorites';
import { useMusic } from '@/context/MusicContext';
import { useRanTunesAuth } from '@/context/RanTunesAuthContext';
import { getSystemDirection, isSystemRTL } from '@/lib/localeUtils';
import SpotifyService from '@/lib/spotifyService';

const MobileLayout = () => {
    const [activeTab, setActiveTab] = useState('albums');
    const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const { currentSong, stop } = useMusic();
    const { logout: authLogout } = useRanTunesAuth();

    // Get direction based on system language
    const direction = useMemo(() => getSystemDirection(), []);
    const rtl = useMemo(() => isSystemRTL(), []);

    // Auto-redirect to Spotify login if not connected
    useEffect(() => {
        // Skip if we're returning from OAuth callback
        if (window.location.pathname.includes('/callback')) return;

        // Check if already handling OAuth
        if (sessionStorage.getItem('spotify_code_verifier')) return;

        // If not connected to Spotify, redirect to login
        if (!SpotifyService.isSpotifyLoggedIn()) {
            console.log('🎵 [MobileLayout] Not connected to Spotify, redirecting to login...');
            SpotifyService.loginWithSpotify();
        }
    }, []);

    // When player tab is selected, open full player
    const handleTabChange = useCallback((tabId) => {
        if (tabId === 'player') {
            if (currentSong) {
                setIsFullPlayerOpen(true);
            }
            // Don't change activeTab to 'player' - keep the previous content tab
        } else {
            setActiveTab(tabId);
            setIsFullPlayerOpen(false);
        }
    }, [currentSong]);

    // Full logout - clears everything
    const handleFullLogout = useCallback(() => {
        // Stop any playing music
        stop?.();

        // Clear Spotify tokens
        SpotifyService.logout?.();
        localStorage.removeItem('spotify_access_token');
        localStorage.removeItem('spotify_refresh_token');
        localStorage.removeItem('spotify_token_expiry');

        // Clear RanTunes settings
        localStorage.removeItem('music_source');
        localStorage.removeItem('rantunes_user');
        localStorage.removeItem('rantunes_session');

        // Clear any other cached data
        sessionStorage.clear();

        // Auth logout (navigates to login)
        authLogout?.();

        // Force reload to ensure clean state
        window.location.href = '/';
    }, [stop, authLogout]);

    // Render content based on active tab
    const renderContent = () => {
        switch (activeTab) {
            case 'albums':
                return <MobileAlbums />;
            case 'playlists':
                return <MobilePlaylists />;
            case 'artists':
                return <MobileArtists />;
            case 'favorites':
                return <MobileFavorites />;
            default:
                return <MobileAlbums />;
        }
    };

    return (
        <div className="flex flex-col h-screen bg-[#000000] text-white overflow-hidden" dir={direction}>
            {/* Settings Button - Fixed Top Right/Left */}
            <button
                onClick={() => setShowSettings(true)}
                className="fixed top-4 left-4 z-50 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center active:scale-95 transition-transform"
                style={{ [rtl ? 'right' : 'left']: '16px', [rtl ? 'left' : 'right']: 'auto' }}
            >
                <Settings className="w-5 h-5 text-white/70" />
            </button>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto pb-36 no-scrollbar">
                {renderContent()}
            </div>

            {/* Mobile Mini Player */}
            <MobileMiniPlayer onExpand={() => setIsFullPlayerOpen(true)} />

            {/* Bottom Navigation */}
            <MobileNavbar
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />

            {/* Full Player Overlay */}
            <AnimatePresence>
                {isFullPlayerOpen && (
                    <MobileFullPlayer onClose={() => setIsFullPlayerOpen(false)} />
                )}
            </AnimatePresence>

            {/* Settings Modal */}
            <AnimatePresence>
                {showSettings && (
                    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
                        <div className="bg-[#1a1a1a] rounded-3xl w-full max-w-sm border border-white/10 overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-white/10">
                                <h2 className="text-lg font-bold text-white">
                                    {rtl ? 'הגדרות' : 'Settings'}
                                </h2>
                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
                                >
                                    <X className="w-4 h-4 text-white" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-4 space-y-3">
                                {/* Spotify Status */}
                                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                                    <svg viewBox="0 0 24 24" className="w-6 h-6 text-green-400 fill-current">
                                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                                    </svg>
                                    <div className="flex-1">
                                        <p className="text-white font-medium text-sm">Spotify</p>
                                        <p className="text-white/50 text-xs">
                                            {SpotifyService.isSpotifyLoggedIn()
                                                ? (rtl ? 'מחובר' : 'Connected')
                                                : (rtl ? 'לא מחובר' : 'Not connected')
                                            }
                                        </p>
                                    </div>
                                </div>

                                {/* Version */}
                                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                                    <span className="text-white/70 text-sm">{rtl ? 'גרסה' : 'Version'}</span>
                                    <span className="text-white/50 text-sm font-mono">1.2.5</span>
                                </div>

                                {/* Logout Button */}
                                <button
                                    onClick={handleFullLogout}
                                    className="w-full flex items-center justify-center gap-2 p-4 bg-red-500/20 text-red-400 rounded-xl font-medium active:scale-95 transition-transform"
                                >
                                    <LogOut className="w-5 h-5" />
                                    {rtl ? 'התנתק' : 'Logout'}
                                </button>

                                <p className="text-white/30 text-xs text-center pt-2">
                                    {rtl
                                        ? 'התנתקות תמחק את כל ההגדרות והטוקנים השמורים'
                                        : 'Logout will clear all saved settings and tokens'
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MobileLayout;
