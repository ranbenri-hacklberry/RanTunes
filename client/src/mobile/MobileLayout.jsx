import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import MobileNavbar from './components/MobileNavbar';
import MobileMiniPlayer from './components/MobileMiniPlayer';
import MobileFullPlayer from './components/MobileFullPlayer';
import MobileAlbums from './pages/MobileAlbums';
import MobilePlaylists from './pages/MobilePlaylists';
import MobileArtists from './pages/MobileArtists';
import MobileFavorites from './pages/MobileFavorites';
import { useMusic } from '@/context/MusicContext';
import { getSystemDirection } from '@/lib/localeUtils';

const MobileLayout = () => {
    const [activeTab, setActiveTab] = useState('albums');
    const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
    const { currentSong } = useMusic();

    // Get direction based on system language
    const direction = useMemo(() => getSystemDirection(), []);

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
        </div>
    );
};

export default MobileLayout;
