import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MusicPage from './pages/index.jsx'
import './styles/music.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<MusicPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
