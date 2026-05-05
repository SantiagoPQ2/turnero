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
  proveedor_id: string
  proveedor_nombre: string
  proveedor_empresa: string
  descripcion: string | null
  bultos: number | null
  observaciones: string | null
  estado: 'confirmado' | 'pendiente' | 'cancelado'
}
