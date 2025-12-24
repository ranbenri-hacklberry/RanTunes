import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MusicPage from './pages/index.jsx'
import SpotifyCallback from './pages/callback/spotify/index.jsx'
import { AuthProvider } from './context/AuthContext'
import { MusicProvider } from './context/MusicContext'
import { ConnectionProvider } from './context/ConnectionContext'
import './styles/music.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ConnectionProvider>
          <MusicProvider>
            <Routes>
              <Route path="/callback/spotify" element={<SpotifyCallback />} />
              <Route path="/*" element={<MusicPage />} />
            </Routes>
          </MusicProvider>
        </ConnectionProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
