import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import MobileNavbar from './components/MobileNavbar';
// import MobileMiniPlayer from './components/MobileMiniPlayer'; // To be implemented
// import MobileFullPlayer from './components/MobileFullPlayer'; // To be implemented

const MobileLayout = () => {
    // This will host the Full Player state later
    const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);

    return (
        <div className="flex flex-col h-screen bg-[#000000] text-white overflow-hidden" dir="rtl">
            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto pb-32 no-scrollbar">
                <Outlet />
            </div>

            {/* Mobile Mini Player will go here */}
            <MobileMiniPlayer onExpand={() => setIsFullPlayerOpen(true)} />

            {/* Bottom Navigation */}
            <MobileNavbar />

            {/* Full Player Overlay */}
            <AnimatePresence>
                {isFullPlayerOpen && (
                    <MobileFullPlayer onClose={() => setIsFullPlayerOpen(false)} />
                )}
            </AnimatePresence>
        </div>
    );
};

import { AnimatePresence } from 'framer-motion';
import MobileMiniPlayer from './components/MobileMiniPlayer';
import MobileFullPlayer from './components/MobileFullPlayer';

export default MobileLayout;
