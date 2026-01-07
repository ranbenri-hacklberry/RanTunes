import React, { useEffect, useState } from 'react';
import { Play, Pause, SkipForward, SkipBack } from 'lucide-react';

const AnalogAmplifier = ({ isPlaying, realAmplitude, trackFeatures }) => {
    const [leftNeedle, setLeftNeedle] = useState(-45);
    const [rightNeedle, setRightNeedle] = useState(-45);

    useEffect(() => {
        let frameId;
        let lastUpdate = Date.now();

        const updateNeedles = () => {
            if (!isPlaying) {
                setLeftNeedle(-45);
                setRightNeedle(-45);
                frameId = requestAnimationFrame(updateNeedles);
                return;
            }

            const now = Date.now();
            if (now - lastUpdate < 40) { // Limit to ~25fps for mobile battery
                frameId = requestAnimationFrame(updateNeedles);
                return;
            }
            lastUpdate = now;

            let level = -45;

            if (realAmplitude !== null && realAmplitude !== undefined) {
                const normalized = realAmplitude / 255;
                const boosted = Math.min(1, normalized * 1.5);
                level = -45 + (boosted * 50);
            } else if (trackFeatures) {
                const { tempo, energy, danceability } = trackFeatures;
                // Safety check: tempo must be > 0 to avoid division by zero
                if (tempo && tempo > 0 && energy !== undefined) {
                    const beatInterval = 60000 / tempo;
                    const timeInBeat = now % beatInterval;
                    const isOnBeat = timeInBeat < 100;
                    const baseLevel = -30 + (energy * 20);
                    const kickStrength = isOnBeat ? (danceability * 15) : 0;
                    const jitter = (Math.random() - 0.5) * (energy * 10);
                    level = Math.min(5, baseLevel + kickStrength + jitter);
                } else {
                    level = -20 + (Math.random() * 10);
                }
            } else {
                const base = -20 + (Math.random() * 15);
                const beat = (now % 1000) < 200 ? 10 : 0;
                const jitter = (Math.random() - 0.5) * 5;
                level = Math.min(5, base + beat + jitter);
            }

            setLeftNeedle(prev => prev + (level - prev) * 0.3);
            setRightNeedle(prev => prev + (level - prev + (Math.random() * 4 - 2)) * 0.3);

            frameId = requestAnimationFrame(updateNeedles);
        };

        frameId = requestAnimationFrame(updateNeedles);
        return () => cancelAnimationFrame(frameId);
    }, [isPlaying, realAmplitude, trackFeatures]);

    return (
        <div className="analog-amp-container mx-auto relative cursor-default select-none">
            {/* Valid HTML/CSS structure matching music.css */}
            <div className="amp-face relative flex justify-between px-4 py-3 gap-6">
                {/* Screws */}
                <div className="amp-screw tl"></div>
                <div className="amp-screw tr"></div>
                <div className="amp-screw bl"></div>
                <div className="amp-screw br"></div>

                {/* Left VU Meter - Wider */}
                <div className="flex-1">
                    <VUMeter rotation={leftNeedle} label="LEFT CHANNEL" />
                </div>

                {/* Right VU Meter - Wider */}
                <div className="flex-1">
                    <VUMeter rotation={rightNeedle} label="RIGHT CHANNEL" />
                </div>

                {/* Center Badge (Absolute) */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none opacity-80">
                    <span className="text-[5px] font-bold text-black/70 tracking-widest mb-0.5">STEREO</span>
                    <div className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-red-500 shadow-[0_0_6px_rgba(255,0,0,1)]' : 'bg-red-900'}`}></div>
                </div>
            </div>
        </div>
    );
};

const VUMeter = ({ rotation, label }) => {
    return (
        <div className="vu-meter-window">
            <div className="vu-label">{label}</div>

            {/* Scale Graphics (SVG) */}
            <svg className="absolute bottom-0 left-0 w-full h-full" viewBox="0 0 100 60" preserveAspectRatio="none">
                {/* Arc */}
                <path d="M 10 50 Q 50 10 90 50" fill="none" stroke="#333" strokeWidth="1" strokeDasharray="2,2" />

                {/* Ticks - simplified */}
                <line x1="20" y1="45" x2="22" y2="42" stroke="#333" strokeWidth="1" /> {/* -20 */}
                <line x1="35" y1="35" x2="37" y2="33" stroke="#333" strokeWidth="1" /> {/* -10 */}
                <line x1="50" y1="30" x2="50" y2="27" stroke="#333" strokeWidth="1" /> {/* -5 */}
                <line x1="70" y1="35" x2="68" y2="33" stroke="#333" strokeWidth="1" /> {/* 0 */}
                <line x1="85" y1="45" x2="83" y2="42" stroke="#d00" strokeWidth="2" /> {/* +3 */}

                {/* Text values */}
                <text x="20" y="55" fontSize="6" fill="#333" textAnchor="middle">-20</text>
                <text x="50" y="25" fontSize="6" fill="#333" textAnchor="middle">-5</text>
                <text x="70" y="30" fontSize="6" fill="#333" textAnchor="middle">0</text>
                <text x="85" y="55" fontSize="6" fill="#d00" textAnchor="middle">+3</text>
            </svg>

            {/* Needle */}
            <div
                className="vu-needle"
                style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
            ></div>
            <div className="vu-pivot"></div>
        </div>
    );
};

export default AnalogAmplifier;
