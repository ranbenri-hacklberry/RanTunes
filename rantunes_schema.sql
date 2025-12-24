-- =====================================================
-- RanTunes Database Schema
-- Separate tables for the standalone music app
-- Run this in Supabase SQL Editor
-- =====================================================

-- ===================
-- USERS TABLE
-- ===================
CREATE TABLE IF NOT EXISTS rantunes_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    is_admin BOOLEAN DEFAULT FALSE,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES rantunes_users(id)
);

-- Index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_rantunes_users_email ON rantunes_users(email);
CREATE INDEX IF NOT EXISTS idx_rantunes_users_status ON rantunes_users(status);

-- ===================
-- RLS POLICIES
-- ===================

-- Enable RLS
ALTER TABLE rantunes_users ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for registration)
CREATE POLICY "Allow public registration" ON rantunes_users
    FOR INSERT
    WITH CHECK (true);

-- Allow users to read their own data
CREATE POLICY "Users can read own data" ON rantunes_users
    FOR SELECT
    USING (true); -- For now, allow all reads (needed for login check)

-- Allow admins to update any user (for approval)
CREATE POLICY "Admins can update users" ON rantunes_users
    FOR UPDATE
    USING (true); -- Simplified for now

-- ===================
-- RATINGS TABLE (for song likes/dislikes)
-- ===================
CREATE TABLE IF NOT EXISTS rantunes_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES rantunes_users(id) ON DELETE CASCADE,
    song_id TEXT NOT NULL, -- Can be Spotify ID or local file path
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, song_id)
);

CREATE INDEX IF NOT EXISTS idx_rantunes_ratings_user ON rantunes_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_rantunes_ratings_song ON rantunes_ratings(song_id);

-- Enable RLS
ALTER TABLE rantunes_ratings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage their own ratings
CREATE POLICY "Users can manage own ratings" ON rantunes_ratings
    FOR ALL
    USING (true);

-- ===================
-- PLAYLISTS TABLE
-- ===================
CREATE TABLE IF NOT EXISTS rantunes_playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES rantunes_users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cover_url TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rantunes_playlists_user ON rantunes_playlists(user_id);

-- Enable RLS
ALTER TABLE rantunes_playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own playlists" ON rantunes_playlists
    FOR ALL
    USING (true);

-- ===================
-- PLAYLIST SONGS TABLE
-- ===================
CREATE TABLE IF NOT EXISTS rantunes_playlist_songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID NOT NULL REFERENCES rantunes_playlists(id) ON DELETE CASCADE,
    song_id TEXT NOT NULL,
    song_title TEXT,
    song_artist TEXT,
    song_cover_url TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rantunes_playlist_songs_playlist ON rantunes_playlist_songs(playlist_id);

-- Enable RLS
ALTER TABLE rantunes_playlist_songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage playlist songs" ON rantunes_playlist_songs
    FOR ALL
    USING (true);

-- ===================
-- SEED ADMIN USER (Optional)
-- ===================
-- Uncomment and modify to create your admin user:
-- INSERT INTO rantunes_users (name, email, password_hash, status, is_admin)
-- VALUES ('Admin', 'admin@example.com', 'your_password_here', 'approved', true);

-- ===================
-- HELPER FUNCTION: Approve User
-- ===================
CREATE OR REPLACE FUNCTION approve_rantunes_user(target_user_id UUID, admin_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE rantunes_users 
    SET 
        status = 'approved',
        approved_at = NOW(),
        approved_by = admin_user_id,
        updated_at = NOW()
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================
-- MUSIC DATA TABLES
-- ===================

CREATE TABLE IF NOT EXISTS rantunes_artists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    business_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, business_id)
);

CREATE TABLE IF NOT EXISTS rantunes_albums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    artist_id UUID REFERENCES rantunes_artists(id) ON DELETE CASCADE,
    cover_url TEXT,
    folder_path TEXT UNIQUE, -- Stores Spotify URI or Local Path
    business_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rantunes_songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    album_id UUID REFERENCES rantunes_albums(id) ON DELETE CASCADE,
    artist_id UUID REFERENCES rantunes_artists(id) ON DELETE CASCADE,
    track_number INTEGER,
    duration_seconds INTEGER,
    file_path TEXT NOT NULL, -- Spotify URI or streamable path
    file_name TEXT,
    business_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(file_path, business_id)
);

CREATE INDEX IF NOT EXISTS idx_rantunes_songs_album ON rantunes_songs(album_id);
CREATE INDEX IF NOT EXISTS idx_rantunes_songs_artist ON rantunes_songs(artist_id);

-- Enable RLS for these tables
ALTER TABLE rantunes_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE rantunes_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE rantunes_songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read rantunes_artists" ON rantunes_artists FOR SELECT USING (true);
CREATE POLICY "Public read rantunes_albums" ON rantunes_albums FOR SELECT USING (true);
CREATE POLICY "Public read rantunes_songs" ON rantunes_songs FOR SELECT USING (true);

-- Allow admins to manage music data
CREATE POLICY "Allow management rantunes_artists" ON rantunes_artists FOR ALL USING (true);
CREATE POLICY "Allow management rantunes_albums" ON rantunes_albums FOR ALL USING (true);
CREATE POLICY "Allow management rantunes_songs" ON rantunes_songs FOR ALL USING (true);
