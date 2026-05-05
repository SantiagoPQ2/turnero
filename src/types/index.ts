export type Role = 'proveedor' | 'operador'
export type Categoria = 'frio' | 'seco'

export interface Perfil {
  id: string
  nombre: string
  empresa: string | null
  rol: Role
  categoria: Categoria | null
}

export interface Turno {
  id: string
  created_at: string
  fecha: string
  hora: string
  hora_fin: string
  proveedor_id: string
  proveedor_nombre: string
  proveedor_empresa: string
  tipo_recepcion: 'STOCK' | 'CROSSDOCKING'
  bultos: number | null
  tiempo_descarga: number
  telefono: string | null
  observaciones: string | null
  estado: 'confirmado' | 'pendiente' | 'cancelado'
  categoria: Categoria
}

export interface DiaBloqueado {
  id: string
  fecha: string
  motivo: string | null
}

export const SLOTS_FRIO = [
  { hora: '08:00', hora_fin: '08:40', duracion: 40 },
  { hora: '08:40', hora_fin: '09:20', duracion: 40 },
  { hora: '09:20', hora_fin: '10:00', duracion: 40 },
]

export const SLOTS_SECO = [
  { hora: '10:00', hora_fin: '11:30', duracion: 90 },
  { hora: '11:30', hora_fin: '13:00', duracion: 90 },
  { hora: '13:00', hora_fin: '14:30', duracion: 90 },
  { hora: '14:30', hora_fin: '16:00', duracion: 90 },
]
