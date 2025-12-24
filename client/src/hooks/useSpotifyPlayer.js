import { useState, useEffect, useCallback, useRef } from 'react';
import { getAccessToken } from '@/lib/spotifyService';

/**
 * Spotify Web Playback SDK Hook
 * Enables playing Spotify music directly in the browser
 */
export function useSpotifyPlayer() {
    const [player, setPlayer] = useState(null);
    const [deviceId, setDeviceId] = useState(null);
    const [isReady, setIsReady] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTrack, setCurrentTrack] = useState(null);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [lastTimestamp, setLastTimestamp] = useState(0);
    const [volume, setVolume] = useState(0.5);
    const [error, setError] = useState(null);

    const playerRef = useRef(null);
    const positionInterval = useRef(null);
    const isActiveDevice = useRef(false);

    // Initialize the Spotify Player
    useEffect(() => {
        // Load Spotify SDK script
        if (!window.Spotify) {
            const script = document.createElement('script');
            script.src = 'https://sdk.scdn.co/spotify-player.js';
            script.async = true;
            document.body.appendChild(script);
        }

        window.onSpotifyWebPlaybackSDKReady = async () => {
            const token = await getAccessToken();
            if (!token) {
                setError('No Spotify token available');
                return;
            }

            const spotifyPlayer = new window.Spotify.Player({
                name: 'RanTunes Web Player',
                getOAuthToken: async cb => {
                    const freshToken = await getAccessToken();
                    cb(freshToken);
                },
                volume: volume,
            });

            // Error handling
            spotifyPlayer.addListener('initialization_error', ({ message }) => {
                console.error('Spotify init error:', message);
                setError(message);
            });

            spotifyPlayer.addListener('authentication_error', ({ message }) => {
                console.error('Spotify auth error:', message);
                setError(message);
            });

            spotifyPlayer.addListener('account_error', ({ message }) => {
                console.error('Spotify account error:', message);
                setError('Premium account required for playback');
            });

            spotifyPlayer.addListener('playback_error', ({ message }) => {
                console.error('Spotify playback error:', message);
            });

            // Playback status updates
            spotifyPlayer.addListener('player_state_changed', state => {
                if (!state) {
                    isActiveDevice.current = false;
                    return;
                }

                isActiveDevice.current = true;
                setCurrentTrack(state.track_window.current_track);
                setIsPlaying(!state.paused);

                setPosition(state.position);
                setLastTimestamp(Date.now());
                setDuration(state.duration);
            });

            // Ready
            spotifyPlayer.addListener('ready', ({ device_id }) => {
                console.log('🎵 RanTunes Player ready with Device ID:', device_id);
                setDeviceId(device_id);
                setIsReady(true);
                isActiveDevice.current = false;
            });

            // Not Ready
            spotifyPlayer.addListener('not_ready', ({ device_id }) => {
                console.log('Device ID has gone offline', device_id);
                setIsReady(false);
            });

            // Connect to the player
            const success = await spotifyPlayer.connect();
            if (success) {
                console.log('🎵 Connected to Spotify!');
                playerRef.current = spotifyPlayer;
                setPlayer(spotifyPlayer);
            }
        };

        // If SDK already loaded
        if (window.Spotify) {
            window.onSpotifyWebPlaybackSDKReady();
        }

        return () => {
            if (playerRef.current) {
                playerRef.current.disconnect();
            }
            if (positionInterval.current) {
                clearInterval(positionInterval.current);
            }
        };
    }, []);

    // Update position more smoothly when playing
    useEffect(() => {
        if (isPlaying && !error) {
            positionInterval.current = setInterval(() => {
                setPosition(prev => {
                    const next = prev + 500;
                    return (duration > 0 && next > duration) ? duration : next;
                });
            }, 500);
        }

        return () => {
            if (positionInterval.current) clearInterval(positionInterval.current);
        };
    }, [isPlaying, duration, error]);

    // Helper to check if this device is active
    const checkIsActive = async () => {
        if (!playerRef.current) return false;
        const state = await playerRef.current.getCurrentState();
        return !!state;
    };

    // Play a specific track
    const play = useCallback(async (spotifyUri, positionMs = 0) => {
        if (!deviceId) {
            setError('No device available');
            return;
        }

        const token = await getAccessToken();
        if (!token) return;

        try {
            const isActive = await checkIsActive();

            if (!isActive) {
                console.log('🎵 Device not active, transferring playback...', deviceId);
                await fetch('https://api.spotify.com/v1/me/player', {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        device_ids: [deviceId],
                        play: false,
                    }),
                });
                await new Promise(resolve => setTimeout(resolve, 1500));
            }

            const body = { uris: [spotifyUri], position_ms: positionMs };
            await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });
        } catch (err) {
            console.error('Spotify Play error:', err);
        }
    }, [deviceId]);

    return {
        player,
        deviceId,
        isReady,
        isPlaying,
        currentTrack,
        position,
        duration,
        volume,
        error,
        play,
        togglePlay: () => player?.togglePlay(),
        pause: () => player?.pause(),
        resume: () => player?.resume(),
        nextTrack: () => player?.nextTrack(),
        previousTrack: () => player?.previousTrack(),
        seek: (ms) => player?.seek(ms),
        setVolume: (v) => { if (player) { player.setVolume(v); setVolume(v); } },
    };
}

export default useSpotifyPlayer;
