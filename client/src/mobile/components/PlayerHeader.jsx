import React from 'react';
import { ChevronDown, Monitor, Settings } from 'lucide-react';

/**
 * @typedef {Object} PlayerHeaderProps
 * @property {() => void} onClose - Function to close the player
 * @property {boolean} isRemoteMode - Whether the player is in remote mode
 * @property {string} remoteDeviceName - Name of the remote device
 * @property {boolean} isSpotifyTrack - Whether the current track is from Spotify
 * @property {string} nowPlayingLabel - Localized label for "Now Playing"
 * @property {() => void} onDevicePickerClick - Handler for device picker button
 */

/**
 * Header component for the mobile player
 * @param {PlayerHeaderProps} props
 */
const PlayerHeader = ({
    onClose,
    isRemoteMode,
    remoteDeviceName,
    isSpotifyTrack,
    nowPlayingLabel,
    onDevicePickerClick
}) => {
    return (
        <div className="flex items-center justify-between p-4 pt-4 shrink-0 z-30 bg-gradient-to-b from-black/40 to-transparent">
            <button
                onClick={onClose}
                className="p-2 -ml-2 text-white/80 hover:text-white transition-colors"
                aria-label="Close player"
            >
                <ChevronDown size={32} />
            </button>

            <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/30 mb-1">
                    {nowPlayingLabel}
                </span>
                <div className="flex items-center gap-2">
                    {isSpotifyTrack && (
                        <div className="flex items-center gap-1.5 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-[10px] font-bold text-green-400 uppercase tracking-tight">
                                {isRemoteMode ? `Remote: ${remoteDeviceName || 'Spotify'}` : 'Spotify'}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-1">
                {isSpotifyTrack && (
                    <button
                        onClick={onDevicePickerClick}
                        className="p-2 text-green-400 hover:text-green-300 transition-colors"
                        aria-label="Select playback device"
                    >
                        <Monitor size={22} />
                    </button>
                )}
                <button
                    className="p-2 text-white/80 hover:text-white transition-colors"
                    aria-label="Settings"
                >
                    <Settings size={22} />
                </button>
            </div>
        </div>
    );
};

export default PlayerHeader;
