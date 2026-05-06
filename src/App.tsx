import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Login'
import ClienteDashboard from './pages/ClienteDashboard'
import TurneroDashboard from './pages/TurneroDashboard'
import { Perfil } from './types'

export default function App() {
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const data = localStorage.getItem('turnero_perfil')
    if (data) setPerfil(JSON.parse(data))
    setLoading(false)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('turnero_perfil')
    setPerfil(null)
    window.location.href = '/'
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)', color: 'var(--text2)', fontSize: '15px' }}>
      Cargando...
    </div>
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          !perfil ? <Login /> :
          (perfil.rol === 'operador' || perfil.rol === 'view') ? <Navigate to="/operador" /> :
          <Navigate to="/proveedor" />
        } />
        <Route path="/proveedor" element={
          perfil?.rol === 'proveedor'
            ? <ClienteDashboard perfil={perfil} onLogout={handleLogout} />
            : <Navigate to="/" />
        } />
        <Route path="/operador" element={
          (perfil?.rol === 'operador' || perfil?.rol === 'view')
            ? <TurneroDashboard perfil={perfil} onLogout={handleLogout} />
            : <Navigate to="/" />
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}
