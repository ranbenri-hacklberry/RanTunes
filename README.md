# RanTunes

Venue ambiance player for cafes and shops. It manages a local music library, talks to the Spotify Web API, and keeps a live shared playback state with iCaffeOS so the POS / mini-player stays in sync.

Operators can scan a local disk (or an external SSD), rate tracks, build playlists, optionally stream or control Spotify, and run the same player as a web PWA or an Electron desktop app.

### Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Framer Motion, PWA
- **Desktop:** Electron
- **Backend:** Node.js + Express (local scan, stream, cover art, Drive sync, YouTube ingest)
- **Data & auth:** Supabase (PostgreSQL) with realtime shared playback
- **Integrations:** Spotify Web API (PKCE), Google Drive API

### Architecture

```
Electron / PWA / browser UI  ──►  Express local server (scan, stream, Drive)
           │
           └── Supabase (auth, library metadata, music_current_playback)
                    │
                    └── realtime ──► iCaffeOS MiniMusicPlayer
```

Spotify calls go from the client to the Spotify Web API. Local files are served by the Express process. Playback position and now-playing are written to `music_current_playback` so iCaffeOS can follow along.

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase account
- Spotify Developer account (optional)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/ranbenri-hacklberry/RanTunes.git
cd RanTunes
```

2. **Setup Client**
```bash
cd client
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

3. **Setup Server**
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your credentials
node server.js
```

### Environment Variables

**Client (.env)**
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:8080
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id
VITE_SPOTIFY_REDIRECT_URI=http://localhost:3000/callback/spotify
```

**Server (.env)**
```
PORT=8080
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
MUSIC_DIRECTORY=/path/to/your/music
GOOGLE_SERVICE_ACCOUNT_PATH=/path/to/service-account.json
```

## Deployment

### Frontend (Vercel)
```bash
cd client
npm run build
vercel --prod
```

### Backend (Google Cloud Run)
```bash
cd server
gcloud builds submit --tag gcr.io/YOUR_PROJECT/rantunes-server
gcloud run deploy rantunes-server --image gcr.io/YOUR_PROJECT/rantunes-server --platform managed
```

## License
MIT
