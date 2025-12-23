import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MusicPage from './pages/index.jsx'
import SpotifyCallback from './pages/callback/spotify/index.jsx'
import { AuthProvider } from './context/AuthContext'
import { MusicProvider } from './context/MusicContext'
import './styles/music.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <MusicProvider>
          <Routes>
            <Route path="/callback/spotify" element={<SpotifyCallback />} />
            <Route path="/*" element={<MusicPage />} />
          </Routes>
        </MusicProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
