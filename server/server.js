import 'dotenv/config';
import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

// === ENV ===
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    console.log("✅ Supabase Client Initialized");
}

const ensureSupabase = (req, res, next) => {
    if (!supabase) return res.status(500).json({ error: "Missing Supabase Credentials" });
    next();
};

// ------------------------------------------------------------------
// === RanTunes: MUSIC STREAMING & MANAGEMENT ===
// ------------------------------------------------------------------

// POST /api/music/scan - Scan local directory and sync to DB
app.post("/api/music/scan", ensureSupabase, async (req, res) => {
    try {
        const musicDir = process.env.MUSIC_DIRECTORY || path.join(__dirname, 'music');
        if (!fs.existsSync(musicDir)) fs.mkdirSync(musicDir, { recursive: true });

        const files = fs.readdirSync(musicDir, { recursive: true });
        const songs = files.filter(f => f.endsWith('.mp3') || f.endsWith('.m4a') || f.endsWith('.wav'));

        console.log(`🔍 Scanning music directory: ${musicDir}. Found ${songs.length} songs.`);

        for (const songPath of songs) {
            const fileName = path.basename(songPath);
            const relativeDir = path.dirname(songPath);

            // Basic metadata from filename
            const parts = fileName.replace(/\.[^/.]+$/, "").split(" - ");
            const artist = parts.length > 1 ? parts[0] : "Unknown Artist";
            const title = parts.length > 1 ? parts[1] : parts[0];

            await supabase.from('music_library').upsert({
                file_path: songPath,
                file_name: fileName,
                title,
                artist,
                album: relativeDir !== "." ? relativeDir : "Single",
                last_scanned: new Date().toISOString()
            }, { onConflict: 'file_path' });
        }

        res.json({ success: true, count: songs.length });
    } catch (err) {
        console.error("Scan error:", err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/music/stream/:id - Stream a song
app.get("/api/music/stream/:id", ensureSupabase, async (req, res) => {
    try {
        const { data: song, error } = await supabase
            .from('music_library')
            .select('file_path')
            .eq('id', req.params.id)
            .single();

        if (error || !song) return res.status(404).json({ error: "Song not found" });

        const musicDir = process.env.MUSIC_DIRECTORY || path.join(__dirname, 'music');
        const fullPath = path.join(musicDir, song.file_path);

        if (!fs.existsSync(fullPath)) return res.status(404).json({ error: "File not on disk" });

        const stat = fs.statSync(fullPath);
        res.writeHead(200, {
            'Content-Type': 'audio/mpeg',
            'Content-Length': stat.size,
            'Accept-Ranges': 'bytes'
        });

        fs.createReadStream(fullPath).pipe(res);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/music/drive-sync - Sync from Google Drive
app.post("/api/music/drive-sync", ensureSupabase, async (req, res) => {
    try {
        const DriveSync = (await import('./src/lib/driveSync.js')).default;
        const serviceAccount = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || './service-account.json';
        const musicDir = process.env.MUSIC_DIRECTORY || path.join(__dirname, 'music');

        const sync = new DriveSync(serviceAccount, musicDir);
        const report = await sync.performSync();

        res.json(report);
    } catch (err) {
        console.error("Drive sync error:", err);
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎵 RanTunes Server running on port ${PORT}`);
});
