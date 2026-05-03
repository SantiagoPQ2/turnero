import { useState, useEffect, CSSProperties } from 'react'
import { supabase } from '../lib/supabase'
import { format, addDays, startOfDay, isToday, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Session, Turno } from '../types'

const HORARIOS = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30']

function generateDays(n = 14): Date[] {
  const today = startOfDay(new Date())
  const days: Date[] = []
  for (let i = 0; i < n; i++) {
    const d = addDays(today, i)
    if (d.getDay() !== 0 && d.getDay() !== 6) days.push(d)
  }
  return days
}

interface Props { session: Session; onLogout: () => void }

type Step = 'calendario' | 'confirmar' | 'exito'
interface FormData { descripcion: string; bultos: string; observaciones: string }
type TurnoEstado = Pick<Turno, 'fecha' | 'hora' | 'estado'>

export default function ClienteDashboard({ session, onLogout }: Props) {
  const [days] = useState<Date[]>(generateDays)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [selectedHora, setSelectedHora] = useState<string | null>(null)
  const [turnos, setTurnos] = useState<TurnoEstado[]>([])
  const [misTurnos, setMisTurnos] = useState<Turno[]>([])
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<Step>('calendario')
  const [form, setForm] = useState<FormData>({ descripcion: '', bultos: '', observaciones: '' })

  useEffect(() => { fetchTurnos() }, [])

  const fetchTurnos = async () => {
    const { data } = await supabase.from('turnos').select('fecha, hora, estado')
    if (data) setTurnos(data as TurnoEstado[])
    const { data: mis } = await supabase.from('turnos').select('*')
      .eq('proveedor_nombre', session.nombre).eq('proveedor_empresa', session.empresa)
      .order('fecha', { ascending: true })
    if (mis) setMisTurnos(mis as Turno[])
  }

  const isOcupado = (fecha: Date, hora: string) =>
    turnos.some(t => t.fecha === format(fecha, 'yyyy-MM-dd') && t.hora === hora && t.estado !== 'cancelado')

  const handleConfirmar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDay || !selectedHora) return
    setLoading(true)
    await supabase.from('turnos').insert({
      fecha: format(selectedDay, 'yyyy-MM-dd'), hora: selectedHora,
      proveedor_nombre: session.nombre, proveedor_empresa: session.empresa,
      descripcion: form.descripcion, bultos: parseInt(form.bultos) || null,
      observaciones: form.observaciones, estado: 'confirmado',
    })
    setLoading(false)
    setStep('exito')
    fetchTurnos()
  }

  const handleCancelar = async (id: string) => {
    await supabase.from('turnos').update({ estado: 'cancelado' }).eq('id', id)
    fetchTurnos()
  }

  const estadoStyle = (e: string): CSSProperties => ({
    confirmado: { background: 'var(--green-light)', color: 'var(--green)' },
    cancelado: { background: 'var(--red-light)', color: 'var(--red)' },
    pendiente: { background: 'var(--yellow-light)', color: 'var(--yellow)' },
  }[e] ?? {})

  return (
    <div style={s.wrapper}>
      <aside style={s.sidebar}>
        <div style={s.sideTop}>
          <div style={s.logoRow}>
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="var(--accent)"/>
              <rect x="8" y="10" width="16" height="2" rx="1" fill="white"/>
              <rect x="8" y="15" width="16" height="2" rx="1" fill="white"/>
              <rect x="8" y="20" width="10" height="2" rx="1" fill="white"/>
            </svg>
            <span style={s.logoText}>Turnero</span>
          </div>
          <div style={s.userCard}>
            <div style={s.avatar}>{session.nombre[0].toUpperCase()}</div>
            <div>
              <div style={s.userName}>{session.nombre}</div>
              <div style={s.userEmp}>{session.empresa}</div>
            </div>
          </div>
        </div>
        <div style={s.misTurnosSection}>
          <div style={s.sectionTitle}>Mis turnos</div>
          {misTurnos.length === 0
            ? <div style={s.empty}>Sin turnos reservados</div>
            : misTurnos.map(t => (
              <div key={t.id} style={s.turnoItem}>
                <div style={s.turnoFecha}>{format(parseISO(t.fecha), 'EEE d MMM', { locale: es })}</div>
                <div style={s.turnoHora}>{t.hora}</div>
                <div style={{ ...s.estadoBadge, ...estadoStyle(t.estado) }}>{t.estado}</div>
                {t.estado === 'confirmado' && <button style={s.cancelBtn} onClick={() => handleCancelar(t.id)}>×</button>}
              </div>
            ))}
        </div>
        <button onClick={onLogout} style={s.logoutBtn}>Cerrar sesión</button>
      </aside>

      <main style={s.main}>
        {step === 'calendario' && (
          <div className="animate-in">
            <div style={s.pageHeader}>
              <h1 style={s.pageTitle}>Reservar turno</h1>
              <p style={s.pageSubtitle}>Seleccioná un día y horario disponible para la entrega</p>
            </div>
            <div style={s.daysStrip}>
              {days.map(d => {
                const isSelected = selectedDay && format(d, 'yyyy-MM-dd') === format(selectedDay, 'yyyy-MM-dd')
                const hayDisp = HORARIOS.some(h => !isOcupado(d, h))
                return (
                  <button key={d.toISOString()}
                    style={{ ...s.dayBtn, ...(isSelected ? s.dayBtnActive : {}), ...(!hayDisp ? s.dayBtnFull : {}) }}
                    onClick={() => { setSelectedDay(d); setSelectedHora(null) }}
                    disabled={!hayDisp}>
                    <span style={s.dayName}>{format(d, 'EEE', { locale: es })}</span>
                    <span style={s.dayNum}>{format(d, 'd')}</span>
                    <span style={s.dayMonth}>{format(d, 'MMM', { locale: es })}</span>
                    {isToday(d) && <span style={s.todayDot} />}
                  </button>
                )
              })}
            </div>

            {selectedDay && (
              <div className="animate-in">
                <h2 style={{ ...s.pageTitle, fontSize: '18px', marginBottom: '20px', textTransform: 'capitalize' }}>
                  Horarios — {format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}
                </h2>
                <div style={s.slotsGrid}>
                  {['🌅 Mañana', '☀️ Tarde'].map((label, idx) => (
                    <div key={label}>
                      <div style={s.periodoLabel}>{label}</div>
                      <div style={s.slots}>
                        {HORARIOS.filter(h => idx === 0 ? parseInt(h) < 12 : parseInt(h) >= 12).map(hora => {
                          const ocupado = isOcupado(selectedDay, hora)
                          return (
                            <button key={hora}
                              style={{ ...s.slot, ...(ocupado ? s.slotOcupado : s.slotLibre) }}
                              onClick={() => { if (!ocupado) { setSelectedHora(hora); setStep('confirmar') } }}
                              disabled={ocupado}>
                              <span style={s.slotHora}>{hora}</span>
                              <span style={{ fontSize: '12px' }}>{ocupado ? 'Ocupado' : 'Disponible'}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!selectedDay && (
              <div style={s.prompt}>
                <div style={{ fontSize: '48px' }}>📅</div>
                <div style={{ color: 'var(--text2)', fontSize: '16px' }}>Seleccioná un día para ver los horarios</div>
              </div>
            )}
          </div>
        )}

        {step === 'confirmar' && selectedDay && selectedHora && (
          <div className="animate-in" style={{ maxWidth: '520px' }}>
            <button onClick={() => setStep('calendario')} style={s.backBtn}>← Volver al calendario</button>
            <div style={s.confirmCard}>
              <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '20px' }}>Confirmá tu turno</h2>
              <div style={s.turnoResumen}>
                <div style={s.resumenItem}><span>📅 Fecha</span><strong style={{ textTransform: 'capitalize' }}>{format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}</strong></div>
                <div style={s.resumenItem}><span>🕐 Hora</span><strong>{selectedHora}</strong></div>
                <div style={s.resumenItem}><span>🏢 Empresa</span><strong>{session.empresa}</strong></div>
              </div>
              <form onSubmit={handleConfirmar} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={s.field}>
                  <label style={s.label}>Descripción de la mercadería *</label>
                  <input style={s.input} required placeholder="Ej: Cajas de electrónica, pallets de alimentos..."
                    value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Cantidad de bultos / pallets</label>
                  <input style={s.input} type="number" min="1" placeholder="Ej: 10"
                    value={form.bultos} onChange={e => setForm(f => ({ ...f, bultos: e.target.value }))} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Observaciones (opcional)</label>
                  <textarea style={{ ...s.input, minHeight: '80px', resize: 'vertical' }}
                    placeholder="Requiere montacargas, mercadería frágil, etc."
                    value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} />
                </div>
                <button type="submit" style={s.confirmBtn} disabled={loading}>
                  {loading ? 'Confirmando...' : '✓ Confirmar turno'}
                </button>
              </form>
            </div>
          </div>
        )}

        {step === 'exito' && selectedDay && selectedHora && (
          <div className="animate-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
            <div style={{ ...s.confirmCard, textAlign: 'center', maxWidth: '400px' }}>
              <div style={{ fontSize: '56px', marginBottom: '16px' }}>✅</div>
              <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px' }}>¡Turno confirmado!</h2>
              <p style={{ color: 'var(--text2)', lineHeight: '1.6', marginBottom: '24px' }}>
                Tu turno fue registrado para el<br />
                <strong style={{ textTransform: 'capitalize' }}>{format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}</strong> a las <strong>{selectedHora}</strong>
              </p>
              <button style={s.confirmBtn} onClick={() => { setStep('calendario'); setSelectedDay(null); setSelectedHora(null); setForm({ descripcion: '', bultos: '', observaciones: '' }) }}>
                Reservar otro turno
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

const s: Record<string, CSSProperties> = {
  wrapper: { display: 'flex', minHeight: '100vh' },
  sidebar: { width: '280px', background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '24px', flexShrink: 0 },
  sideTop: { marginBottom: '24px' },
  logoRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' },
  logoText: { fontWeight: '700', fontSize: '18px' },
  userCard: { display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--surface2)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' },
  avatar: { width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '15px', flexShrink: 0 },
  userName: { fontWeight: '600', fontSize: '14px' },
  userEmp: { color: 'var(--text2)', fontSize: '12px' },
  misTurnosSection: { flex: 1, overflow: 'auto' },
  sectionTitle: { color: 'var(--text2)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' },
  empty: { color: 'var(--text3)', fontSize: '13px', textAlign: 'center', padding: '20px 0' },
  turnoItem: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', borderRadius: 'var(--radius-sm)', background: 'var(--surface2)', marginBottom: '8px', fontSize: '13px' },
  turnoFecha: { color: 'var(--text2)', flex: 1, textTransform: 'capitalize' },
  turnoHora: { fontWeight: '600', fontFamily: 'var(--mono)' },
  estadoBadge: { fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: '600' },
  cancelBtn: { background: 'var(--red-light)', color: 'var(--red)', width: '20px', height: '20px', borderRadius: '50%', fontSize: '14px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoutBtn: { marginTop: '16px', background: 'none', color: 'var(--text3)', fontSize: '13px', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', width: '100%' },
  main: { flex: 1, padding: '40px', overflow: 'auto' },
  pageHeader: { marginBottom: '32px' },
  pageTitle: { fontSize: '28px', fontWeight: '700', marginBottom: '6px' },
  pageSubtitle: { color: 'var(--text2)', fontSize: '15px' },
  daysStrip: { display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '32px' },
  dayBtn: { flexShrink: 0, width: '72px', padding: '14px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer', position: 'relative' },
  dayBtnActive: { background: 'var(--accent-light)', borderColor: 'var(--accent)' },
  dayBtnFull: { opacity: 0.4 },
  dayName: { fontSize: '11px', color: 'var(--text2)', textTransform: 'capitalize' },
  dayNum: { fontSize: '22px', fontWeight: '700', lineHeight: '1' },
  dayMonth: { fontSize: '11px', color: 'var(--text2)', textTransform: 'capitalize' },
  todayDot: { position: 'absolute', bottom: '6px', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent)' },
  slotsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' },
  periodoLabel: { fontSize: '13px', fontWeight: '600', color: 'var(--text2)', marginBottom: '12px' },
  slots: { display: 'flex', flexDirection: 'column', gap: '8px' },
  slot: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid', cursor: 'pointer' },
  slotLibre: { background: 'var(--green-light)', borderColor: 'rgba(34,197,94,0.25)', color: 'var(--text)' },
  slotOcupado: { background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text3)', cursor: 'not-allowed' },
  slotHora: { fontFamily: 'var(--mono)', fontWeight: '600', fontSize: '15px' },
  prompt: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '12px' },
  backBtn: { background: 'none', color: 'var(--text2)', fontSize: '14px', marginBottom: '24px', padding: '0' },
  confirmCard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px' },
  turnoResumen: { background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: '16px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '10px' },
  resumenItem: { display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--text2)' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '500', color: 'var(--text2)' },
  input: { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', color: 'var(--text)', fontSize: '14px', width: '100%' },
  confirmBtn: { background: 'var(--accent)', color: 'white', fontWeight: '600', fontSize: '15px', padding: '14px', borderRadius: 'var(--radius-sm)', width: '100%' },
}
