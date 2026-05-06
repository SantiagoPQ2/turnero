import { useState, useEffect, CSSProperties } from 'react'
import { supabase } from '../lib/supabase'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isToday, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { Perfil, Turno, DiaBloqueado, SLOTS_FRIO, SLOTS_SECO } from '../types'

type EstadoFilter = 'todos' | 'confirmado' | 'pendiente' | 'cancelado'
type CategoriaFilter = 'todos' | 'frio' | 'seco'
interface Props { perfil: Perfil; onLogout?: () => void }

interface NuevoTurnoForm {
  proveedor_nombre: string
  categoria: 'frio' | 'seco'
  slot_hora: string
  slot_hora_fin: string
  slot_duracion: number
  tipo_recepcion: 'STOCK' | 'CROSSDOCKING'
  bultos: string
  telefono: string
  observaciones: string
}

export default function TurneroDashboard({ perfil, onLogout }: Props) {
  const isView = perfil.rol === 'view'
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [diasBloqueados, setDiasBloqueados] = useState<DiaBloqueado[]>([])
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [selectedTurno, setSelectedTurno] = useState<Turno | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<EstadoFilter>('todos')
  const [categoriaFilter, setCategoriaFilter] = useState<CategoriaFilter>('todos')
  const [showBloqueo, setShowBloqueo] = useState(false)
  const [motivoBloqueo, setMotivoBloqueo] = useState('')
  const [showNuevoTurno, setShowNuevoTurno] = useState(false)
  const [nuevoTurno, setNuevoTurno] = useState<NuevoTurnoForm>({
    proveedor_nombre: '',
    categoria: 'frio',
    slot_hora: '',
    slot_hora_fin: '',
    slot_duracion: 40,
    tipo_recepcion: 'STOCK',
    bultos: '',
    telefono: '',
    observaciones: '',
  })
  const [savingTurno, setSavingTurno] = useState(false)

  useEffect(() => { fetchAll() }, [currentMonth])

  const fetchAll = async () => {
    setLoading(true)
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
    const { data } = await supabase.from('z_turnos').select('*').gte('fecha', start).lte('fecha', end).order('fecha').order('hora')
    if (data) setTurnos(data as Turno[])
    const { data: bloq } = await supabase.from('z_dias_bloqueados').select('*')
    if (bloq) setDiasBloqueados(bloq as DiaBloqueado[])
    setLoading(false)
  }

  const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6
  const getRegistroBloq = (d: Date) => diasBloqueados.find(b => b.fecha === format(d, 'yyyy-MM-dd'))
  const isBloqueado = (d: Date): boolean => {
    const reg = getRegistroBloq(d)
    if (isWeekend(d)) return !reg || reg.motivo !== '__DESBLOQUEADO__'
    return !!reg
  }

  const turnosDelDia = (fecha: Date) => {
    const f = format(fecha, 'yyyy-MM-dd')
    return turnos.filter(t =>
      t.fecha === f &&
      (filter === 'todos' || t.estado === filter) &&
      (categoriaFilter === 'todos' || t.categoria === categoriaFilter)
    )
  }

  const slotsDelDia = () => {
    const slots = nuevoTurno.categoria === 'frio' ? SLOTS_FRIO : SLOTS_SECO
    const fecha = format(selectedDay, 'yyyy-MM-dd')
    return slots.map(s => ({
      ...s,
      ocupado: turnos.some(t => t.fecha === fecha && t.hora === s.hora && t.estado !== 'cancelado')
    }))
  }

  const handleEstado = async (id: string, estado: Turno['estado']) => {
    if (isView) return
    await supabase.from('z_turnos').update({ estado }).eq('id', id)
    fetchAll()
    if (selectedTurno?.id === id) setSelectedTurno({ ...selectedTurno, estado })
  }

  const handleToggleBloqueo = async () => {
    if (isView) return
    const fecha = format(selectedDay, 'yyyy-MM-dd')
    const reg = getRegistroBloq(selectedDay)
    const bloqueadoActual = isBloqueado(selectedDay)
    if (bloqueadoActual) {
      if (isWeekend(selectedDay)) {
        if (reg) await supabase.from('z_dias_bloqueados').update({ motivo: '__DESBLOQUEADO__' }).eq('fecha', fecha)
        else await supabase.from('z_dias_bloqueados').insert({ fecha, motivo: '__DESBLOQUEADO__' })
      } else {
        await supabase.from('z_dias_bloqueados').delete().eq('fecha', fecha)
      }
    } else {
      if (isWeekend(selectedDay) && reg?.motivo === '__DESBLOQUEADO__') {
        await supabase.from('z_dias_bloqueados').update({ motivo: motivoBloqueo || null }).eq('fecha', fecha)
      } else {
        await supabase.from('z_dias_bloqueados').insert({ fecha, motivo: motivoBloqueo || null })
      }
    }
    setMotivoBloqueo(''); setShowBloqueo(false); fetchAll()
  }

  const handleCrearTurno = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevoTurno.slot_hora) return
    setSavingTurno(true)
    await supabase.from('z_turnos').insert({
      fecha: format(selectedDay, 'yyyy-MM-dd'),
      hora: nuevoTurno.slot_hora,
      hora_fin: nuevoTurno.slot_hora_fin,
      proveedor_id: perfil.id,
      proveedor_nombre: nuevoTurno.proveedor_nombre,
      proveedor_empresa: nuevoTurno.proveedor_nombre,
      tipo_recepcion: nuevoTurno.tipo_recepcion,
      bultos: parseInt(nuevoTurno.bultos) || null,
      tiempo_descarga: nuevoTurno.slot_duracion,
      telefono: nuevoTurno.telefono,
      observaciones: nuevoTurno.observaciones,
      estado: 'confirmado',
      categoria: nuevoTurno.categoria,
    })
    setSavingTurno(false)
    setShowNuevoTurno(false)
    setNuevoTurno({ proveedor_nombre: '', categoria: 'frio', slot_hora: '', slot_hora_fin: '', slot_duracion: 40, tipo_recepcion: 'STOCK', bultos: '', telefono: '', observaciones: '' })
    fetchAll()
  }

  const logout = () => onLogout ? onLogout() : (window.location.href = '/')

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

  const evStyle = (t: Turno): CSSProperties => {
    if (t.estado === 'cancelado') return { background: 'rgba(239,68,68,0.1)', color: '#fca5a5', textDecoration: 'line-through' }
    if (t.estado === 'pendiente') return { background: 'rgba(245,158,11,0.15)', color: '#fcd34d' }
    if (t.categoria === 'frio') return { background: 'rgba(59,130,246,0.18)', color: '#93c5fd' }
    return { background: 'rgba(245,158,11,0.18)', color: '#fcd34d' }
  }

  const badgeStyle = (e: string): CSSProperties => ({
    confirmado: { background: 'var(--green-light)', color: 'var(--green)' },
    cancelado: { background: 'var(--red-light)', color: 'var(--red)' },
    pendiente: { background: 'var(--yellow-light)', color: 'var(--yellow)' },
  }[e] ?? {})

  const dotC: Record<string, string> = { todos: 'var(--text2)', confirmado: 'var(--green)', pendiente: 'var(--yellow)', cancelado: 'var(--red)' }
  const turnosSel = turnosDelDia(selectedDay)
  const selectedBloq = isBloqueado(selectedDay)
  const selectedWeekend = isWeekend(selectedDay)
  const selectedReg = getRegistroBloq(selectedDay)
  const motivoVisible = selectedReg?.motivo && selectedReg.motivo !== '__DESBLOQUEADO__' ? selectedReg.motivo : null

  return (
    <div style={s.wrapper}>
      <aside style={s.sidebar}>
        <div>
          <div style={s.logoRow}>
            <span style={s.logoText}>📋 Turnero</span>
            <span style={{ ...s.rolBadge, ...(isView ? s.rolBadgeView : {}) }}>
              {isView ? '👁 Vista' : 'Operador'}
            </span>
          </div>
          <div style={s.statsGrid}>
            <div style={s.statCard}><div style={s.statNum}>{stats.total}</div><div style={s.statLabel}>Este mes</div></div>
            <div style={{ ...s.statCard, background: 'var(--green-light)', borderColor: 'rgba(34,197,94,0.2)' }}><div style={{ ...s.statNum, color: 'var(--green)' }}>{stats.confirmados}</div><div style={s.statLabel}>Confirmados</div></div>
            <div style={{ ...s.statCard, background: 'var(--yellow-light)', borderColor: 'rgba(245,158,11,0.2)' }}><div style={{ ...s.statNum, color: 'var(--yellow)' }}>{stats.pendientes}</div><div style={s.statLabel}>Pendientes</div></div>
            <div style={{ ...s.statCard, background: 'var(--red-light)', borderColor: 'rgba(239,68,68,0.2)' }}><div style={{ ...s.statNum, color: 'var(--red)' }}>{stats.cancelados}</div><div style={s.statLabel}>Cancelados</div></div>
          </div>
          <div style={s.secLabel}>Categoría</div>
          {(['todos', 'frio', 'seco'] as CategoriaFilter[]).map(c => (
            <button key={c} style={{ ...s.fBtn, ...(categoriaFilter === c ? s.fBtnA : {}) }} onClick={() => setCategoriaFilter(c)}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block', flexShrink: 0, background: c === 'frio' ? '#3b82f6' : c === 'seco' ? '#f59e0b' : 'var(--text3)' }} />
              {c === 'todos' ? 'Todos' : c === 'frio' ? '❄️ Frío' : '☀️ Seco'}
            </button>
          ))}
          <div style={{ ...s.secLabel, marginTop: '12px' }}>Estado</div>
          {(['todos', 'confirmado', 'pendiente', 'cancelado'] as EstadoFilter[]).map(e => (
            <button key={e} style={{ ...s.fBtn, ...(filter === e ? s.fBtnA : {}) }} onClick={() => setFilter(e)}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotC[e], display: 'inline-block', flexShrink: 0 }} />
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
        <div style={s.dHeads}>{['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => <div key={day} style={s.dHead}>{day}</div>)}</div>
        <div style={s.calGrid}>
          {calDays.map((day, i) => {
            const dt = turnosDelDia(day)
            const isS = isSameDay(day, selectedDay)
            const td = isToday(day)
            const isCM = isSameMonth(day, currentMonth)
            const bloq = isBloqueado(day)
            const weekend = isWeekend(day)
            const desbloqueadoManual = weekend && !bloq
            return (
              <div key={i} style={{ ...s.cCell, ...(!isCM ? s.cCellO : {}), ...(isS ? s.cCellS : {}), ...(td && !isS ? s.cCellT : {}), ...(bloq ? s.cCellBloq : {}) }} onClick={() => { setSelectedDay(day); setShowNuevoTurno(false) }}>
                <div style={{ ...s.cDayN, ...(td ? { color: 'var(--accent)' } : bloq ? { color: 'var(--text3)' } : {}) }}>
                  {format(day, 'd')}
                  {bloq && !weekend && <span style={{ fontSize: '9px', marginLeft: '3px', color: 'var(--red)' }}>🔒</span>}
                  {bloq && weekend && <span style={{ fontSize: '9px', marginLeft: '3px', color: 'var(--text3)' }}>✕</span>}
                  {desbloqueadoManual && <span style={{ fontSize: '9px', marginLeft: '3px', color: 'var(--green)' }}>✓</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {dt.slice(0, 3).map(t => (
                    <div key={t.id} style={{ ...s.cEvent, ...evStyle(t) }} onClick={e => { e.stopPropagation(); setSelectedTurno(t); setSelectedDay(day) }}>
                      {t.hora} {t.proveedor_empresa}
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
        <div style={s.detailHead}>
          <div style={s.detailDate}>{format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}</div>
          <div style={{ color: 'var(--text2)', fontSize: '12px' }}>{turnosSel.length} turno{turnosSel.length !== 1 ? 's' : ''}</div>
        </div>

        {/* Acciones del operador */}
        {!isView && (
          <div style={{ padding: '10px 12px 6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Botón nuevo turno */}
            {!selectedBloq && (
              <button style={{ ...s.btnNuevoTurno, ...(showNuevoTurno ? s.btnNuevoTurnoActive : {}) }}
                onClick={() => setShowNuevoTurno(!showNuevoTurno)}>
                {showNuevoTurno ? '✕ Cancelar' : '+ Agregar turno'}
              </button>
            )}
            {/* Bloqueo */}
            {selectedBloq ? (
              <button style={s.btnDesbloquear} onClick={handleToggleBloqueo}>
                {selectedWeekend ? `✓ Habilitar este ${selectedDay.getDay() === 6 ? 'sábado' : 'domingo'}` : '🔓 Desbloquear'}
              </button>
            ) : (
              selectedWeekend ? (
                <button style={s.btnBloquearShow} onClick={handleToggleBloqueo}>
                  🔒 Bloquear este {selectedDay.getDay() === 6 ? 'sábado' : 'domingo'}
                </button>
              ) : (
                showBloqueo ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <input style={s.inputSmall} placeholder="Motivo (opcional)" value={motivoBloqueo} onChange={e => setMotivoBloqueo(e.target.value)} />
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button style={s.btnBloquear} onClick={handleToggleBloqueo}>🔒 Confirmar</button>
                      <button style={s.btnCancelar} onClick={() => { setShowBloqueo(false); setMotivoBloqueo('') }}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <button style={s.btnBloquearShow} onClick={() => setShowBloqueo(true)}>🔒 Bloquear este día</button>
                )
              )
            )}
          </div>
        )}

        {/* Formulario nuevo turno */}
        {showNuevoTurno && !isView && (
          <form onSubmit={handleCrearTurno} style={s.nuevoTurnoForm} className="animate-in">
            <div style={s.ntTitle}>Nuevo turno — {format(selectedDay, "d 'de' MMM", { locale: es })}</div>

            <div style={s.ntField}>
              <label style={s.ntLabel}>Proveedor *</label>
              <input style={s.ntInput} required placeholder="Nombre del proveedor"
                value={nuevoTurno.proveedor_nombre} onChange={e => setNuevoTurno(f => ({ ...f, proveedor_nombre: e.target.value }))} />
            </div>

            <div style={s.ntField}>
              <label style={s.ntLabel}>Categoría</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['frio', 'seco'] as const).map(c => (
                  <button key={c} type="button"
                    style={{ ...s.ntToggle, ...(nuevoTurno.categoria === c ? (c === 'frio' ? s.ntToggleFrio : s.ntToggleSeco) : {}) }}
                    onClick={() => setNuevoTurno(f => ({ ...f, categoria: c, slot_hora: '', slot_hora_fin: '', slot_duracion: c === 'frio' ? 40 : 90 }))}>
                    {c === 'frio' ? '❄️ Frío' : '☀️ Seco'}
                  </button>
                ))}
              </div>
            </div>

            <div style={s.ntField}>
              <label style={s.ntLabel}>Horario *</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {slotsDelDia().map(slot => (
                  <button key={slot.hora} type="button"
                    style={{ ...s.ntSlot, ...(nuevoTurno.slot_hora === slot.hora ? s.ntSlotSel : slot.ocupado ? s.ntSlotOcup : s.ntSlotLibre) }}
                    disabled={slot.ocupado}
                    onClick={() => setNuevoTurno(f => ({ ...f, slot_hora: slot.hora, slot_hora_fin: slot.hora_fin, slot_duracion: slot.duracion }))}>
                    {slot.hora} → {slot.hora_fin}
                    {slot.ocupado && <span style={{ marginLeft: '6px', fontSize: '10px' }}>Ocupado</span>}
                  </button>
                ))}
              </div>
            </div>

            <div style={s.ntField}>
              <label style={s.ntLabel}>Tipo recepción</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['STOCK', 'CROSSDOCKING'] as const).map(t => (
                  <button key={t} type="button"
                    style={{ ...s.ntToggle, ...(nuevoTurno.tipo_recepcion === t ? s.ntToggleActive : {}) }}
                    onClick={() => setNuevoTurno(f => ({ ...f, tipo_recepcion: t }))}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div style={s.ntField}>
              <label style={s.ntLabel}>Pallets</label>
              <input style={s.ntInput} type="number" min="0" placeholder="Ej: 10"
                value={nuevoTurno.bultos} onChange={e => setNuevoTurno(f => ({ ...f, bultos: e.target.value }))} />
            </div>

            <div style={s.ntField}>
              <label style={s.ntLabel}>Teléfono</label>
              <input style={s.ntInput} type="tel" placeholder="Ej: 1123456789"
                value={nuevoTurno.telefono} onChange={e => setNuevoTurno(f => ({ ...f, telefono: e.target.value }))} />
            </div>

            <div style={s.ntField}>
              <label style={s.ntLabel}>Observaciones</label>
              <textarea style={{ ...s.ntInput, minHeight: '56px', resize: 'vertical' }}
                placeholder="Opcional..."
                value={nuevoTurno.observaciones} onChange={e => setNuevoTurno(f => ({ ...f, observaciones: e.target.value }))} />
            </div>

            <button type="submit" style={s.ntSubmit} disabled={savingTurno || !nuevoTurno.slot_hora}>
              {savingTurno ? 'Guardando...' : '✓ Confirmar turno'}
            </button>
          </form>
        )}

        {/* Info bloqueado */}
        {selectedBloq && (
          <div style={{ padding: '0 12px 6px', fontSize: '12px', color: 'var(--text3)', fontStyle: 'italic' }}>
            {selectedWeekend ? 'Fin de semana' : 'Día bloqueado'}
            {motivoVisible && ` — "${motivoVisible}"`}
          </div>
        )}

        {isView && (
          <div style={{ padding: '6px 12px', fontSize: '11px', color: '#c084fc', background: 'rgba(192,132,252,0.08)', margin: '8px', borderRadius: '6px', textAlign: 'center' }}>
            👁 Modo solo vista
          </div>
        )}

        {loading && <div style={{ padding: '24px', color: 'var(--text2)', fontSize: '13px', textAlign: 'center' }}>Cargando...</div>}

        {!loading && turnosSel.length === 0 && !showNuevoTurno && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', gap: '8px' }}>
            <div style={{ fontSize: '32px' }}>{selectedBloq ? '🔒' : '📭'}</div>
            <div style={{ color: 'var(--text3)', fontSize: '13px', textAlign: 'center' }}>
              {selectedBloq ? (selectedWeekend ? 'Fin de semana' : 'Día bloqueado') : 'Sin turnos para este día'}
            </div>
          </div>
        )}

        {turnosSel.map(t => (
          <div key={t.id}
            style={{ ...s.tCard, ...(selectedTurno?.id === t.id ? s.tCardA : {}), borderLeft: `3px solid ${t.categoria === 'frio' ? '#3b82f6' : '#f59e0b'}` }}
            onClick={() => setSelectedTurno(selectedTurno?.id === t.id ? null : t)}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: '700', fontSize: '13px' }}>{t.hora} → {t.hora_fin}</span>
              <span style={{ ...s.badge, ...badgeStyle(t.estado) }}>{t.estado}</span>
            </div>
            <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '1px' }}>{t.proveedor_empresa}</div>
            <div style={{ color: 'var(--text2)', fontSize: '12px' }}>{t.proveedor_nombre}</div>
            {t.telefono && <div style={{ color: 'var(--text2)', fontSize: '12px' }}>📞 {t.telefono}</div>}
            {selectedTurno?.id === t.id && (
              <div style={s.tDetail} className="animate-in">
                <div style={s.dRow}><span>📦 Tipo</span><strong>{t.tipo_recepcion}</strong></div>
                {t.bultos != null && <div style={s.dRow}><span>🏗 Pallets</span><strong>{t.bultos}</strong></div>}
                {t.observaciones && <div style={s.dRow}><span>💬 Obs.</span><strong>{t.observaciones}</strong></div>}
                {!isView ? (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {t.estado !== 'confirmado' && <button style={s.btnC} onClick={e => { e.stopPropagation(); handleEstado(t.id, 'confirmado') }}>✓ Confirmar</button>}
                    {t.estado !== 'pendiente' && <button style={s.btnP} onClick={e => { e.stopPropagation(); handleEstado(t.id, 'pendiente') }}>⏳ Pendiente</button>}
                    {t.estado !== 'cancelado' && <button style={s.btnX} onClick={e => { e.stopPropagation(); handleEstado(t.id, 'cancelado') }}>✕ Cancelar</button>}
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: '#c084fc', marginTop: '6px', fontStyle: 'italic' }}>Solo lectura</div>
                )}
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
  sidebar: { width: '220px', background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px', flexShrink: 0, overflowY: 'auto' },
  logoRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' },
  logoText: { fontWeight: '700', fontSize: '15px', flex: 1 },
  rolBadge: { background: 'var(--accent-light)', color: 'var(--accent)', fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '20px' },
  rolBadgeView: { background: 'rgba(192,132,252,0.15)', color: '#c084fc' },
  statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '16px' },
  statCard: { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px', textAlign: 'center' as const },
  statNum: { fontSize: '18px', fontWeight: '700', lineHeight: '1' },
  statLabel: { fontSize: '10px', color: 'var(--text2)', marginTop: '2px' },
  secLabel: { fontSize: '10px', fontWeight: '600', color: 'var(--text3)', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '5px' },
  fBtn: { display: 'flex', alignItems: 'center', gap: '7px', width: '100%', padding: '6px 8px', borderRadius: 'var(--radius-sm)', background: 'none', color: 'var(--text2)', fontSize: '12px', marginBottom: '2px', border: 'none', cursor: 'pointer' },
  fBtnA: { background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' },
  logoutBtn: { background: 'none', color: 'var(--text3)', fontSize: '12px', padding: '7px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', width: '100%', cursor: 'pointer' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px' },
  calHead: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' },
  calTitle: { fontSize: '18px', fontWeight: '700', textTransform: 'capitalize' as const, flex: 1 },
  navBtn: { background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', width: '30px', height: '30px', borderRadius: '7px', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  todayBtn: { background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '12px', padding: '5px 12px', borderRadius: '7px', cursor: 'pointer' },
  dHeads: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '3px' },
  dHead: { textAlign: 'center' as const, fontSize: '11px', fontWeight: '600', color: 'var(--text3)', padding: '3px 0', textTransform: 'uppercase' as const },
  calGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1, gap: '2px', overflow: 'hidden' },
  cCell: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '7px', padding: '6px', cursor: 'pointer', overflow: 'hidden', minHeight: '70px' },
  cCellO: { opacity: 0.3 },
  cCellS: { borderColor: 'var(--accent)', background: 'var(--accent-light)' },
  cCellT: { borderColor: 'var(--accent)' },
  cCellBloq: { background: 'rgba(239,68,68,0.04)', borderColor: 'rgba(239,68,68,0.15)' },
  cDayN: { fontSize: '12px', fontWeight: '600', color: 'var(--text2)', marginBottom: '3px', display: 'flex', alignItems: 'center' },
  cEvent: { fontSize: '9px', padding: '1px 4px', borderRadius: '3px', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' },
  detailPanel: { width: '300px', background: 'var(--surface)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto' },
  detailHead: { padding: '16px 14px 12px', borderBottom: '1px solid var(--border)', position: 'sticky' as const, top: 0, background: 'var(--surface)', zIndex: 1 },
  detailDate: { fontWeight: '600', fontSize: '13px', textTransform: 'capitalize' as const, marginBottom: '2px' },
  tCard: { margin: '6px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--surface2)', border: '1px solid var(--border)', padding: '10px', cursor: 'pointer' },
  tCardA: { borderColor: 'var(--accent)' },
  badge: { fontSize: '10px', padding: '2px 7px', borderRadius: '20px', fontWeight: '600' },
  tDetail: { marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '7px' },
  dRow: { display: 'flex', flexDirection: 'column', gap: '1px', fontSize: '11px', color: 'var(--text2)' },
  btnC: { flex: 1, padding: '5px', borderRadius: '5px', background: 'var(--green-light)', color: 'var(--green)', fontSize: '11px', fontWeight: '600', border: 'none', cursor: 'pointer' },
  btnP: { flex: 1, padding: '5px', borderRadius: '5px', background: 'var(--yellow-light)', color: 'var(--yellow)', fontSize: '11px', fontWeight: '600', border: 'none', cursor: 'pointer' },
  btnX: { flex: 1, padding: '5px', borderRadius: '5px', background: 'var(--red-light)', color: 'var(--red)', fontSize: '11px', fontWeight: '600', border: 'none', cursor: 'pointer' },
  btnBloquear: { flex: 1, padding: '7px', borderRadius: '7px', background: 'var(--red-light)', color: 'var(--red)', fontSize: '11px', fontWeight: '600', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer' },
  btnBloquearShow: { width: '100%', padding: '7px', borderRadius: '7px', background: 'var(--surface2)', color: 'var(--text2)', fontSize: '11px', fontWeight: '600', border: '1px solid var(--border)', cursor: 'pointer' },
  btnDesbloquear: { width: '100%', padding: '7px', borderRadius: '7px', background: 'var(--green-light)', color: 'var(--green)', fontSize: '11px', fontWeight: '600', border: '1px solid rgba(34,197,94,0.3)', cursor: 'pointer' },
  btnCancelar: { padding: '7px 10px', borderRadius: '7px', background: 'var(--surface2)', color: 'var(--text2)', fontSize: '11px', border: '1px solid var(--border)', cursor: 'pointer' },
  btnNuevoTurno: { width: '100%', padding: '8px', borderRadius: '7px', background: 'var(--accent)', color: 'white', fontSize: '12px', fontWeight: '600', border: 'none', cursor: 'pointer' },
  btnNuevoTurnoActive: { background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' },
  inputSmall: { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '7px 9px', color: 'var(--text)', fontSize: '12px', width: '100%' },
  nuevoTurnoForm: { padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--surface2)' },
  ntTitle: { fontWeight: '700', fontSize: '13px', color: 'var(--accent)' },
  ntField: { display: 'flex', flexDirection: 'column', gap: '4px' },
  ntLabel: { fontSize: '11px', fontWeight: '500', color: 'var(--text2)' },
  ntInput: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '7px 9px', color: 'var(--text)', fontSize: '12px', width: '100%' },
  ntToggle: { flex: 1, padding: '6px', borderRadius: '6px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: '11px', fontWeight: '600', cursor: 'pointer' },
  ntToggleActive: { background: 'var(--accent-light)', borderColor: 'var(--accent)', color: 'var(--accent)' },
  ntToggleFrio: { background: 'rgba(59,130,246,0.15)', borderColor: '#3b82f6', color: '#93c5fd' },
  ntToggleSeco: { background: 'rgba(245,158,11,0.15)', borderColor: '#f59e0b', color: '#fcd34d' },
  ntSlot: { padding: '7px 10px', borderRadius: '6px', border: '1px solid', cursor: 'pointer', fontSize: '12px', fontWeight: '600', textAlign: 'left' as const },
  ntSlotLibre: { background: 'var(--green-light)', borderColor: 'rgba(34,197,94,0.3)', color: 'var(--text)' },
  ntSlotSel: { background: 'var(--accent-light)', borderColor: 'var(--accent)', color: 'var(--text)' },
  ntSlotOcup: { background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text3)', cursor: 'not-allowed' as const },
  ntSubmit: { padding: '9px', borderRadius: '7px', background: 'var(--accent)', color: 'white', fontSize: '12px', fontWeight: '700', border: 'none', cursor: 'pointer' },
}
