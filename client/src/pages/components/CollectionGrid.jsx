import React from 'react';
import { Search, ListMusic, User, Disc, Heart, HardDrive, Trash2, Pencil, RefreshCw, Play } from 'lucide-react';
import AlbumCard from '@/components/AlbumCard';

const CollectionGrid = ({
    activeTab,
    searchQuery,
    setSearchQuery,
    TABS,
    setActiveTab,
    musicSource,
    handleSelectMusicSource,
    isSpotifyConnected,
    handleSpotifyLogin,
    filteredAlbums,
    onSelectAlbum,
    onPlayAlbum,
    onPlayPlaylist,
    filteredArtists,
    filteredPlaylists,
    favoriteSongs,
    editMode,
    setEditMode,
    handleDeletePlaylist,
    setShowPlaylistBuilder,
    setShowSpotifySearch,
    setShowSpotifyPlaylistSearch,
    setShowScanner
}) => {
    return (
        <div className="flex-1 flex flex-col min-w-0">
            {/* Top Bar with Search and Tabs */}
            <div className="p-6 pb-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                        <input
                            type="text"
                            placeholder="חיפוש שירים, אמנים, אלבומים..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pr-12 pl-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Source Switcher */}
                    <div className="flex items-center gap-2 p-1.5 bg-black/40 rounded-2xl border border-white/10">
                        <button
                            onClick={() => handleSelectMusicSource('local')}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${musicSource === 'local' ? 'bg-purple-600 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                        >
                            <HardDrive className="w-4 h-4" /> כונן מקומי
                        </button>
                        <button
                            onClick={() => handleSelectMusicSource('spotify')}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${musicSource === 'spotify' ? 'bg-[#1DB954] text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                        >
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.494 17.306c-.219.359-.684.475-1.042.256-2.859-1.747-6.458-2.141-10.697-1.171-.41.094-.821-.161-.915-.571-.094-.41.161-.821.571-.915 4.636-1.06 8.601-.611 11.786 1.336.359.219.475.684.256 1.042zm1.466-3.26c-.276.449-.861.59-1.311.314-3.272-2.012-8.259-2.597-12.127-1.422-.505.153-1.04-.132-1.192-.637-.152-.505.133-1.04.638-1.192 4.412-1.339 9.899-.684 13.678 1.637.45.276.591.861.314 1.311h-.001zm.126-3.414c-3.926-2.331-10.407-2.546-14.18-1.4c-.604.184-1.24-.162-1.424-.766-.184-.604.162-1.24.766-1.424 4.331-1.315 11.488-1.066 16.004 1.614.543.322.721 1.021.399 1.564-.322.543-1.021.721-1.565.399l-.001.013z" /></svg>
                            Spotify
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); setEditMode(false); }}
                            className={`px-6 py-2.5 rounded-2xl flex items-center gap-2 transition-all shrink-0 font-bold ${activeTab === tab.id
                                ? 'bg-white text-black shadow-[0_8px_20px_rgba(255,255,255,0.2)]'
                                : 'text-white/50 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}

                    <div className="flex-1" />

                    {activeTab === 'playlists' && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setEditMode(!editMode)}
                                className={`p-2.5 rounded-2xl transition-all ${editMode ? 'bg-amber-500 text-white' : 'music-glass text-white/50 hover:text-white'}`}
                                title="ערוך פלייליסטים"
                            >
                                <Pencil className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setShowPlaylistBuilder(true)}
                                className="px-6 py-2.5 rounded-2xl music-gradient-purple text-white shadow-lg font-bold flex items-center gap-2"
                            >
                                <ListMusic className="w-5 h-5" /> חדש
                            </button>
                            {musicSource === 'spotify' && (
                                <button
                                    onClick={() => setShowSpotifyPlaylistSearch(true)}
                                    className="px-6 py-2.5 rounded-2xl bg-[#1DB954] text-white shadow-lg font-bold flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.494 17.306c-.219.359-.684.475-1.042.256-2.859-1.747-6.458-2.141-10.697-1.171-.41.094-.821-.161-.915-.571-.094-.41.161-.821.571-.915 4.636-1.06 8.601-.611 11.786 1.336.359.219.475.684.256 1.042zm1.466-3.26c-.276.449-.861.59-1.311.314-3.272-2.012-8.259-2.597-12.127-1.422-.505.153-1.04-.132-1.192-.637-.152-.505.133-1.04.638-1.192 4.412-1.339 9.899-.684 13.678 1.637.45.276.591.861.314 1.311h-.001zm.126-3.414c-3.926-2.331-10.407-2.546-14.18-1.4c-.604.184-1.24-.162-1.424-.766-.184-.604.162-1.24.766-1.424 4.331-1.315 11.488-1.066 16.004 1.614.543.322.721 1.021.399 1.564-.322.543-1.021.721-1.565.399l-.001.013z" /></svg>
                                    ייבוא Spotify
                                </button>
                            )}
                        </div>
                    )}

                    {activeTab === 'albums' && (
                        <div className="flex items-center gap-2">
                            {musicSource === 'local' ? (
                                <button
                                    onClick={() => setShowScanner(true)}
                                    className="px-6 py-2.5 rounded-2xl music-glass text-white shadow-lg font-bold flex items-center gap-2 hover:bg-white/10"
                                >
                                    <RefreshCw className="w-5 h-5" /> סרוק כונן
                                </button>
                            ) : (
                                <button
                                    onClick={() => setShowSpotifySearch(true)}
                                    className="px-6 py-2.5 rounded-2xl bg-[#1DB954] text-white shadow-lg font-bold flex items-center gap-2"
                                >
                                    <Disc className="w-5 h-5" /> הוסף מ-Spotify
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Grid Content */}
            <div className="flex-1 overflow-y-auto music-scrollbar p-6 pt-2">
                {activeTab === 'albums' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                        {filteredAlbums.map((album) => (
                            <AlbumCard
                                key={album.id}
                                album={album}
                                onPlay={() => onPlayAlbum(album)}
                                onClick={() => onSelectAlbum({ ...album, isPlaylist: false })}
                            />
                        ))}
                    </div>
                )}

                {activeTab === 'artists' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                        {filteredArtists.map((artist) => (
                            <div key={artist.id} className="music-album-card aspect-square bg-gradient-to-br from-white/10 to-white/5 p-6 flex flex-col items-center justify-center text-center group">
                                <div className="w-24 h-24 rounded-full music-glass flex items-center justify-center mb-4 group-hover:scale-110 transition-transform bg-white/5">
                                    <User className="w-12 h-12 text-purple-400" />
                                </div>
                                <h3 className="text-white font-bold truncate w-full">{artist.name}</h3>
                                <p className="text-white/40 text-sm">אמן</p>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'playlists' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                        {filteredPlaylists.map((playlist) => (
                            <div
                                key={playlist.id}
                                onClick={() => onSelectAlbum({ ...playlist, isPlaylist: true, artist: { name: 'פלייליסט' } })}
                                className="music-album-card group relative h-full"
                            >
                                <div className="aspect-square bg-gradient-to-br from-purple-900/40 to-black/40 flex items-center justify-center relative overflow-hidden rounded-2xl border border-white/10">
                                    {playlist.cover_url ? (
                                        <img src={playlist.cover_url} alt={playlist.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-white/5">
                                            <ListMusic className="w-16 h-16 text-white/20 group-hover:scale-110 transition-transform" />
                                        </div>
                                    )}

                                    {/* Overlay */}
                                    <div className="absolute inset-0 bg-black/70 opacity-100 flex flex-col justify-end p-4 backdrop-blur-md">
                                        <h3 className="text-white text-sm font-bold truncate">{playlist.name}</h3>
                                        <p className="text-white/50 text-xs">פלייליסט</p>
                                    </div>

                                    {/* Play Button Overlay */}
                                    <div className="absolute inset-0 bg-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onPlayPlaylist(playlist); }}
                                            className="w-12 h-12 rounded-full music-gradient-purple flex items-center justify-center shadow-xl transform scale-75 group-hover:scale-100 transition-transform hover:scale-110"
                                        >
                                            <Play className="w-6 h-6 text-white fill-white mr-[-2px]" />
                                        </button>
                                    </div>

                                    {editMode && (
                                        <button
                                            onClick={(e) => handleDeletePlaylist(e, playlist.id)}
                                            className="absolute top-2 left-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors z-20"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'favorites' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                        <div
                            onClick={() => onSelectAlbum(null)}
                            className="music-album-card group"
                        >
                            <div className="aspect-square bg-gradient-to-br from-pink-500/20 to-red-500/20 rounded-2xl border border-white/10 flex flex-col items-center justify-center gap-4 hover:border-pink-500/50 transition-all p-4 text-center">
                                <div className="w-16 h-16 rounded-full bg-pink-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Heart className="w-8 h-8 text-pink-500 fill-pink-500" />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold">השירים האהובים שלי</h3>
                                    <p className="text-white/40 text-sm">{favoriteSongs.length} שירים</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CollectionGrid;
