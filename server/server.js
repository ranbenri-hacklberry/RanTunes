import 'dotenv/config';
import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { execFile, exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

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
// === MUSIC DIRECTORY RESOLUTION ===
// Priority: /Volumes/RANTUNES → ~/Music/RanTunes
// ------------------------------------------------------------------

const EXTERNAL_DISK_PATH = '/Volumes/RANTUNES';
const FALLBACK_MUSIC_DIR = path.join(os.homedir(), 'Music', 'RanTunes');

function getMusicDirectory() {
    // Check if external disk is mounted
    if (fs.existsSync(EXTERNAL_DISK_PATH)) {
        console.log(`💿 External disk found: ${EXTERNAL_DISK_PATH}`);
        return EXTERNAL_DISK_PATH;
    }
    // Fallback to local directory
    console.log(`📁 Using local music dir: ${FALLBACK_MUSIC_DIR}`);
    return FALLBACK_MUSIC_DIR;
}

// GET /api/music/disk-status - Check which disk is active
app.get("/api/music/disk-status", (req, res) => {
    const externalMounted = fs.existsSync(EXTERNAL_DISK_PATH);
    const activeDir = getMusicDirectory();

    // Ensure fallback dir exists
    if (!externalMounted && !fs.existsSync(FALLBACK_MUSIC_DIR)) {
        fs.mkdirSync(FALLBACK_MUSIC_DIR, { recursive: true });
    }

    res.json({
        externalDisk: externalMounted,
        externalPath: EXTERNAL_DISK_PATH,
        fallbackPath: FALLBACK_MUSIC_DIR,
        activeDirectory: activeDir,
        label: externalMounted ? 'RANTUNES (דיסק חיצוני)' : 'Music/RanTunes (מקומי)'
    });
});

// ------------------------------------------------------------------
// === YOUTUBE DOWNLOAD ===
// ------------------------------------------------------------------

// Validate YouTube URL
function isValidYouTubeUrl(url) {
    return /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]+/.test(url);
}

// Check if yt-dlp is installed
async function checkYtDlp() {
    try {
        await execAsync('which yt-dlp');
        return true;
    } catch {
        try {
            await execAsync('which yt-dlp');
            return true;
        } catch {
            return false;
        }
    }
}

// GET /api/download/info - Get video metadata before download
app.get("/api/download/info", async (req, res) => {
    const { url } = req.query;

    if (!url || !isValidYouTubeUrl(url)) {
        return res.status(400).json({ error: 'כתובת YouTube לא תקינה' });
    }

    try {
        const hasYtDlp = await checkYtDlp();
        if (!hasYtDlp) {
            return res.status(500).json({ error: 'yt-dlp לא מותקן בשרת' });
        }

        const { stdout } = await execAsync(
            `yt-dlp --dump-json --no-playlist "${url}"`,
            { timeout: 15000 }
        );

        const info = JSON.parse(stdout);
        res.json({
            title: info.title,
            artist: info.artist || info.uploader || info.channel || 'Unknown',
            duration: info.duration,
            thumbnail: info.thumbnail,
            channel: info.uploader || info.channel,
            uploadDate: info.upload_date
        });
    } catch (err) {
        console.error('yt-dlp info error:', err.message);
        res.status(500).json({ error: 'לא הצלחתי לקרוא מידע על הסרטון' });
    }
});

// POST /api/download/youtube - Download audio from YouTube
app.post("/api/download/youtube", async (req, res) => {
    const { url, format = 'mp3', title, artist } = req.body;

    if (!url || !isValidYouTubeUrl(url)) {
        return res.status(400).json({ error: 'כתובת YouTube לא תקינה' });
    }

    try {
        const hasYtDlp = await checkYtDlp();
        if (!hasYtDlp) {
            return res.status(500).json({
                error: 'yt-dlp לא מותקן',
                install: 'brew install yt-dlp'
            });
        }

        const outputDir = getMusicDirectory();

        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        console.log(`⬇️ Downloading: ${url} → ${outputDir}`);

        // Build output template - Artist - Title if available
        const outputTemplate = path.join(outputDir, '%(artist,uploader)s - %(title)s.%(ext)s');

        // Build yt-dlp command
        const args = [
            '--no-playlist',
            '--extract-audio',
            '--audio-format', format === 'mp3' ? 'mp3' : 'm4a',
            '--audio-quality', '0',                         // Best quality
            '--embed-thumbnail',
            '--add-metadata',
            '--output', outputTemplate,
            url
        ];

        const ytDlpProcess = exec(
            `yt-dlp ${args.map(a => `"${a}"`).join(' ')}`,
            { timeout: 120000 }  // 2 min timeout
        );

        let output = '';
        let errorOutput = '';
        let downloadedFile = null;

        ytDlpProcess.stdout.on('data', (data) => {
            output += data;
            console.log('[yt-dlp]', data.trim());

            // Detect downloaded filename
            const match = data.match(/\[ExtractAudio\] Destination: (.+)/);
            if (match) downloadedFile = match[1].trim();

            // Also check for already-existing file
            const existsMatch = data.match(/\[download\] (.+) has already been downloaded/);
            if (existsMatch) downloadedFile = existsMatch[1].trim();
        });

        ytDlpProcess.stderr.on('data', (data) => {
            errorOutput += data;
        });

        ytDlpProcess.on('close', (code) => {
            if (code !== 0) {
                console.error('yt-dlp failed:', errorOutput);
                return res.status(500).json({
                    error: 'ההורדה נכשלה',
                    details: errorOutput.slice(-500)
                });
            }

            // Try to find the downloaded file if not detected from output
            if (!downloadedFile) {
                const recentFiles = fs.readdirSync(outputDir)
                    .map(f => ({
                        name: f,
                        time: fs.statSync(path.join(outputDir, f)).mtime.getTime()
                    }))
                    .filter(f => f.name.endsWith('.mp3') || f.name.endsWith('.m4a'))
                    .sort((a, b) => b.time - a.time);

                if (recentFiles.length > 0) {
                    downloadedFile = path.join(outputDir, recentFiles[0].name);
                }
            }

            const fileName = downloadedFile ? path.basename(downloadedFile) : null;
            const diskUsed = fs.existsSync(EXTERNAL_DISK_PATH) ? 'external' : 'local';

            console.log(`✅ Downloaded: ${fileName} → ${outputDir} (${diskUsed})`);

            res.json({
                success: true,
                fileName,
                outputDir,
                diskUsed,
                diskLabel: diskUsed === 'external' ? 'RANTUNES (דיסק חיצוני)' : 'Music/RanTunes (מקומי)'
            });
        });

        ytDlpProcess.on('error', (err) => {
            console.error('yt-dlp process error:', err);
            res.status(500).json({ error: err.message });
        });

    } catch (err) {
        console.error("Download error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ------------------------------------------------------------------
// === RanTunes: MUSIC STREAMING & MANAGEMENT ===
// ------------------------------------------------------------------

// POST /api/music/scan - Scan local directory and sync to DB
app.post("/api/music/scan", ensureSupabase, async (req, res) => {
    try {
        const musicDir = process.env.MUSIC_DIRECTORY || getMusicDirectory();
        if (!fs.existsSync(musicDir)) fs.mkdirSync(musicDir, { recursive: true });

        const files = fs.readdirSync(musicDir, { recursive: true });
        const songs = files.filter(f => f.endsWith('.mp3') || f.endsWith('.m4a') || f.endsWith('.wav'));

        console.log(`🔍 Scanning music directory: ${musicDir}. Found ${songs.length} songs.`);

        for (const songPath of songs) {
            const fileName = path.basename(songPath);
            const relativeDir = path.dirname(songPath);

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

        const musicDir = process.env.MUSIC_DIRECTORY || getMusicDirectory();
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

// POST /api/music/drive-sync - Sync from Google Drive
app.post("/api/music/drive-sync", ensureSupabase, async (req, res) => {
    try {
        const DriveSync = (await import('./src/lib/driveSync.js')).default;
        const serviceAccount = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || './service-account.json';
        const musicDir = process.env.MUSIC_DIRECTORY || getMusicDirectory();

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
    console.log(`💿 Music dir: ${getMusicDirectory()}`);
});
