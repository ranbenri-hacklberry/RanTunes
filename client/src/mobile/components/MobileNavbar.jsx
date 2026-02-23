import React, { useMemo } from 'react';
import { Disc, ListMusic, Heart, Music, Play, Pause } from 'lucide-react';
import { isSystemRTL } from '@/lib/localeUtils';
import { useMusic } from '@/context/MusicContext';

const MobileNavbar = ({ activeTab, onTabChange }) => {
    const rtl = useMemo(() => isSystemRTL(), []);
    const { isPlaying, togglePlay } = useMusic();

    const TABS = useMemo(() => [
        { id: 'albums', label: rtl ? 'אלבומים' : 'Albums', icon: Disc },
        { id: 'songs', label: rtl ? 'שירים' : 'Songs', icon: Music },
        { id: 'playlists', label: rtl ? 'פלייליסטים' : 'Playlists', icon: ListMusic },
        { id: 'favorites', label: rtl ? 'מועדפים' : 'Favorites', icon: Heart },
    ], [rtl]);

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a] border-t border-white/10 safe-area-bottom">
            <div className="flex items-center justify-around h-16 px-2">
                {TABS.map((tab, idx) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;

                    return (
                        <React.Fragment key={tab.id}>
                            <button
                                onClick={() => onTabChange(tab.id)}
                                className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all
                                    ${isActive
                                        ? 'text-purple-400'
                                        : 'text-white/40 hover:text-white/60'
                                    }`}
                            >
                                <Icon size={20} />
                                <span className={`text-[10px] mt-1 font-medium ${isActive ? 'text-purple-400' : 'text-white/40'}`}>
                                    {tab.label}
                                </span>
                            </button>

                            {/* Insert Play button exactly in the middle (after 2nd tab) */}
                            {idx === 1 && (
                                <div className="px-2 flex items-center justify-center">
                                    <button
                                        onClick={togglePlay}
                                        className="flex items-center justify-center -mt-6 w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all hover:scale-105 active:scale-95 text-white"
                                    >
                                        {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                                    </button>
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </nav>
    );
};

export default MobileNavbar;
