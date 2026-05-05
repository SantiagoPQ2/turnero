import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import ClienteDashboard from './pages/ClienteDashboard'
import TurneroDashboard from './pages/TurneroDashboard'
import { Perfil } from './types'

export default function App() {
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) loadPerfil(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) loadPerfil(session.user.id)
      else { setPerfil(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const loadPerfil = async (userId: string) => {
    const { data } = await supabase.from('z_perfiles').select('*').eq('id', userId).single()
    setPerfil(data as Perfil | null)
    setLoading(false)
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
          perfil.rol === 'operador' ? <Navigate to="/operador" /> :
          <Navigate to="/proveedor" />
        } />
        <Route path="/proveedor" element={
          perfil?.rol === 'proveedor' ? <ClienteDashboard perfil={perfil} /> : <Navigate to="/" />
        } />
        <Route path="/operador" element={
          perfil?.rol === 'operador' ? <TurneroDashboard perfil={perfil} /> : <Navigate to="/" />
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}
