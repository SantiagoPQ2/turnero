import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import Login from './pages/Login'
import ClienteDashboard from './pages/ClienteDashboard'
import TurneroDashboard from './pages/TurneroDashboard'
import { Session } from './types'

export default function App() {
  const [session, setSession] = useState<Session | null>(() => {
    const saved = localStorage.getItem('turnero_session')
    return saved ? JSON.parse(saved) : null
  })

  const login = (userData: Session) => {
    localStorage.setItem('turnero_session', JSON.stringify(userData))
    setSession(userData)
  }

  const logout = () => {
    localStorage.removeItem('turnero_session')
    setSession(null)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          session
            ? <Navigate to={session.role === 'turnero' ? '/turnero' : '/cliente'} />
            : <Login onLogin={login} />
        } />
        <Route path="/cliente" element={
          session?.role === 'cliente'
            ? <ClienteDashboard session={session} onLogout={logout} />
            : <Navigate to="/" />
        } />
        <Route path="/turnero" element={
          session?.role === 'turnero'
            ? <TurneroDashboard session={session} onLogout={logout} />
            : <Navigate to="/" />
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}
