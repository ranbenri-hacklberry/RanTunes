import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Download, Music, ArrowRight, HardDrive, CheckCircle,
    AlertCircle, Loader, Youtube, X, ExternalLink,
    Clock, Disc, Wifi, WifiOff
} from 'lucide-react';
import { MUSIC_API_URL } from '@/constants/music';

const formatDuration = (seconds) => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const isValidYouTubeUrl = (url) =>
    /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]+/.test(url);

const DownloadPage = () => {
    const navigate = useNavigate();

    const [url, setUrl] = useState('');
    const [format, setFormat] = useState('mp3');
    const [videoInfo, setVideoInfo] = useState(null);
    const [infoLoading, setInfoLoading] = useState(false);
    const [infoError, setInfoError] = useState(null);
    const [diskStatus, setDiskStatus] = useState(null);
    const [downloading, setDownloading] = useState(false);
    const [downloadResult, setDownloadResult] = useState(null);
    const [downloadError, setDownloadError] = useState(null);
    const [history, setHistory] = useState(() => {
        try { return JSON.parse(localStorage.getItem('rantunes_download_history') || '[]'); }
        catch { return []; }
    });

    // Fetch disk status on mount
    useEffect(() => {
        fetch(`${MUSIC_API_URL}/music/disk-status`)
            .then(r => r.json())
            .then(setDiskStatus)
            .catch(() => setDiskStatus(null));
    }, []);

    // Fetch video info when URL changes (debounced)
    useEffect(() => {
        if (!isValidYouTubeUrl(url)) {
            setVideoInfo(null);
            setInfoError(null);
            return;
        }

        setInfoLoading(true);
        setInfoError(null);
        setVideoInfo(null);
        setDownloadResult(null);
        setDownloadError(null);

        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`${MUSIC_API_URL}/download/info?url=${encodeURIComponent(url)}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'שגיאה בקריאת מידע');
                setVideoInfo(data);
            } catch (err) {
                setInfoError(err.message);
            } finally {
                setInfoLoading(false);
            }
        }, 800);

        return () => clearTimeout(timer);
    }, [url]);

    const handleDownload = useCallback(async () => {
        if (!url || !isValidYouTubeUrl(url)) return;

        setDownloading(true);
        setDownloadResult(null);
        setDownloadError(null);

        try {
            const res = await fetch(`${MUSIC_API_URL}/download/youtube`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, format, title: videoInfo?.title, artist: videoInfo?.artist })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'ההורדה נכשלה');

            setDownloadResult(data);

            // Save to history
            const entry = {
                id: Date.now(),
                title: videoInfo?.title || data.fileName || 'שיר',
                artist: videoInfo?.artist || '',
                thumbnail: videoInfo?.thumbnail,
                diskLabel: data.diskLabel,
                downloadedAt: new Date().toISOString()
            };
            const newHistory = [entry, ...history].slice(0, 20);
            setHistory(newHistory);
            localStorage.setItem('rantunes_download_history', JSON.stringify(newHistory));

            // Refresh disk status
            fetch(`${MUSIC_API_URL}/music/disk-status`)
                .then(r => r.json())
                .then(setDiskStatus)
                .catch(() => {});

        } catch (err) {
            setDownloadError(err.message);
        } finally {
            setDownloading(false);
        }
    }, [url, format, videoInfo, history]);

    const handleClear = () => {
        setUrl('');
        setVideoInfo(null);
        setInfoError(null);
        setDownloadResult(null);
        setDownloadError(null);
    };

    return (
        <div className="min-h-screen music-gradient-dark text-white" dir="rtl">
            {/* Header */}
            <header className="flex items-center gap-4 p-4 border-b border-white/10 bg-black/20 backdrop-blur-md sticky top-0 z-10">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-full music-glass flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                    <ArrowRight className="w-5 h-5 text-white" />
                </button>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center shadow-lg">
                        <Youtube className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-white font-bold text-lg leading-tight">הורדה מיוטיוב</h1>
                        <p className="text-white/40 text-xs">הורד מוזיקה ישירות לספריה</p>
                    </div>
                </div>

                {/* Disk Status Badge */}
                {diskStatus && (
                    <div className={`mr-auto flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                        diskStatus.externalDisk
                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                            : 'bg-white/5 border-white/10 text-white/50'
                    }`}>
                        {diskStatus.externalDisk
                            ? <HardDrive className="w-3.5 h-3.5" />
                            : <Disc className="w-3.5 h-3.5" />
                        }
                        <span>{diskStatus.label}</span>
                    </div>
                )}
            </header>

            <div className="max-w-2xl mx-auto p-4 space-y-4">

                {/* Disk Status Card */}
                {diskStatus && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex items-center gap-3 p-4 rounded-2xl border ${
                            diskStatus.externalDisk
                                ? 'bg-blue-500/10 border-blue-500/20'
                                : 'bg-white/5 border-white/10'
                        }`}
                    >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            diskStatus.externalDisk ? 'bg-blue-500/20' : 'bg-white/10'
                        }`}>
                            <HardDrive className={`w-5 h-5 ${diskStatus.externalDisk ? 'text-blue-400' : 'text-white/50'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-medium text-sm">
                                {diskStatus.externalDisk ? '💿 דיסק חיצוני מחובר' : '📁 שמירה מקומית'}
                            </p>
                            <p className="text-white/40 text-xs truncate font-mono">{diskStatus.activeDirectory}</p>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${diskStatus.externalDisk ? 'bg-blue-400 animate-pulse' : 'bg-white/20'}`} />
                    </motion.div>
                )}

                {/* URL Input */}
                <div className="space-y-2">
                    <label className="text-white/60 text-sm font-medium">קישור יוטיוב</label>
                    <div className="relative">
                        <Youtube className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-400" />
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="הדבק קישור יוטיוב כאן..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pr-10 pl-10 text-white placeholder-white/20 focus:outline-none focus:border-red-500/50 focus:bg-white/10 transition-all font-mono text-sm"
                            dir="ltr"
                        />
                        {url && (
                            <button
                                onClick={handleClear}
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                            >
                                <X className="w-3.5 h-3.5 text-white/60" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Format Selector */}
                <div className="space-y-2">
                    <label className="text-white/60 text-sm font-medium">פורמט</label>
                    <div className="flex gap-2">
                        {['mp3', 'm4a'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFormat(f)}
                                className={`flex-1 py-3 rounded-xl text-sm font-bold uppercase transition-all ${
                                    format === f
                                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                                        : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Video Info Preview */}
                <AnimatePresence mode="wait">
                    {infoLoading && (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10"
                        >
                            <Loader className="w-5 h-5 text-purple-400 animate-spin" />
                            <span className="text-white/60 text-sm">קורא מידע...</span>
                        </motion.div>
                    )}

                    {infoError && !infoLoading && (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="flex items-center gap-3 p-4 bg-red-500/10 rounded-2xl border border-red-500/20"
                        >
                            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                            <span className="text-red-300 text-sm">{infoError}</span>
                        </motion.div>
                    )}

                    {videoInfo && !infoLoading && (
                        <motion.div
                            key="info"
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/10"
                        >
                            {videoInfo.thumbnail && (
                                <img
                                    src={videoInfo.thumbnail}
                                    alt={videoInfo.title}
                                    className="w-20 h-20 object-cover rounded-xl shrink-0"
                                />
                            )}
                            <div className="flex-1 min-w-0">
                                <h3 className="text-white font-bold text-sm leading-tight mb-1 line-clamp-2">
                                    {videoInfo.title}
                                </h3>
                                <p className="text-white/50 text-xs mb-2">{videoInfo.channel}</p>
                                {videoInfo.duration && (
                                    <div className="flex items-center gap-1 text-white/30 text-xs">
                                        <Clock className="w-3 h-3" />
                                        <span>{formatDuration(videoInfo.duration)}</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Download Button */}
                <motion.button
                    onClick={handleDownload}
                    disabled={downloading || !isValidYouTubeUrl(url)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                        downloading || !isValidYouTubeUrl(url)
                            ? 'bg-white/10 text-white/30 cursor-not-allowed'
                            : 'bg-gradient-to-l from-purple-600 to-pink-600 text-white shadow-xl shadow-purple-500/20 hover:shadow-purple-500/40'
                    }`}
                >
                    {downloading ? (
                        <>
                            <Loader className="w-5 h-5 animate-spin" />
                            <span>מוריד...</span>
                        </>
                    ) : (
                        <>
                            <Download className="w-5 h-5" />
                            <span>הורד {format.toUpperCase()}</span>
                        </>
                    )}
                </motion.button>

                {/* Download Result */}
                <AnimatePresence>
                    {downloadResult && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="p-5 bg-green-500/10 rounded-2xl border border-green-500/20"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <CheckCircle className="w-6 h-6 text-green-400 shrink-0" />
                                <span className="text-green-300 font-bold">ההורדה הושלמה!</span>
                            </div>
                            {downloadResult.fileName && (
                                <p className="text-white/70 text-sm mb-1 font-mono truncate">
                                    📄 {downloadResult.fileName}
                                </p>
                            )}
                            <p className="text-white/40 text-xs flex items-center gap-1.5">
                                <HardDrive className="w-3.5 h-3.5" />
                                {downloadResult.diskLabel}
                            </p>
                        </motion.div>
                    )}

                    {downloadError && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="p-5 bg-red-500/10 rounded-2xl border border-red-500/20"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />
                                <span className="text-red-300 font-bold">ההורדה נכשלה</span>
                            </div>
                            <p className="text-red-300/70 text-sm">{downloadError}</p>
                            {downloadError.includes('yt-dlp') && (
                                <div className="mt-3 p-3 bg-black/20 rounded-xl">
                                    <p className="text-white/50 text-xs mb-1">להתקנה:</p>
                                    <code className="text-yellow-400 text-xs font-mono">brew install yt-dlp</code>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Download History */}
                {history.length > 0 && (
                    <div className="mt-6">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-white/60 text-sm font-bold uppercase tracking-wider">היסטוריה</h2>
                            <button
                                onClick={() => {
                                    setHistory([]);
                                    localStorage.removeItem('rantunes_download_history');
                                }}
                                className="text-white/30 text-xs hover:text-red-400 transition-colors"
                            >
                                נקה
                            </button>
                        </div>
                        <div className="space-y-2">
                            {history.map(entry => (
                                <div
                                    key={entry.id}
                                    className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 group"
                                >
                                    {entry.thumbnail ? (
                                        <img src={entry.thumbnail} alt={entry.title} className="w-12 h-12 object-cover rounded-lg shrink-0" />
                                    ) : (
                                        <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
                                            <Music className="w-5 h-5 text-white/30" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm font-medium truncate">{entry.title}</p>
                                        <p className="text-white/40 text-xs truncate">{entry.artist}</p>
                                    </div>
                                    <div className="text-white/20 text-xs text-left shrink-0">
                                        <HardDrive className="w-3.5 h-3.5 mb-0.5 ml-auto" />
                                        <span className="text-[10px]">{entry.diskLabel?.split(' ')[0]}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DownloadPage;
