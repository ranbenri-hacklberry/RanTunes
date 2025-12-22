# RanTunes 🎵

A beautiful, modern music streaming application with smart playlists and Spotify integration.

## Features
- 🎧 Local music library management
- 🎨 Beautiful, responsive UI with glassmorphism design
- 🎵 Smart playlists with AI-powered recommendations
- 🔗 Spotify integration for streaming
- ⭐ Song ratings and favorites
- 🔐 Secure authentication with Supabase

## Tech Stack
**Frontend:**
- React 18
- Vite
- TailwindCSS
- Framer Motion
- Lucide Icons

**Backend:**
- Node.js + Express
- Supabase (PostgreSQL)
- Google Drive API (for encrypted music storage)
- Spotify Web API

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase account
- Spotify Developer account (optional)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/RanTunes.git
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
