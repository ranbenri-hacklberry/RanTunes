import React from 'react';
import { ArrowRight } from 'lucide-react';
import SongRow from '@/components/SongRow';

const AlbumDetailView = ({
    selectedAlbum,
    currentAlbumSongs,
    onBack,
    currentSong,
    isPlaying,
    playSong,
    rateSong,
    songListRef
}) => {
    return (
        <div className="flex-1 flex flex-col min-h-0 bg-black/10">
            {/* Sticky Album Header */}
            <div className="shrink-0 p-4 pb-2 bg-gradient-to-b from-black/40 to-transparent backdrop-blur-sm border-b border-white/5">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="w-10 h-10 rounded-full music-glass flex items-center justify-center hover:bg-white/20 transition-colors">
                        <ArrowRight className="w-5 h-5 text-white" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-white text-2xl font-bold truncate">{selectedAlbum.name}</h2>
                        <p className="text-white/60">
                            {selectedAlbum.isPlaylist ? 'פלייליסט' : (selectedAlbum.artist?.name || 'אמן לא ידוע')}
                            • {currentAlbumSongs.length} שירים
                        </p>
                    </div>
                </div>
            </div>

            {/* Scrollable Songs List */}
            <div className="flex-1 overflow-y-auto music-scrollbar p-4 pt-2" ref={songListRef}>
                <div className="space-y-1">
                    {currentAlbumSongs.map((song, index) => (
                        <SongRow
                            key={song.id || index}
                            song={song}
                            index={index}
                            isCurrentSong={currentSong?.id === song.id}
                            isPlaying={isPlaying}
                            onPlay={() => playSong(song, currentAlbumSongs)}
                            onRate={rateSong}
                        />
                    ))}
                    {currentAlbumSongs.length === 0 && (
                        <div className="text-center py-12 text-white/30">
                            אין שירים באוסף זה
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AlbumDetailView;
