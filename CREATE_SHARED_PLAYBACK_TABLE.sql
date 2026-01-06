-- Run this in Supabase SQL Editor
-- Creates a table for sharing music playback state between RanTunes and iCaffe
-- Current playback state (one row per user)
CREATE TABLE IF NOT EXISTS music_current_playback (
    user_id UUID PRIMARY KEY REFERENCES rantunes_users(id) ON DELETE CASCADE,
    song_id TEXT,
    song_title TEXT,
    artist_name TEXT,
    album_name TEXT,
    cover_url TEXT,
    spotify_uri TEXT,
    is_playing BOOLEAN DEFAULT false,
    position_ms INTEGER DEFAULT 0,
    duration_ms INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Enable RLS
ALTER TABLE music_current_playback ENABLE ROW LEVEL SECURITY;
-- Allow all access (users manage their own playback state)
CREATE POLICY "Users can manage own playback" ON music_current_playback FOR ALL USING (true);
-- Enable realtime for instant updates across domains
ALTER PUBLICATION supabase_realtime
ADD TABLE music_current_playback;
-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_music_playback_updated ON music_current_playback(updated_at DESC);