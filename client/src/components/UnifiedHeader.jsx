import React, { useState, useEffect } from 'react';
import { Home, Speaker, Tablet } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import MiniMusicPlayer from './MiniMusicPlayer';
import { useRanTunes } from '../context/RanTunesContext';
import { useRanTunesAuth } from '../context/RanTunesAuthContext';

const UnifiedHeader = ({
    title: propTitle,
    subtitle: propSubtitle,
    hideTitle = false,
    onHome,
    children, // Left side components (in RTL)
    rightContent, // Next to Home button (in RTL)
    headerTabs, // Standardized tab array: [{ id, label, icon: <Icon/>, onClick, isActive, colorClass (optional active color) }]
    leftTabContent, // Custom elements rendered left of the tabs
    className = '',
    forceMusicDark = false,
    showMusicPlayer = true
}) => {
    const navigate = useNavigate();
    const { user: authUser } = useRanTunesAuth();
    const { playbackTarget, setPlaybackTarget } = useRanTunes();
    const location = useLocation();
    const [time, setTime] = useState(new Date());

    const isStandalone = true;
    const currentUser = isStandalone ? {
        id: '0f043e57-ce9a-4843-b661-83088299da26',
        name: 'Ran Ben-Ri',
        role: 'admin',
        access_level: 'admin',
        is_admin: true,
        business_id: 'standalone',
        business_name: 'RanTunes'
    } : authUser;

    const isMusicPage = location.pathname.startsWith('/music') || location.hash.startsWith('#/music') || isStandalone;

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Fallback logic for title/subtitle
    const title = propTitle || currentUser?.business_name || currentUser?.businessName || currentUser?.impersonating_business_name || 'icaffeOS';
    const subtitle = propSubtitle || (currentUser?.is_impersonating ? `מצב התחזות: ${currentUser.name}` : '');

    const handleHome = () => {
        if (onHome) onHome();
        else navigate('/mode-selection');
    };

    const isLTR = false;
    const isDarkMode = true;

    // Standalone & Music page styling override
    const useDarkMusicTheme = true;

    const headerBg = 'bg-black/30 border-white/10 text-white backdrop-blur-xl';

    const titleColor = 'text-white';
    const subtitleColor = 'text-white/40';
    const clockColor = 'text-white';

    const buttonBg = 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:text-white';

    return (
        <header className={`${headerBg} backdrop-blur-2xl border-b px-4 md:px-6 h-[50px] md:h-[65px] z-50 shrink-0 sticky top-0 flex items-center ${className}`}>
            <div className={`flex items-center justify-between w-full h-full ${isLTR ? 'flex-row' : 'flex-row-reverse'}`}>

                {/* START (Home button side) */}
                <div className={`flex items-center gap-4 flex-1 min-w-0 ${isLTR ? 'flex-row' : 'flex-row-reverse'}`}>
                    <button
                        onClick={handleHome}
                        className={`shrink-0 w-9 h-9 md:w-10 md:h-10 flex items-center justify-center border rounded-2xl transition-all active:scale-95 shadow-sm ${buttonBg}`}
                        title={isLTR ? "Back to Home" : "חזרה למסך ראשי"}
                    >
                        <Home size={18} strokeWidth={2.5} />
                    </button>

                    {!useDarkMusicTheme && isStandalone && (
                        <div className="flex flex-col mx-2 shrink-0 select-none items-start">
                            <span className="text-white font-black tracking-wider text-base leading-none">RanTunes</span>
                            <span className="text-purple-400/60 text-[9px] font-extrabold uppercase tracking-widest mt-1">Standalone</span>
                        </div>
                    )}



                    {!useDarkMusicTheme && rightContent && (
                        <div className={`flex items-center gap-3 shrink-0 ${isLTR ? 'flex-row' : 'flex-row-reverse'}`}>
                            {rightContent}
                        </div>
                    )}

                    {!useDarkMusicTheme && headerTabs && headerTabs.length > 0 && (
                        <div className={`flex items-center gap-2 shrink-0 ${isLTR ? 'ml-auto' : 'mr-auto'}`}>
                            <div className="flex bg-slate-100/80 p-0.5 rounded-xl md:rounded-2xl gap-0.5 border border-slate-200 shadow-inner h-9 md:h-10 overflow-hidden items-center">
                                {headerTabs.map(tab => {
                                    const activeColor = tab.colorClass || 'text-blue-600';
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={tab.onClick}
                                            className={`px-3 md:px-4 rounded-lg md:rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 md:gap-2 transition-all h-full justify-center min-w-max outline-none focus:outline-none ${tab.isActive
                                                ? `bg-white shadow-sm ring-1 ring-slate-900/5 ${activeColor}`
                                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                                }`}
                                        >
                                            {tab.icon}
                                            {tab.label && <span className="mt-[1px]">{tab.label}</span>}
                                        </button>
                                    );
                                })}
                            </div>
                            {leftTabContent}
                        </div>
                    )}
                </div>

                {/* CENTER: CLOCK & CONNECTION STATUS — hidden on mobile */}
                <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 justify-center items-center gap-3">
                    <span className={`text-[22px] font-black tracking-tighter tabular-nums leading-none ${clockColor}`}>
                        {time.toLocaleTimeString(isLTR ? 'en-US' : 'he-IL', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>

                {/* END (Tools side) — hidden on mobile */}
                <div className={`hidden md:flex items-center gap-3 justify-end flex-1 min-w-0 ${isLTR ? 'flex-row' : 'flex-row-reverse'}`}>
                    {showMusicPlayer && (
                        <MiniMusicPlayer forceDark={forceMusicDark} className="shrink-0" />
                    )}

                    {!useDarkMusicTheme && children && (
                        <div className={`flex items-center gap-2 ${isLTR ? 'flex-row' : 'flex-row-reverse'}`}>
                            {showMusicPlayer && (
                                <div className={`hidden lg:block shrink-0 w-px h-6 mx-2 ${forceMusicDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                            )}
                            {children}
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default UnifiedHeader;
