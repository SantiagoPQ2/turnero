import { useState, CSSProperties } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [mode, setMode] = useState<'auth' | 'proveedor'>('auth')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAuthLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Email o contraseña incorrectos')
    setLoading(false)
  }

  const handleProveedorLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data, error } = await supabase
      .from('z_perfiles')
      .select('*')
      .eq('nombre', nombre)
      .eq('password', password)
      .eq('rol', 'proveedor')
      .single()
    if (error || !data) {
      setError('Nombre o contraseña incorrectos')
      setLoading(false)
      return
    }
    // Login exitoso como proveedor — guardamos en localStorage
    localStorage.setItem('proveedor_perfil', JSON.stringify(data))
    window.location.href = '/proveedor'
    setLoading(false)
  }

  return (
    <div style={s.wrapper}>
      <div style={s.bg} />
      <div style={s.card} className="animate-in">
        <div style={s.header}>
          <div style={s.logo}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="var(--accent)"/>
              <rect x="8" y="10" width="16" height="2" rx="1" fill="white"/>
              <rect x="8" y="15" width="16" height="2" rx="1" fill="white"/>
              <rect x="8" y="20" width="10" height="2" rx="1" fill="white"/>
            </svg>
            <span style={s.logoText}>Turnero</span>
          </div>
          <p style={s.subtitle}>Sistema de gestión de entregas en depósito</p>
        </div>

        {/* Toggle */}
        <div style={s.toggle}>
          <button style={{ ...s.toggleBtn, ...(mode === 'auth' ? s.toggleActive : {}) }} onClick={() => { setMode('auth'); setError('') }}>
            Operador
          </button>
          <button style={{ ...s.toggleBtn, ...(mode === 'proveedor' ? s.toggleActive : {}) }} onClick={() => { setMode('proveedor'); setError('') }}>
            Proveedor
          </button>
        </div>

        {mode === 'auth' ? (
          <form onSubmit={handleAuthLogin} style={s.form}>
            <div style={s.field}>
              <label style={s.label}>Email</label>
              <input style={s.input} type="email" placeholder="tu@email.com"
                value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Contraseña</label>
              <input style={s.input} type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            {error && <div style={s.error}>⚠ {error}</div>}
            <button type="submit" style={s.btn} disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleProveedorLogin} style={s.form}>
            <div style={s.field}>
              <label style={s.label}>Nombre de empresa</label>
              <input style={s.input} type="text" placeholder="Ej: Quickfood"
                value={nombre} onChange={e => setNombre(e.target.value)} required />
            </div>
            <div style={s.field}>
              <label style={s.label}>Contraseña</label>
              <input style={s.input} type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <div style={s.error}>⚠ {error}</div>}
            <button type="submit" style={{ ...s.btn, background: '#f59e0b' }} disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar →'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

const s: Record<string, CSSProperties> = {
  wrapper: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative' },
  bg: { position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.08) 0%, transparent 60%)', pointerEvents: 'none' },
  card: { width: '100%', maxWidth: '420px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '40px', position: 'relative' },
  header: { textAlign: 'center', marginBottom: '28px' },
  logo: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '8px' },
  logoText: { fontSize: '22px', fontWeight: '700' },
  subtitle: { color: 'var(--text2)', fontSize: '14px' },
  toggle: { display: 'flex', background: 'var(--surface2)', borderRadius: '10px', padding: '4px', marginBottom: '24px', gap: '4px' },
  toggleBtn: { flex: 1, padding: '8px', borderRadius: '7px', border: 'none', background: 'none', color: 'var(--text2)', fontWeight: '600', fontSize: '14px', cursor: 'pointer' },
  toggleActive: { background: 'var(--surface)', color: 'var(--text)', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '500', color: 'var(--text2)' },
  input: { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', color: 'var(--text)', fontSize: '15px', width: '100%' },
  error: { background: 'var(--red-light)', color: 'var(--red)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '13px' },
  btn: { background: 'var(--accent)', color: 'white', fontWeight: '600', fontSize: '15px', padding: '14px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', marginTop: '4px' },
}
