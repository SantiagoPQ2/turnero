export type Role = 'cliente' | 'turnero'

export interface Session {
  role: Role
  nombre: string
  empresa: string
}

export interface Turno {
  id: string
  created_at: string
  fecha: string
  hora: string
  proveedor_nombre: string
  proveedor_empresa: string
  descripcion: string | null
  bultos: number | null
  observaciones: string | null
  estado: 'confirmado' | 'pendiente' | 'cancelado'
}
