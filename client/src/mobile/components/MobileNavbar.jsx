import React from 'react';
import { Disc, ListMusic, User, Heart, Music } from 'lucide-react';

const TABS = [
    { id: 'albums', label: 'אלבומים', icon: Disc },
    { id: 'playlists', label: 'פלייליסטים', icon: ListMusic },
    { id: 'player', label: 'נגן', icon: Music, isCenter: true },
    { id: 'artists', label: 'אמנים', icon: User },
    { id: 'favorites', label: 'מועדפים', icon: Heart },
];

const MobileNavbar = ({ activeTab, onTabChange }) => {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a] border-t border-white/10 safe-area-bottom">
            <div className="flex items-center justify-around h-16">
                {TABS.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;

                    if (tab.isCenter) {
                        // Center button (Player) - larger and highlighted
                        return (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className={`flex flex-col items-center justify-center -mt-4 w-14 h-14 rounded-full 
                                    ${isActive
                                        ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30'
                                        : 'bg-white/10'
                                    } transition-all`}
                            >
                                <Icon size={24} className="text-white" />
                            </button>
                        );
                    }

                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all
                                ${isActive
                                    ? 'text-purple-400'
                                    : 'text-white/40'
                                }`}
                        >
                            <Icon size={20} />
                            <span className={`text-[10px] mt-1 font-medium ${isActive ? 'text-purple-400' : 'text-white/40'}`}>
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

export default MobileNavbar;
