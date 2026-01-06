import { useEffect, useRef, useState } from 'react';

/**
 * Hook to analyze audio frequency/amplitude from an HTML5 Audio element.
 * @param {React.MutableRefObject<HTMLAudioElement>} audioRef 
 * @param {boolean} isActive 
 * @returns {number | null} Current amplitude (0-255) or null if not available
 */
export const useAudioAnalyzer = (audioRef, isActive) => {
    const [amplitude, setAmplitude] = useState(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const sourceRef = useRef(null);
    const requestRef = useRef(null);

    useEffect(() => {
        if (!isActive || !audioRef.current) {
            setAmplitude(null);
            return;
        }

        const initAudio = () => {
            // Create context only once
            if (!audioContextRef.current) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                audioContextRef.current = new AudioContext();
            }

            // Resume context if suspended (browser policy)
            if (audioContextRef.current.state === 'suspended') {
                audioContextRef.current.resume();
            }

            const ctx = audioContextRef.current;

            // Create analyser
            if (!analyserRef.current) {
                analyserRef.current = ctx.createAnalyser();
                analyserRef.current.fftSize = 32; // Lowfft size for performance and simple amplitude
            }

            // Connect source
            if (!sourceRef.current) {
                try {
                    // Check if source already exists to avoid error
                    sourceRef.current = ctx.createMediaElementSource(audioRef.current);
                    sourceRef.current.connect(analyserRef.current);
                    analyserRef.current.connect(ctx.destination);
                } catch (e) {
                    console.warn("Audio Analysis Error (Expected if cross-origin blocked):", e);
                    // If we can't connect, we can't analyze.
                    // This happens with some CORS restricted streams.
                    setAmplitude(null);
                    return;
                }
            }

            // Animation Loop
            const update = () => {
                if (!analyserRef.current) return;

                const bufferLength = analyserRef.current.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                analyserRef.current.getByteFrequencyData(dataArray);

                // Calculate average amplitude
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                const average = sum / bufferLength;

                // Normalizing slightly to make it punchier
                setAmplitude(average);

                requestRef.current = requestAnimationFrame(update);
            };

            update();
        };

        // Initialize on user interaction (play usually triggers this hook via isActive)
        initAudio();

        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, [isActive, audioRef]);

    return amplitude;
};
