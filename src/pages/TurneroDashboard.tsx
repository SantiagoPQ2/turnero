import { useState, useEffect, CSSProperties } from 'react'
import { supabase } from '../lib/supabase'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isToday, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { Session, Turno } from '../types'

type EstadoFilter = 'todos' | 'confirmado' | 'pendiente' | 'cancelado'

interface Props { session: Session; onLogout: () => void }

export default function TurneroDashboard({ onLogout }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [selectedTurno, setSelectedTurno] = useState<Turno | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterEstado, setFilterEstado] = useState<EstadoFilter>('todos')

  useEffect(() => { fetchTurnos() }, [currentMonth])

  const fetchTurnos = async () => {
    setLoading(true)
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
    const { data } = await supabase.from('turnos').select('*').gte('fecha', start).lte('fecha', end).order('fecha').order('hora')
    if (data) setTurnos(data as Turno[])
    setLoading(false)
  }

  const turnosDelDia = (fecha: Date) => {
    const f = format(fecha, 'yyyy-MM-dd')
    return turnos.filter(t => t.fecha === f && (filterEstado === 'todos' || t.estado === filterEstado))
  }

  const turnosSelectedDay = turnosDelDia(selectedDay)

  const handleEstado = async (id: string, estado: Turno['estado']) => {
    await supabase.from('turnos').update({ estado }).eq('id', id)
    fetchTurnos()
    if (selectedTurno?.id === id) setSelectedTurno({ ...selectedTurno, estado })
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const calDays: Date[] = []
  let d = calStart
  while (d <= calEnd) { calDays.push(d); d = addDays(d, 1) }

  const stats = {
    total: turnos.length,
    confirmados: turnos.filter(t => t.estado === 'confirmado').length,
    cancelados: turnos.filter(t => t.estado === 'cancelado').length,
    pendientes: turnos.filter(t => t.estado === 'pendiente').length,
  }

  const eventStyle = (e: string): CSSProperties => ({
    confirmado: { background: 'rgba(34,197,94,0.15)', color: '#86efac' },
    cancelado: { background: 'rgba(239,68,68,0.1)', color: '#fca5a5', textDecoration: 'line-through' },
    pendiente: { background: 'rgba(245,158,11,0.15)', color: '#fcd34d' },
  }[e] ?? { background: 'var(--surface2)', color: 'var(--text2)' })

  const badgeStyle = (e: string): CSSProperties => ({
    confirmado: { background: 'var(--green-light)', color: 'var(--green)' },
    cancelado: { background: 'var(--red-light)', color: 'var(--red)' },
    pendiente: { background: 'var(--yellow-light)', color: 'var(--yellow)' },
  }[e] ?? {})

  const dotColor: Record<EstadoFilter, string> = { todos: 'var(--accent)', confirmado: 'var(--green)', pendiente: 'var(--yellow)', cancelado: 'var(--red)' }

  return (
    <div style={s.wrapper}>
      <aside style={s.sidebar}>
        <div>
          <div style={s.logoRow}>
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="var(--accent)"/>
              <rect x="8" y="10" width="16" height="2" rx="1" fill="white"/>
              <rect x="8" y="15" width="16" height="2" rx="1" fill="white"/>
              <rect x="8" y="20" width="10" height="2" rx="1" fill="white"/>
            </svg>
            <span style={s.logoText}>Turnero</span>
            <span style={s.opBadge}>Operador</span>
          </div>
          <div style={s.statsGrid}>
            <div style={s.statCard}><div style={s.statNum}>{stats.total}</div><div style={s.statLabel}>Este mes</div></div>
            <div style={{ ...s.statCard, background: 'var(--green-light)', borderColor: 'rgba(34,197,94,0.2)' }}><div style={{ ...s.statNum, color: 'var(--green)' }}>{stats.confirmados}</div><div style={s.statLabel}>Confirmados</div></div>
            <div style={{ ...s.statCard, background: 'var(--yellow-light)', borderColor: 'rgba(245,158,11,0.2)' }}><div style={{ ...s.statNum, color: 'var(--yellow)' }}>{stats.pendientes}</div><div style={s.statLabel}>Pendientes</div></div>
            <div style={{ ...s.statCard, background: 'var(--red-light)', borderColor: 'rgba(239,68,68,0.2)' }}><div style={{ ...s.statNum, color: 'var(--red)' }}>{stats.cancelados}</div><div style={s.statLabel}>Cancelados</div></div>
          </div>
          <div style={s.sectionLabel}>Filtrar por estado</div>
          {(['todos','confirmado','pendiente','cancelado'] as EstadoFilter[]).map(e => (
            <button key={e} style={{ ...s.filterBtn, ...(filterEstado === e ? s.filterBtnActive : {}) }} onClick={() => setFilterEstado(e)}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor[e], flexShrink: 0 }} />
              {e.charAt(0).toUpperCase() + e.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={onLogout} style={s.logoutBtn}>Cerrar sesión</button>
      </aside>

      <main style={s.main}>
        <div style={s.calHeader}>
          <button style={s.navBtn} onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>‹</button>
          <h1 style={s.calTitle}>{format(currentMonth, 'MMMM yyyy', { locale: es })}</h1>
          <button style={s.navBtn} onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>›</button>
          <button style={s.todayBtn} onClick={() => { setCurrentMonth(new Date()); setSelectedDay(new Date()) }}>Hoy</button>
        </div>
        <div style={s.dayHeaders}>
          {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(day => (
            <div key={day} style={s.dayHeader}>{day}</div>
          ))}
        </div>
        <div style={s.calGrid}>
          {calDays.map((day, i) => {
            const dt = turnosDelDia(day)
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isSelected = isSameDay(day, selectedDay)
            const today = isToday(day)
            return (
              <div key={i} style={{ ...s.calCell, ...(!isCurrentMonth ? s.calCellOther : {}), ...(isSelected ? s.calCellSelected : {}), ...(today ? s.calCellToday : {}) }} onClick={() => setSelectedDay(day)}>
                <div style={{ ...s.calDayNum, ...(today ? { color: 'var(--accent)' } : {}) }}>{format(day, 'd')}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {dt.slice(0, 3).map(t => (
                    <div key={t.id} style={{ ...s.calEvent, ...eventStyle(t.estado) }}
                      onClick={e => { e.stopPropagation(); setSelectedTurno(t); setSelectedDay(day) }}>
                      {t.hora} · {t.proveedor_empresa}
                    </div>
                  ))}
                  {dt.length > 3 && <div style={{ fontSize: '10px', color: 'var(--text3)', padding: '1px 5px' }}>+{dt.length - 3} más</div>}
                </div>
              </div>
            )
          })}
        </div>
      </main>

      <aside style={s.detailPanel}>
        <div style={s.detailHeader}>
          <div style={{ fontWeight: '600', fontSize: '14px', textTransform: 'capitalize', marginBottom: '2px' }}>{format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}</div>
          <div style={{ color: 'var(--text2)', fontSize: '12px' }}>{turnosSelectedDay.length} turno{turnosSelectedDay.length !== 1 ? 's' : ''}</div>
        </div>
        {loading && <div style={{ padding: '20px', color: 'var(--text2)', fontSize: '13px', textAlign: 'center' }}>Cargando...</div>}
        {!loading && turnosSelectedDay.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
            <div style={{ color: 'var(--text3)', fontSize: '13px' }}>Sin turnos para este día</div>
          </div>
        )}
        {turnosSelectedDay.map(t => (
          <div key={t.id} style={{ ...s.turnoCard, ...(selectedTurno?.id === t.id ? s.turnoCardActive : {}) }}
            onClick={() => setSelectedTurno(selectedTurno?.id === t.id ? null : t)}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: '600', fontSize: '15px' }}>{t.hora}</span>
              <span style={{ ...s.estadoBadge, ...badgeStyle(t.estado) }}>{t.estado}</span>
            </div>
            <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '2px' }}>{t.proveedor_empresa}</div>
            <div style={{ color: 'var(--text2)', fontSize: '12px' }}>{t.proveedor_nombre}</div>
            {selectedTurno?.id === t.id && (
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }} className="animate-in">
                {t.descripcion && <div style={s.detailRow}><span>📦 Mercadería</span><strong>{t.descripcion}</strong></div>}
                {t.bultos && <div style={s.detailRow}><span>📬 Bultos</span><strong>{t.bultos}</strong></div>}
                {t.observaciones && <div style={s.detailRow}><span>💬 Obs.</span><strong>{t.observaciones}</strong></div>}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {t.estado !== 'confirmado' && <button style={s.btnConfirm} onClick={e => { e.stopPropagation(); handleEstado(t.id, 'confirmado') }}>✓ Confirmar</button>}
                  {t.estado !== 'pendiente' && <button style={s.btnPending} onClick={e => { e.stopPropagation(); handleEstado(t.id, 'pendiente') }}>⏳ Pendiente</button>}
                  {t.estado !== 'cancelado' && <button style={s.btnCancel} onClick={e => { e.stopPropagation(); handleEstado(t.id, 'cancelado') }}>✕ Cancelar</button>}
                </div>
              </div>
            )}
          </div>
        ))}
      </aside>
    </div>
  )
}

const s: Record<string, CSSProperties> = {
  wrapper: { display: 'flex', height: '100vh', overflow: 'hidden' },
  sidebar: { width: '240px', background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px', flexShrink: 0, overflowY: 'auto' },
  logoRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' },
  logoText: { fontWeight: '700', fontSize: '16px', flex: 1 },
  opBadge: { background: 'var(--accent-light)', color: 'var(--accent)', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' },
  statCard: { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px', textAlign: 'center' },
  statNum: { fontSize: '22px', fontWeight: '700', lineHeight: '1' },
  statLabel: { fontSize: '11px', color: 'var(--text2)', marginTop: '4px' },
  sectionLabel: { fontSize: '11px', fontWeight: '600', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' },
  filterBtn: { display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'none', color: 'var(--text2)', fontSize: '13px', marginBottom: '4px' },
  filterBtnActive: { background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' },
  logoutBtn: { background: 'none', color: 'var(--text3)', fontSize: '13px', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', width: '100%' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '20px' },
  calHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' },
  calTitle: { fontSize: '20px', fontWeight: '700', textTransform: 'capitalize', flex: 1 },
  navBtn: { background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', width: '32px', height: '32px', borderRadius: '8px', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  todayBtn: { background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '13px', padding: '6px 14px', borderRadius: '8px' },
  dayHeaders: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' },
  dayHeader: { textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--text3)', padding: '4px 0', textTransform: 'uppercase' },
  calGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1, gap: '2px', overflow: 'hidden' },
  calCell: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', cursor: 'pointer', overflow: 'hidden', minHeight: '80px' },
  calCellOther: { opacity: 0.35 },
  calCellSelected: { borderColor: 'var(--accent)', background: 'var(--accent-light)' },
  calCellToday: { borderColor: 'var(--accent)' },
  calDayNum: { fontSize: '13px', fontWeight: '600', color: 'var(--text2)', marginBottom: '4px' },
  calEvent: { fontSize: '10px', padding: '2px 5px', borderRadius: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' },
  detailPanel: { width: '280px', background: 'var(--surface)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto' },
  detailHeader: { padding: '20px 20px 16px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 },
  turnoCard: { margin: '8px', borderRadius: 'var(--radius-sm)', background: 'var(--surface2)', border: '1px solid var(--border)', padding: '14px', cursor: 'pointer' },
  turnoCardActive: { borderColor: 'var(--accent)' },
  estadoBadge: { fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: '600' },
  detailRow: { display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px', color: 'var(--text2)' },
  btnConfirm: { flex: 1, padding: '6px', borderRadius: '6px', background: 'var(--green-light)', color: 'var(--green)', fontSize: '12px', fontWeight: '600' },
  btnPending: { flex: 1, padding: '6px', borderRadius: '6px', background: 'var(--yellow-light)', color: 'var(--yellow)', fontSize: '12px', fontWeight: '600' },
  btnCancel: { flex: 1, padding: '6px', borderRadius: '6px', background: 'var(--red-light)', color: 'var(--red)', fontSize: '12px', fontWeight: '600' },
}
