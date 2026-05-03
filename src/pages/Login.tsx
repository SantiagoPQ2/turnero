import { useState, CSSProperties } from 'react'
import { Session } from '../types'

const TURNERO_CODE = 'DEPOSITO2024'

interface Props { onLogin: (s: Session) => void }

export default function Login({ onLogin }: Props) {
  const [role, setRole] = useState<'cliente' | 'turnero' | null>(null)
  const [form, setForm] = useState({ nombre: '', empresa: '', codigo: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    if (role === 'turnero') {
      if (form.codigo !== TURNERO_CODE) { setError('Código incorrecto'); setLoading(false); return }
      onLogin({ role: 'turnero', nombre: 'Operador', empresa: 'Depósito' })
    } else {
      if (!form.nombre.trim() || !form.empresa.trim()) { setError('Completá todos los campos'); setLoading(false); return }
      onLogin({ role: 'cliente', nombre: form.nombre.trim(), empresa: form.empresa.trim() })
    }
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

        {!role && (
          <div>
            <p style={s.roleLabel}>¿Cómo querés ingresar?</p>
            <div style={s.roleGrid}>
              <button style={s.roleCard} onClick={() => setRole('cliente')}>
                <div style={s.roleIcon}>🏢</div>
                <div style={s.roleName}>Proveedor</div>
                <div style={s.roleDesc}>Reservar un turno para entregar mercadería</div>
              </button>
              <button style={s.roleCard} onClick={() => setRole('turnero')}>
                <div style={s.roleIcon}>📋</div>
                <div style={s.roleName}>Operador</div>
                <div style={s.roleDesc}>Ver y gestionar todos los turnos del depósito</div>
              </button>
            </div>
          </div>
        )}

        {role && (
          <form onSubmit={handleSubmit} style={s.form} className="animate-in">
            <button type="button" onClick={() => { setRole(null); setError('') }} style={s.back}>← Volver</button>
            <div style={s.formHeader}>
              <span style={s.badge}>{role === 'cliente' ? '🏢 Proveedor' : '📋 Operador'}</span>
              <h2 style={s.formTitle}>{role === 'cliente' ? 'Ingresá tus datos' : 'Acceso operador'}</h2>
            </div>
            {role === 'cliente' && (<>
              <div style={s.field}>
                <label style={s.label}>Tu nombre</label>
                <input style={s.input} placeholder="Ej: Juan Pérez" value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required />
              </div>
              <div style={s.field}>
                <label style={s.label}>Empresa / Razón social</label>
                <input style={s.input} placeholder="Ej: Distribuidora XYZ S.A." value={form.empresa}
                  onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))} required />
              </div>
            </>)}
            {role === 'turnero' && (
              <div style={s.field}>
                <label style={s.label}>Código de acceso</label>
                <input style={s.input} type="password" placeholder="Ingresá el código" value={form.codigo}
                  onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} required />
              </div>
            )}
            {error && <div style={s.error}>{error}</div>}
            <button type="submit" style={s.submit} disabled={loading}>
              {loading ? 'Ingresando...' : role === 'cliente' ? 'Ver turnos disponibles →' : 'Ingresar al panel →'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

const s: Record<string, CSSProperties> = {
  wrapper: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative' },
  bg: { position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(99,102,241,0.06) 0%, transparent 50%)', pointerEvents: 'none' },
  card: { width: '100%', maxWidth: '480px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '40px', boxShadow: 'var(--shadow-lg)', position: 'relative' },
  header: { textAlign: 'center', marginBottom: '32px' },
  logo: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '8px' },
  logoText: { fontSize: '22px', fontWeight: '700', letterSpacing: '-0.5px' },
  subtitle: { color: 'var(--text2)', fontSize: '14px' },
  roleLabel: { color: 'var(--text2)', fontSize: '13px', marginBottom: '16px', textAlign: 'center' },
  roleGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  roleCard: { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px 16px', textAlign: 'center', cursor: 'pointer', color: 'var(--text)' },
  roleIcon: { fontSize: '28px', marginBottom: '10px' },
  roleName: { fontWeight: '600', fontSize: '15px', marginBottom: '6px' },
  roleDesc: { color: 'var(--text2)', fontSize: '12px', lineHeight: '1.4' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  back: { background: 'none', color: 'var(--text2)', fontSize: '13px', padding: '0', alignSelf: 'flex-start' },
  formHeader: { marginBottom: '4px' },
  badge: { display: 'inline-block', background: 'var(--accent-light)', color: 'var(--accent)', fontSize: '12px', fontWeight: '600', padding: '4px 10px', borderRadius: '20px', marginBottom: '8px' },
  formTitle: { fontSize: '20px', fontWeight: '700' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '500', color: 'var(--text2)' },
  input: { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', color: 'var(--text)', fontSize: '15px', width: '100%' },
  error: { background: 'var(--red-light)', color: 'var(--red)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '13px' },
  submit: { background: 'var(--accent)', color: 'white', fontWeight: '600', fontSize: '15px', padding: '14px', borderRadius: 'var(--radius-sm)', marginTop: '4px' },
}
