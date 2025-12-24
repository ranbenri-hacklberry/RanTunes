import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import SpotifyCallback from './pages/callback/spotify/index.jsx'
import { RanTunesAuthProvider } from './context/RanTunesAuthContext'
import { AuthProvider } from './context/AuthContext'
import { MusicProvider } from './context/MusicContext'
import { ConnectionProvider } from './context/ConnectionContext'
import './styles/music.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <RanTunesAuthProvider>
        <AuthProvider>
          <ConnectionProvider>
            <MusicProvider>
              <Routes>
                <Route path="/callback/spotify" element={<SpotifyCallback />} />
                <Route path="/*" element={<App />} />
              </Routes>
            </MusicProvider>
          </ConnectionProvider>
        </AuthProvider>
      </RanTunesAuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
