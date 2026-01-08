import React from 'react';
import { motion } from 'framer-motion';
import { ThumbsUp, Play, Pause } from 'lucide-react';

/**
 * @typedef {Object} SongInfoCarouselProps
 * @property {Array} playlist - List of songs
 * @property {number} viewIndex - Current visible index
 * @property {Object} viewedSong - Current song object
 * @property {boolean} isViewedSongPlaying - Is the viewed song currently playing
 * @property {(e: any, info: any) => void} onDragEnd - Drag end handler
 * @property {(e: any) => void} onLike - Like button handler
 * @property {(e: any) => void} onPlayPause - Play/Pause button handler
 * @property {boolean} isPlaying - Global playing state
 */

/**
 * Draggable carousel showing song details (Art + Text + Actions)
 * @param {SongInfoCarouselProps} props
 */
const SongInfoCarousel = ({
    playlist,
    viewIndex,
    viewedSong,
    isViewedSongPlaying,
    onDragEnd,
    onLike,
    onPlayPause,
    isPlaying
}) => {
    // Ensure we have something to show
    const displaySong = viewedSong || (playlist && playlist[0]);
    if (!displaySong) return null;

    return (
        <div className="w-full max-w-[400px] mx-auto shrink-0 relative mb-4">
            {/* Visual cues for Swipe */}
            <div className="absolute inset-y-0 -left-4 w-4 bg-gradient-to-r from-black/20 to-transparent z-20 pointer-events-none"></div>
            <div className="absolute inset-y-0 -right-4 w-4 bg-gradient-to-l from-black/20 to-transparent z-20 pointer-events-none"></div>

            <div className="h-[80px] relative overflow-hidden">
                <motion.div
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.2}
                    onDragEnd={onDragEnd}
                    className="absolute inset-0 flex items-center justify-between cursor-grab active:cursor-grabbing bg-white/5 rounded-xl border border-white/10 p-3 shadow-lg backdrop-blur-sm"
                    key={viewIndex}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                        {/* Album Art Icon */}
                        <img
                            src={viewedSong?.album?.cover_url || viewedSong?.album?.images?.[0]?.url}
                            className="w-12 h-12 rounded-md object-cover shadow-md bg-black/20 shrink-0"
                            alt=""
                        />

                        {/* Text Info */}
                        <div className="flex flex-col overflow-hidden">
                            <span className={`text-sm font-bold truncate leading-tight ${!isViewedSongPlaying ? 'text-white/60' : 'text-white'}`}>
                                {viewedSong?.title || 'Unknown Title'}
                            </span>
                            <span className="text-xs text-white/40 truncate">
                                {viewedSong?.artist?.name || 'Unknown Artist'}
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pl-3 border-l border-white/5 ml-2">
                        {/* Like Heart */}
                        <button
                            onClick={onLike}
                            className={`p-2 rounded-full transition-colors hover:bg-white/10 ${viewedSong?.myRating === 5 ? 'text-green-500' : 'text-white/30'}`}
                            aria-label={viewedSong?.myRating === 5 ? "Unlike song" : "Like song"}
                        >
                            <ThumbsUp size={20} fill={viewedSong?.myRating === 5 ? 'currentColor' : 'none'} />
                        </button>

                        {/* Mini Play Button Actions */}
                        {/* NOTE: We might not need this if we have big controls below, but keeping for carousel context if browsing other songs */}
                        {!isViewedSongPlaying ? (
                            <button
                                onClick={onPlayPause}
                                className="p-2 text-green-500 hover:text-green-400 hover:bg-white/10 rounded-full"
                                aria-label={`Play ${viewedSong?.title}`}
                            >
                                <Play size={20} fill="currentColor" className="ml-0.5" />
                            </button>
                        ) : (
                            <div className="w-9 h-9 flex items-center justify-center">
                                {/* Visual indicator that this is the active song */}
                                <div className="flex gap-0.5 items-end h-3">
                                    <div className="w-0.5 bg-green-500 animate-[music-bar_0.5s_ease-in-out_infinite] h-full" style={{ animationDelay: '0s' }}></div>
                                    <div className="w-0.5 bg-green-500 animate-[music-bar_0.5s_ease-in-out_infinite] h-2/3" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-0.5 bg-green-500 animate-[music-bar_0.5s_ease-in-out_infinite] h-1/2" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default SongInfoCarousel;
