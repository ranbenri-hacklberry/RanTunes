import React, { useState, useEffect } from 'react';
import { useMusic } from '@/context/MusicContext';
import { motion, AnimatePresence } from 'framer-motion';
import VinylTurntable from '@/components/VinylTurntable';

const MobileMiniPlayer = ({ onExpand }) => {
    const {
        currentSong,
        isPlaying,
        togglePlay,
    } = useMusic();

    if (!currentSong) return null;

    return (
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed bottom-[72px] left-0 right-0 z-40 px-4 pb-2 flex justify-center"
        >
            <div
                className="scale-75 origin-bottom relative cursor-pointer"
                onClick={onExpand}
            >
                <VinylTurntable
                    song={currentSong}
                    isPlaying={isPlaying}
                    onTogglePlay={(e) => {
                        // stopPropagation handled if needed, but VinylTurntable handles toggle natively or via an event
                        // Since we want the click to expand, we can let VinylTurntable be purely visual here or intercept clicks
                    }}
                />

                {/* Visual overlay to catch clicks for expansion rather than toggling inside the mini player */}
                <div className="absolute inset-0 z-50 rounded-full" />
            </div>

        </motion.div>
    );
};

export default MobileMiniPlayer;
