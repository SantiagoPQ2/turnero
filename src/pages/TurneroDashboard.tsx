import { useState, useEffect, CSSProperties } from 'react'
import { supabase } from '../lib/supabase'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isToday, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { Perfil, Turno } from '../types'

type EstadoFilter = 'todos' | 'confirmado' | 'pendiente' | 'cancelado'
interface Props { perfil: Perfil }

export default function TurneroDashboard({ perfil }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [selectedTurno, setSelectedTurno] = useState<Turno | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<EstadoFilter>('todos')

  useEffect(() => { fetchTurnos() }, [currentMonth])

  const fetchTurnos = async () => {
    setLoading(true)
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
    const { data } = await supabase.from('z_turnos').select('*').gte('fecha', start).lte('fecha', end).order('fecha').order('hora')
    if (data) setTurnos(data as Turno[])
    setLoading(false)
  }

  const turnosDelDia = (fecha: Date) => {
    const f = format(fecha, 'yyyy-MM-dd')
    return turnos.filter(t => t.fecha === f && (filter === 'todos' || t.estado === filter))
  }

  const handleEstado = async (id: string, estado: Turno['estado']) => {
    await supabase.from('z_turnos').update({ estado }).eq('id', id)
    fetchTurnos()
    if (selectedTurno?.id === id) setSelectedTurno({ ...selectedTurno, estado })
  }

  const logout = () => supabase.auth.signOut()

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calDays: Date[] = []
  let d = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  while (d <= calEnd) { calDays.push(d); d = addDays(d, 1) }

  const stats = {
    total: turnos.length,
    confirmados: turnos.filter(t => t.estado === 'confirmado').length,
    pendientes: turnos.filter(t => t.estado === 'pendiente').length,
    cancelados: turnos.filter(t => t.estado === 'cancelado').length,
  }

  const evStyle = (e: string): CSSProperties => ({
    confirmado: { background: 'rgba(34,197,94,0.15)', color: '#86efac' },
    cancelado: { background: 'rgba(239,68,68,0.1)', color: '#fca5a5', textDecoration: 'line-through' },
    pendiente: { background: 'rgba(245,158,11,0.15)', color: '#fcd34d' },
  }[e] ?? { background: 'var(--surface2)', color: 'var(--text2)' })

  const badgeStyle = (e: string): CSSProperties => ({
    confirmado: { background: 'var(--green-light)', color: 'var(--green)' },
    cancelado: { background: 'var(--red-light)', color: 'var(--red)' },
    pendiente: { background: 'var(--yellow-light)', color: 'var(--yellow)' },
  }[e] ?? {})

  const dotC: Record<string, string> = { todos: 'var(--accent)', confirmado: 'var(--green)', pendiente: 'var(--yellow)', cancelado: 'var(--red)' }
  const turnosSel = turnosDelDia(selectedDay)

  return (
    <div style={s.wrapper}>
      <aside style={s.sidebar}>
        <div>
          <div style={s.logoRow}><span style={s.logoText}>📋 Turnero</span><span style={s.opBadge}>Operador</span></div>
          <div style={s.statsGrid}>
            <div style={s.statCard}><div style={s.statNum}>{stats.total}</div><div style={s.statLabel}>Este mes</div></div>
            <div style={{...s.statCard, background: 'var(--green-light)', borderColor: 'rgba(34,197,94,0.2)' }}><div style={{ ...s.statNum, color: 'var(--green)' }}>{stats.confirmados}</div><div style={s.statLabel}>Confirmados</div></div>
            <div style={{ ...s.statCard, background: 'var(--yellow-light)', borderColor: 'rgba(245,158,11,0.2)' }}><div style={{ ...s.statNum, color: 'var(--yellow)' }}>{stats.pendientes}</div><div style={s.statLabel}>Pendientes</div></div>
            <div style={{ ...s.statCard, background: 'var(--red-light)', borderColor: 'rgba(239,68,68,0.2)' }}><div style={{ ...s.statNum, color: 'var(--red)' }}>{stats.cancelados}</div><div style={s.statLabel}>Cancelados</div></div>
          </div>
          <div style={s.secLabel}>Filtrar</div>
          {('odos','confirmado','pendiente','cancelado'] as EstadoFilter[]).map(e => (
            <button key={e} style={{ ...s.fBtn, ...(filter === e ? s.fBtnA : {}) }} onClick={() => setFilter(e)}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotC[e], flexShrink: 0, display: 'inline-block' }} />
              {e.charAt(0).toUpperCase() + e.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={logout} style={s.logoutBtn}>Cerrar sesión</button>
      </aside>
      <main style={s.main}>
        <div style={s.calHead}>
          <button style={s.navBtn} onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>‹</button>
          <h1 style={s.calTitle}>{format(currentMonth, 'MMMM yyyy', { locale: es })}</h1>
          <button style={s.navBtn} onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>›</button>
          <button style={s.todayBtn} onClick={() => { setCurrentMonth(new Date()); setSelectedDay(new Date()) }}>Hoy</button>
        </div>
        <div style={s.dHeads}>{['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => <div key={d} style={s.dHead}>{d}</div>)}</div>
        <div style={s.calGrid}>
          {calDays.map((day, i) => {
            const dt = turnosDelDia(day)
            const isS = isSameDay(day, selectedDay)
            const td = isToday(day)
            const isCM = isSameMonth(day, currentMonth)
            return (
              <div key={i} style={{ ...s.cCell, ...(!isCM ? s.cCellO : {}), ...(isS ? s.cCellS : {}), ...(td ? s.cCellT : {}) }} onClick={() => setSelectedDay(day)}>
                <div style={{ ...s.cDayN, ...(td ? { color: 'var(--accent)' } : {}) }}>{format(day, 'd')}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {dt.slice(0, 3).map(t => (
                    <div key={t.id} style={{ ...s.cEvent, ...evStyle(t.estado) }} onClick={e => { e.stopPropagation(); setSelectedTurno(t); setSelectedDay(day) }}>
                      {t.hora} {t.hora_fin? `(→ ${t.hora_fin})`:''} &#x77; &#x73;{t.proveedor_empresa}
                    </div>
                  ))}
                  {dt.length > 3 && <div style={{ fontSize: '10px', color: 'var(--text3)', padding: '1px 5px' }}> +{dt.length - 3} más</div>}
                </div>
              </div>
            )
          })}
        </div>
      </main>
      <aside style={s.detailPanel}>
        <div style={s.detailHead}>
          <div style={s.detailDate}>{format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}</div>
          <div style={{ color: 'var(--text2)', fontSize: '12px' }}>{turnosSel.length} turno{turnosSel.length !== 1 ? 's' : ''}</div>
        </div>
        {loading && <div style={{ padding: '20px', color: 'var(--text2)', fontSize: '13px', textAlign: 'center' }}>Cargando...</div>}
        {!loading && turnosSel.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭 </div>
            <div style={{ color: 'var(--text3)', fontSize: '13px' }}>Sin turnos para este día</div>
          </div>
        )}
        {turnosSel.map(t => (
          <div key={t.id} style={{ ...s.tCard, ...(selectedTurno?.id === t.id ? s.tCardA : {}) }} onClick={() => setSelectedTurno(selectedTurno?.id === t.id ? null : t)}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: '600', fontSize: '15px' }}>{t.hora}{t.hora_fin ? ` → ${t.hora_fin}` : ''}</span>
              <span style={{ ...s.badge, ...badgeStyle(t.estado) }}>{t.estado}</span>
            </div>
            <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '2px' }}>{t.proveedor_empresa}</div>
            <div style={{ color: 'var(--text2)', fontSize: '12px' }}>{t.proveedor_nombre}</div>
            {selectedTurno?.id === t.id && (
              <div style={s.tDetail} className="animate-in">
                <div style={s.dRow}><span>�$Tipo</span><strong>{t.tipo_recepcion}</strong></div>
                {t.bultos && <div style={s.dRow}><span>📬 Pallets</span><strong>{t.bultos}</strong></div>}
                {t.tiempo_descarga && <div style={s.dRow}><span>⑳ Descarga</span><strong>{t.tiempo_descarga} min → {t.hora_fin}</strong></div>}
                {t.observaciones && <div style={s.dRow}><span>💬 Obs.</span><strong>{t.observaciones}</strong></div>}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {t.estado !== 'confirmado' && <button style={s.btnC} onClick={e => { e.stopPropagation(); handleEstado(t.id, 'confirmado') }}>✓ Confirmar</button>}
                  {t.estado !== 'pendiente' && <button style={s.btnP} onClick={e => { e.stopPropagation(); handleEstado(t.id, 'pendiente') }}>⏳ Pendiente</button>}
                  {t.estado !== 'cancelado' && <button style={s.btnX} onClick={e => { e.stopPropagation(); handleEstado(t.id, 'cancelado') }}>✕ Cancelar</button>}
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
  opBadge: { background: 'var(--accent-light)', color: 'var(--accent)', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px' },
  statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' },
  statCard: { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px', textAlign: 'center' },
  statNum: { fontSize: '22px', fontWeight: '700', lineHeight: '1' },
  statLabel: { fontSize: '11px', color: 'var(--text2)', marginTop: '4px' },
  secLabel: { fontSize: '11px', fontWeight: '600', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' },
  fBtn: { display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'none', color: 'var(--text2)', fontSize: '13px', marginBottom: '4px', border: 'none', cursor: 'pointer' },
  fBtnA: { background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' },
  logoutBtn: { background: 'none', color: 'var(--text3)', fontSize: '13px', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', width: '100%', cursor: 'pointer' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '20px' },
  calHead: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' },
  calTitle: { fontSize: '20px', fontWeight: '700', textTransform: 'capitalize', flex: 1 },
  navBtn: { background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', width: '32px', height: '32px', borderRadius: '8px', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  todayBtn: { background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '13px', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer' },
  dHeads: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' },
  dHead: { textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--text3)', padding: '4px 0', textTransform: 'uppercase' },
  calGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1, gap: '2px', overflow: 'hidden' },
  cCell: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', cursor: 'pointer', overflow: 'hidden', minHeight: '80px' },
  cCellO: { opacity: 0.35 },
  cCellS: { borderColor: 'var(--accent)', background: 'var(--accent-light)' },
  cCellT: { borderColor: 'var(--accent)' },
  cDayN: { fontSize: '13px', fontWeight: '600', color: 'var(--text2)', marginBottom: '4px' },
  cEvent: { fontSize: '10px', padding: '2px 5px', borderRadius: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' },
  detailPanel: { width: '280px', background: 'var(--surface)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto' },
  detailHead: { padding: '20px 20px 16px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 },
  detailDate: { fontWeight: '600', fontSize: '14px', textTransform: 'capitalize', marginBottom: '2px' },
  tCard: { margin: '8px', borderRadius: 'var(--radius-sm)', background: 'var(--surface2)', border: '1px solid var(--border)', padding: '14px', cursor: 'pointer' },
  tCardA: { borderColor: 'var(--accent)' },
  badge: { fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: '600' },
  tDetail: { marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' },
  dRow: { display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px', color: 'var(--text2)' },
  btnC: { flex: 1, padding: '6px', borderRadius: '6px', background: 'var(--green-light)', color: 'var(--green)', fontSize: '12px', fontWeight: '600', border: 'none', cursor: 'pointer' },
  btnP: { flex: 1, padding: '6px', borderRadius: '6px', background: 'var(--yellow-light)', color: 'var(--yellow)', fontSize: '12px', fontWeight: '600', border: 'none', cursor: 'pointer' },
  btnX: { flex: 1, padding: '6px', borderRadius: '6px', background: 'var(--red-light)', color: 'var(--red)', fontSize: '12px', fontWeight: '600', border: 'none', cursor: 'pointer' },
}
