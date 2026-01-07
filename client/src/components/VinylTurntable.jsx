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

    // Physics-based rotation state for high realism
    const [rotation, setRotation] = useState(0);
    const rotationRef = useRef(0);
    const lastTimeRef = useRef(0);
    const currentRpmRef = useRef(0);
    const targetRpmRef = useRef(0);

    // Sync target RPM with playback phase
    useEffect(() => {
        if (transitionPhase === 'stopped' || transitionPhase === 'buffering') {
            targetRpmRef.current = 0;
        } else if (transitionPhase === 'fading_out') {
            targetRpmRef.current = 10; // Slowing down to 'manual' speed
        } else if (isPlaying || transitionPhase === 'playing' || transitionPhase === 'starting') {
            targetRpmRef.current = 34; // Authentic 34 RPM as requested
        } else {
            targetRpmRef.current = 0;
        }
    }, [isPlaying, transitionPhase]);

    // Animation frame loop for smooth speed transitions (Torque Simulation)
    useEffect(() => {
        let frameId;
        const animate = (time) => {
            if (!lastTimeRef.current) lastTimeRef.current = time;
            const delta = (time - lastTimeRef.current) / 1000;
            lastTimeRef.current = time;

            // Apply 'torque' (lerp speed)
            const acceleration = targetRpmRef.current > currentRpmRef.current ? 0.04 : 0.02;
            currentRpmRef.current += (targetRpmRef.current - currentRpmRef.current) * acceleration;

            // Update cumulative rotation
            if (currentRpmRef.current > 0.1) {
                rotationRef.current += (currentRpmRef.current * 6) * delta; // 360deg / 60sec = 6deg/sec per RPM
                setRotation(rotationRef.current % 360);
            }

            frameId = requestAnimationFrame(animate);
        };
        frameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameId);
    }, []);

    const isEffectivelyRotating = currentRpmRef.current > 0.5;

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
                    {/* Vinyl disc - Using manual rotation for physics smoothing */}
                    <div
                        className="vinyl-disc"
                        style={{
                            transform: `rotate(${rotation}deg)`
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
                <div className={`vinyl-led ${isEffectivelyRotating ? 'vinyl-led-on' : ''}`}></div>
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
