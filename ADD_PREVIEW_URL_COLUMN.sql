-- Run this in your Supabase SQL Editor to add the missing column
-- This will allow storing Spotify preview URLs for songs
ALTER TABLE rantunes_songs
ADD COLUMN IF NOT EXISTS preview_url TEXT;