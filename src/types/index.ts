export type Role = 'proveedor' | 'operador'

export interface Perfil {
  id: string
  nombre: string
  empresa: string | null
  rol: Role
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
  observaciones: string | null
  estado: 'confirmado' | 'pendiente' | 'cancelado'
}
