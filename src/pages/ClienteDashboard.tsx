import { useState, useEffect, CSSProperties } from 'react'
import { supabase } from '../lib/supabase'
import { format, addDays, startOfDay, isToday, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Perfil, Turno, DiaBloqueado, SLOTS_FRIO, SLOTS_SECO } from '../types'

function generateDays(n = 21): Date[] {
  const today = startOfDay(new Date())
  const days: Date[] = []
  for (let i = 0; i < n; i++) {
    const d = addDays(today, i)
    days.push(d)
  }
  return days
}

type Step = 'calendario' | 'confirmar' | 'exito'
interface FormData {
  tipo_recepcion: 'STOCK' | 'CROSSDOCKING'
  bultos: string
  telefono: string
  observaciones: string
}
interface Props { perfil: Perfil; onLogout?: () => void }

export default function ClienteDashboard({ perfil, onLogout }: Props) {
  const [days] = useState<Date[]>(generateDays)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<typeof SLOTS_FRIO[0] | null>(null)
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [misTurnos, setMisTurnos] = useState<Turno[]>([])
  const [diasBloqueados, setDiasBloqueados] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<Step>('calendario')
  const [form, setForm] = useState<FormData>({
    tipo_recepcion: 'STOCK',
    bultos: '',
    telefono: '',
    observaciones: ''
  })

  const categoria = perfil.categoria ?? 'frio'
  const slots = categoria === 'frio' ? SLOTS_FRIO : SLOTS_SECO
  const colorCateg = categoria === 'frio' ? 'var(--accent)' : '#f59e0b'
  const labelCateg = categoria === 'frio' ? '❄️ Frío' : '☀️ Seco'

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const { data: t } = await supabase.from('z_turnos').select('*').eq('categoria', categoria)
    if (t) setTurnos(t as Turno[])

    const { data: mis } = await supabase.from('z_turnos').select('*')
      .eq('proveedor_id', perfil.id).order('fecha', { ascending: true })
    if (mis) setMisTurnos(mis as Turno[])

    const { data: bloq } = await supabase.from('z_dias_bloqueados').select('fecha')
    if (bloq) setDiasBloqueados(bloq.map((b: any) => b.fecha))
  }

  const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6
  const isBloqueado = (d: Date) => {
    const f = format(d, 'yyyy-MM-dd')
    return isWeekend(d) || diasBloqueados.includes(f)
  }

  const isSlotOcupado = (fecha: Date, hora: string): boolean => {
    const f = format(fecha, 'yyyy-MM-dd')
    return turnos.some(t => t.fecha === f && t.hora === hora && t.estado !== 'cancelado')
  }

  const handleConfirmar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDay || !selectedSlot) return
    setLoading(true)
    await supabase.from('z_turnos').insert({
      fecha: format(selectedDay, 'yyyy-MM-dd'),
      hora: selectedSlot.hora,
      hora_fin: selectedSlot.hora_fin,
      proveedor_id: perfil.id,
      proveedor_nombre: perfil.nombre,
      proveedor_empresa: perfil.empresa ?? '',
      tipo_recepcion: form.tipo_recepcion,
      bultos: parseInt(form.bultos) || null,
      tiempo_descarga: selectedSlot.duracion,
      telefono: form.telefono,
      observaciones: form.observaciones,
      estado: 'confirmado',
      categoria,
    })
    setLoading(false)
    setStep('exito')
    fetchData()
  }

  const handleCancelar = async (id: string) => {
    await supabase.from('z_turnos').update({ estado: 'cancelado' }).eq('id', id)
    fetchData()
  }

  const logout = () => { if (onLogout) { onLogout() } else { supabase.auth.signOut() } }

  const estStyle = (e: string): CSSProperties => ({
    confirmado: { background: 'var(--green-light)', color: 'var(--green)' },
    cancelado: { background: 'var(--red-light)', color: 'var(--red)' },
    pendiente: { background: 'var(--yellow-light)', color: 'var(--yellow)' },
  }[e] ?? {})

  return (
    <div style={s.wrapper}>
      <aside style={s.sidebar}>
        <div>
          <div style={s.logoRow}><span style={s.logoText}>📋 Turnero</span></div>
          <div style={s.userCard}>
            <div style={{ ...s.avatar, background: colorCateg }}>{perfil.nombre[0].toUpperCase()}</div>
            <div>
              <div style={s.userName}>{perfil.nombre}</div>
              <div style={s.userEmp}>{perfil.empresa}</div>
              <div style={{ ...s.categBadge, background: categoria === 'frio' ? 'rgba(59,130,246,0.15)' : 'rgba(245,158,11,0.15)', color: colorCateg }}>
                {labelCateg}
              </div>
            </div>
          </div>
        </div>
        <div style={s.misSection}>
          <div style={s.secLabel}>Mis turnos</div>
          {misTurnos.length === 0
            ? <div style={s.empty}>Sin turnos reservados</div>
            : misTurnos.map(t => (
              <div key={t.id} style={s.tItem}>
                <div>
                  <div style={s.tFecha}>{format(parseISO(t.fecha), 'EEE d MMM', { locale: es })}</div>
                  <div style={s.tHoraRow}>
                    <span style={s.tHora}>{t.hora}</span>
                    <span style={{ color: 'var(--text3)', fontSize: '11px' }}>→</span>
                    <span style={{ ...s.tHora, color: colorCateg, fontSize: '13px' }}>{t.hora_fin}</span>
                  </div>
                  <div style={s.tTipo}>{t.tipo_recepcion}{t.bultos ? ` · ${t.bultos} pallets` : ''}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <div style={{ ...s.badge, ...estStyle(t.estado) }}>{t.estado}</div>
                  {t.estado === 'confirmado' && <button style={s.cancelBtn} onClick={() => handleCancelar(t.id)}>×</button>}
                </div>
              </div>
            ))}
        </div>
        <button onClick={logout} style={s.logoutBtn}>Cerrar sesión</button>
      </aside>

      <main style={s.main}>
        {step === 'calendario' && (
          <div className="animate-in">
            <div style={s.pHead}>
              <h1 style={s.pTitle}>Reservar turno</h1>
              <p style={s.pSub}>Turnos disponibles para categoría <strong style={{ color: colorCateg }}>{labelCateg}</strong></p>
            </div>

            {/* Days strip */}
            <div style={s.dayStrip}>
              {days.map(d => {
                const bloq = isBloqueado(d)
                const sel = selectedDay && format(d, 'yyyy-MM-dd') === format(selectedDay, 'yyyy-MM-dd')
                const hayDisp = !bloq && slots.some(sl => !isSlotOcupado(d, sl.hora))
                return (
                  <button key={d.toISOString()}
                    style={{ ...s.dBtn, ...(sel ? s.dBtnA : {}), ...(bloq ? s.dBtnBlocked : !hayDisp ? s.dBtnFull : {}) }}
                    onClick={() => { if (!bloq) { setSelectedDay(d); setSelectedSlot(null) } }}
                    disabled={bloq}>
                    <span style={s.dName}>{format(d, 'EEE', { locale: es })}</span>
                    <span style={s.dNum}>{format(d, 'd')}</span>
                    <span style={s.dMon}>{format(d, 'MMM', { locale: es })}</span>
                    {bloq && <span style={s.blockedX}>✕</span>}
                    {isToday(d) && !bloq && <span style={s.tDot} />}
                  </button>
                )
              })}
            </div>

            {selectedDay && !isBloqueado(selectedDay) && (
              <div className="animate-in">
                <h2 style={{ ...s.pTitle, fontSize: '18px', textTransform: 'capitalize', marginBottom: '20px' }}>
                  {format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}
                </h2>
                <div style={s.slotsCol}>
                  {slots.map(slot => {
                    const ocupado = isSlotOcupado(selectedDay, slot.hora)
                    const isSel = selectedSlot?.hora === slot.hora
                    return (
                      <button key={slot.hora}
                        style={{ ...s.slotCard, ...(ocupado ? s.slotOcupado : isSel ? s.slotSelected : s.slotLibre) }}
                        onClick={() => { if (!ocupado) setSelectedSlot(slot) }}
                        disabled={ocupado}>
                        <div style={s.slotTime}>
                          <span style={s.slotHora}>{slot.hora}</span>
                          <span style={{ color: 'var(--text3)', fontSize: '14px' }}>→</span>
                          <span style={s.slotHoraFin}>{slot.hora_fin}</span>
                          <span style={s.slotDur}>{slot.duracion} min</span>
                        </div>
                        <div style={s.slotStatus}>{ocupado ? 'Ocupado' : isSel ? '✓ Seleccionado' : 'Disponible'}</div>
                      </button>
                    )
                  })}
                </div>
                {selectedSlot && (
                  <div style={{ marginTop: '24px' }}>
                    <button style={s.cBtn} onClick={() => setStep('confirmar')}>
                      Continuar con {selectedSlot.hora} → {selectedSlot.hora_fin} →
                    </button>
                  </div>
                )}
              </div>
            )}
            {!selectedDay && <div style={s.prompt}><div style={{ fontSize: '48px' }}>📅</div><div style={{ color: 'var(--text2)' }}>Seleccioná un día para ver los horarios disponibles</div></div>}
          </div>
        )}

        {step === 'confirmar' && selectedDay && selectedSlot && (
          <div className="animate-in" style={{ maxWidth: '560px' }}>
            <button onClick={() => setStep('calendario')} style={s.backBtn}>← Volver</button>
            <div style={s.cCard}>
              <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '20px' }}>Confirmá tu turno</h2>
              <div style={s.resumen}>
                <div style={s.rRow}><span>📅 Fecha</span><strong style={{ textTransform: 'capitalize' }}>{format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}</strong></div>
                <div style={s.rRow}><span>🕐 Horario</span><strong style={{ color: colorCateg }}>{selectedSlot.hora} → {selectedSlot.hora_fin} ({selectedSlot.duracion} min)</strong></div>
                <div style={s.rRow}><span>🏢 Empresa</span><strong>{perfil.empresa}</strong></div>
                <div style={s.rRow}><span>Categoría</span><strong style={{ color: colorCateg }}>{labelCateg}</strong></div>
              </div>
              <form onSubmit={handleConfirmar} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={s.field}>
                  <label style={s.label}>Tipo de recepción</label>
                  <div style={s.toggleRow}>
                    {(['STOCK', 'CROSSDOCKING'] as const).map(tipo => (
                      <button key={tipo} type="button"
                        style={{ ...s.toggleBtn, ...(form.tipo_recepcion === tipo ? s.toggleBtnActive : {}) }}
                        onClick={() => setForm(f => ({ ...f, tipo_recepcion: tipo }))}>
                        {tipo}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={s.field}>
                  <label style={s.label}>Cantidad de pallets</label>
                  <input style={s.input} type="number" min="0" placeholder="Ej: 10"
                    value={form.bultos} onChange={e => setForm(f => ({ ...f, bultos: e.target.value }))} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Teléfono de contacto *</label>
                  <input style={s.input} type="tel" placeholder="Ej: 1123456789" required
                    value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Observaciones (opcional)</label>
                  <textarea style={{ ...s.input, minHeight: '70px', resize: 'vertical' }}
                    placeholder="Requiere montacargas, mercadería frágil, etc."
                    value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} />
                </div>
                <button type="submit" style={{ ...s.cBtn, background: colorCateg }} disabled={loading}>
                  {loading ? 'Confirmando...' : '✓ Confirmar turno'}
                </button>
              </form>
            </div>
          </div>
        )}

        {step === 'exito' && selectedDay && selectedSlot && (
          <div className="animate-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
            <div style={{ ...s.cCard, textAlign: 'center', maxWidth: '420px' }}>
              <div style={{ fontSize: '56px', marginBottom: '16px' }}>{categoria === 'frio' ? '❄️' : '☀️'}</div>
              <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px' }}>¡Turno confirmado!</h2>
              <p style={{ color: 'var(--text2)', lineHeight: '1.6', marginBottom: '24px' }}>
                <strong style={{ textTransform: 'capitalize' }}>{format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}</strong><br />
                🕐 <strong style={{ color: colorCateg }}>{selectedSlot.hora} → {selectedSlot.hora_fin}</strong>
              </p>
              <button style={{ ...s.cBtn, background: colorCateg }} onClick={() => {
                setStep('calendario'); setSelectedDay(null); setSelectedSlot(null)
                setForm({ tipo_recepcion: 'STOCK', bultos: '', telefono: '', observaciones: '' })
              }}>Reservar otro turno</button>
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
  logoRow: { marginBottom: '20px' },
  logoText: { fontWeight: '700', fontSize: '18px' },
  userCard: { display: 'flex', alignItems: 'flex-start', gap: '12px', background: 'var(--surface2)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: '8px' },
  avatar: { width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '15px', flexShrink: 0 },
  userName: { fontWeight: '600', fontSize: '14px' },
  userEmp: { color: 'var(--text2)', fontSize: '12px', marginBottom: '4px' },
  categBadge: { display: 'inline-block', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px' },
  misSection: { flex: 1, overflow: 'auto', marginTop: '20px' },
  secLabel: { color: 'var(--text2)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' },
  empty: { color: 'var(--text3)', fontSize: '13px', textAlign: 'center', padding: '20px 0' },
  tItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px', borderRadius: 'var(--radius-sm)', background: 'var(--surface2)', marginBottom: '8px', fontSize: '13px' },
  tFecha: { color: 'var(--text2)', textTransform: 'capitalize', fontSize: '12px', marginBottom: '2px' },
  tHoraRow: { display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' },
  tHora: { fontWeight: '700', fontFamily: 'var(--mono)', fontSize: '14px' },
  tTipo: { color: 'var(--text3)', fontSize: '11px' },
  badge: { fontSize: '10px', padding: '2px 7px', borderRadius: '20px', fontWeight: '600', whiteSpace: 'nowrap' as const },
  cancelBtn: { background: 'var(--red-light)', color: 'var(--red)', width: '20px', height: '20px', borderRadius: '50%', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' },
  logoutBtn: { marginTop: '16px', background: 'none', color: 'var(--text3)', fontSize: '13px', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', width: '100%', cursor: 'pointer' },
  main: { flex: 1, padding: '40px', overflow: 'auto' },
  pHead: { marginBottom: '32px' },
  pTitle: { fontSize: '28px', fontWeight: '700', marginBottom: '6px' },
  pSub: { color: 'var(--text2)', fontSize: '15px' },
  dayStrip: { display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '32px' },
  dBtn: { flexShrink: 0, width: '68px', padding: '12px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer', position: 'relative' as const },
  dBtnA: { background: 'var(--accent-light)', borderColor: 'var(--accent)' },
  dBtnFull: { opacity: 0.5 },
  dBtnBlocked: { opacity: 0.35, cursor: 'not-allowed' as const, background: 'var(--surface2)' },
  dName: { fontSize: '11px', color: 'var(--text2)', textTransform: 'capitalize' as const },
  dNum: { fontSize: '20px', fontWeight: '700', lineHeight: '1' },
  dMon: { fontSize: '10px', color: 'var(--text2)', textTransform: 'capitalize' as const },
  tDot: { position: 'absolute' as const, bottom: '5px', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent)' },
  blockedX: { position: 'absolute' as const, top: '3px', right: '5px', fontSize: '10px', color: 'var(--red)', fontWeight: '700' },
  slotsCol: { display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '480px' },
  slotCard: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderRadius: 'var(--radius-sm)', border: '1px solid', cursor: 'pointer' },
  slotLibre: { background: 'var(--green-light)', borderColor: 'rgba(34,197,94,0.25)', color: 'var(--text)' },
  slotSelected: { background: 'var(--accent-light)', borderColor: 'var(--accent)', color: 'var(--text)' },
  slotOcupado: { background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text3)', cursor: 'not-allowed' as const },
  slotTime: { display: 'flex', alignItems: 'center', gap: '8px' },
  slotHora: { fontFamily: 'var(--mono)', fontWeight: '700', fontSize: '18px' },
  slotHoraFin: { fontFamily: 'var(--mono)', fontWeight: '600', fontSize: '16px' },
  slotDur: { background: 'rgba(0,0,0,0.08)', borderRadius: '12px', padding: '2px 8px', fontSize: '12px', fontWeight: '600' },
  slotStatus: { fontSize: '13px', fontWeight: '500' },
  prompt: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '12px' },
  backBtn: { background: 'none', color: 'var(--text2)', fontSize: '14px', marginBottom: '24px', padding: '0', border: 'none', cursor: 'pointer' },
  cCard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px' },
  resumen: { background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: '16px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '10px' },
  rRow: { display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--text2)' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '500', color: 'var(--text2)' },
  input: { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', color: 'var(--text)', fontSize: '14px', width: '100%' },
  toggleRow: { display: 'flex', gap: '8px' },
  toggleBtn: { flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', fontWeight: '600', fontSize: '13px', cursor: 'pointer' },
  toggleBtnActive: { background: 'var(--accent-light)', borderColor: 'var(--accent)', color: 'var(--accent)' },
  cBtn: { background: 'var(--accent)', color: 'white', fontWeight: '600', fontSize: '15px', padding: '14px', borderRadius: 'var(--radius-sm)', width: '100%', border: 'none', cursor: 'pointer' },
}
