import React, { useEffect, useState } from 'react';

const AnalogAmplifier = ({ isPlaying }) => {
    const [leftNeedle, setLeftNeedle] = useState(-45);
    const [rightNeedle, setRightNeedle] = useState(-45);

    useEffect(() => {
        let interval;
        if (isPlaying) {
            interval = setInterval(() => {
                // Simulate audio levels
                // Base movement + random jitter
                // Range: -45 (min) to +20 (max), 0 is 0dB
                // Most music hovers around -20 to +5

                const simulateLevel = () => {
                    const base = Math.random() * 30 - 25; // Random between -25 and +5
                    // Occasional peak
                    const drift = Math.random() > 0.8 ? 10 : 0;
                    return base + drift;
                };

                setLeftNeedle(simulateLevel());
                // Right channel slightly different for realism
                setRightNeedle(simulateLevel() + (Math.random() * 4 - 2));
            }, 100);
        } else {
            setLeftNeedle(-45);
            setRightNeedle(-45);
        }

        return () => clearInterval(interval);
    }, [isPlaying]);

    return (
        <div className="analog-amp-container mx-auto">
            {/* Valid HTML/CSS structure matching music.css */}
            <div className="amp-face relative">
                {/* Screws */}
                <div className="amp-screw tl"></div>
                <div className="amp-screw tr"></div>
                <div className="amp-screw bl"></div>
                <div className="amp-screw br"></div>

                {/* Left VU Meter */}
                <VUMeter rotation={leftNeedle} label="LEFT" />

                {/* Right VU Meter */}
                <VUMeter rotation={rightNeedle} label="RIGHT" />

                {/* Center Badge / Logo Area */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                    <span className="text-[6px] font-bold text-black/70 tracking-widest">STEREO</span>
                    <div className={`w-1 h-1 rounded-full mt-1 ${isPlaying ? 'bg-red-500 shadow-[0_0_5px_rgba(255,0,0,0.8)]' : 'bg-red-900'}`}></div>
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
