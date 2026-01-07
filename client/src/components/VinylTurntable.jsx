import React, { useMemo, useState, useEffect } from 'react';
import { Music } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MUSIC_API_URL = import.meta.env.VITE_MUSIC_API_URL ||
    import.meta.env.VITE_MANAGER_API_URL?.replace(/\/$/, '') ||
    'http://localhost:8080';

const getCoverUrl = (localPath) => {
    if (!localPath) return null;
    if (localPath.startsWith('http')) return localPath;
    return `${MUSIC_API_URL}/music/cover?path=${encodeURIComponent(localPath)}`;
};

/**
 * Premium Vinyl Turntable with orchestrated transitions
 * @param {Object} props
 * @param {Object} props.song - Current song object
 * @param {boolean} props.isPlaying - Global playing state
 * @param {string} props.albumArt - URL or local path to album art
 * @param {string} props.transitionPhase - 'playing' | 'fading_out' | 'buffering' | 'starting' | 'stopped'
 */
const VinylTurntable = ({ song, isPlaying, albumArt, transitionPhase = 'playing', hideInfo = false }) => {
    const coverUrl = useMemo(() => getCoverUrl(albumArt), [albumArt]);

    // Determine rotation speed and arm position based on phase
    const isRotating = useMemo(() => {
        if (transitionPhase === 'stopped') return false;
        if (transitionPhase === 'buffering') return false;
        // Keep rotating during fading_out but stop if explicitly stopped or buffering
        return isPlaying || transitionPhase === 'fading_out' || transitionPhase === 'starting';
    }, [isPlaying, transitionPhase]);

    const rotationSpeed = 1.7647; // Precisely 34 RPM (60 / 34)

    const armPosition = useMemo(() => {
        if (transitionPhase === 'buffering' || transitionPhase === 'stopped') return 0; // At rest
        if (transitionPhase === 'fading_out') return 12; // Moving back
        if (transitionPhase === 'starting') return 20; // Landing
        if (isPlaying || transitionPhase === 'playing') return 28; // Playing
        return 0;
    }, [isPlaying, transitionPhase]);

    return (
        <div className="vinyl-container" dir="ltr">
            <div className="vinyl-base">
                {/* Platter */}
                <div className="vinyl-platter-ring">
                    {/* Vinyl disc - Using CSS for infinite rotation to avoid Framer Motion reset jumps */}
                    <div
                        className={`vinyl-disc music-vinyl-spin ${!isRotating ? 'paused' : ''}`}
                        style={{
                            '--rotation-speed': `${rotationSpeed}s`
                        }}
                    >
                        {/* Grooves */}
                        {[90, 75, 60, 50].map(size => (
                            <div key={size} className="vinyl-groove" style={{ width: `${size}%`, height: `${size}%` }}></div>
                        ))}

                        {/* Center label with Animated Presence for cover change */}
                        <div className="vinyl-center-label">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={coverUrl || 'no-art'}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.1 }}
                                    transition={{ duration: 0.4 }}
                                    className="w-full h-full"
                                >
                                    {coverUrl ? (
                                        <img src={coverUrl} alt="Album" className="vinyl-album-art" />
                                    ) : (
                                        <div className="vinyl-no-art">
                                            <Music className="w-6 h-6 text-white/50" />
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                            <div className="vinyl-spindle-hole"></div>
                        </div>

                        {/* Shine effect */}
                        <div className="vinyl-reflection"></div>
                    </div>
                </div>

                {/* Tonearm with smooth motion */}
                <motion.div
                    className="vinyl-arm"
                    animate={{ rotate: armPosition }}
                    transition={{
                        type: "spring",
                        stiffness: 40,
                        damping: 12,
                        mass: 1.5
                    }}
                >
                    <div className="vinyl-arm-pivot"></div>
                    <div className="vinyl-arm-stick">
                        <div className="vinyl-arm-head"></div>
                    </div>
                </motion.div>

                <div className="vinyl-armrest"></div>
                <div className={`vinyl-led ${isRotating ? 'vinyl-led-on' : ''}`}></div>
            </div>

            {song && !hideInfo && (
                <div className="vinyl-info">
                    <motion.p
                        key={song.id + '-title'}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="vinyl-title"
                    >
                        {song.title}
                    </motion.p>
                    <motion.p
                        key={song.id + '-artist'}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.6 }}
                        className="vinyl-artist"
                    >
                        {song.artist?.name || song.album?.name || ''}
                    </motion.p>
                </div>
            )}
        </div>
    );
};

export default VinylTurntable;
