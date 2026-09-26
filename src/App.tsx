import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import BoardPage from './pages/BoardPage'
import AdminSignIn from './pages/AdminSignIn'
import AdminPanel from './pages/AdminPanel'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BoardPage />} />
        <Route path="/board" element={<Navigate to="/" replace />} />
        <Route path="/admin" element={<AdminSignIn />} />
        <Route path="/admin/panel" element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
