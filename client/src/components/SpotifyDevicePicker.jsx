import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Smartphone, Laptop, Speaker, X, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useMusic } from '@/context/MusicContext';

const SpotifyDevicePicker = ({ onClose }) => {
    const { spotifyDevices, fetchSpotifyDevices, transferPlayback, transitionPhase } = useMusic();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        refreshDevices();
    }, []);

    const refreshDevices = async () => {
        setIsLoading(true);
        await fetchSpotifyDevices();
        setIsLoading(false);
    };

    const getDeviceIcon = (device) => {
        const type = device.type?.toLowerCase() || '';
        const name = device.name?.toLowerCase() || '';

        if (name.includes('mobile')) return Smartphone;
        if (name.includes('desktop')) return Laptop;

        switch (type) {
            case 'smartphone': return Smartphone;
            case 'computer': return Laptop;
            case 'speaker': return Speaker;
            default: return Monitor;
        }
    };

    const handleTransfer = async (deviceId) => {
        const ok = await transferPlayback(deviceId);
        if (ok) {
            // Wait a bit for Spotify to update
            setTimeout(() => onClose(), 800);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={onClose}
        >
            <div
                className="w-full max-w-sm music-glass-dark border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-green-500/10 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" className="w-6 h-6 text-black fill-current"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" /></svg>
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg">Spotify Connect</h3>
                            <p className="text-white/40 text-xs">בחר מכשיר להשמעה</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-white/60" />
                    </button>
                </div>

                {/* Device List */}
                <div className="p-4 max-h-[400px] overflow-y-auto music-scrollbar">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <RefreshCw className="w-8 h-8 text-green-500 animate-spin" />
                            <p className="text-white/40 text-sm">מחפש מכשירים...</p>
                        </div>
                    ) : spotifyDevices.length > 0 ? (
                        <div className="space-y-2">
                            {spotifyDevices.map(device => {
                                const Icon = getDeviceIcon(device);
                                return (
                                    <button
                                        key={device.id}
                                        onClick={() => handleTransfer(device.id)}
                                        className={`w-full p-4 rounded-2xl flex items-center justify-between group transition-all
                                            ${device.is_active
                                                ? 'bg-green-500/20 border border-green-500/30'
                                                : 'hover:bg-white/5 border border-transparent'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors
                                                ${device.is_active ? 'bg-green-500 text-black' : 'bg-white/5 text-white/60 group-hover:text-white'}`}>
                                                <Icon className="w-6 h-6" />
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-bold ${device.is_active ? 'text-green-400' : 'text-white'}`}>
                                                    {device.name}
                                                </p>
                                                <p className="text-white/40 text-xs">{device.type}</p>
                                            </div>
                                        </div>
                                        {device.is_active && (
                                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Monitor className="w-12 h-12 text-white/10 mx-auto mb-4" />
                            <p className="text-white/60 font-medium">לא נמצאו מכשירים פעילים</p>
                            <p className="text-white/30 text-sm mt-2 px-6">
                                פתח את אפליקציית Spotify במכשיר אחר כדי שהוא יופיע כאן
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer / Refresh */}
                <div className="p-4 bg-white/5 flex justify-center">
                    <button
                        onClick={refreshDevices}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 text-white/60 hover:text-white transition-colors text-sm font-medium"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        רענן רשימה
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default SpotifyDevicePicker;
