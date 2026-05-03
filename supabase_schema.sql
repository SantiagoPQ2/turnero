CREATE TABLE turnos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  fecha DATE NOT NULL,
  hora TEXT NOT NULL,
  proveedor_nombre TEXT NOT NULL,
  proveedor_empresa TEXT NOT NULL,
  descripcion TEXT,
  bultos INTEGER,
  observaciones TEXT,
  estado TEXT DEFAULT 'confirmado' CHECK (estado IN ('confirmado', 'pendiente', 'cancelado'))
);
CREATE INDEX idx_turnos_fecha ON turnos(fecha);
CREATE INDEX idx_turnos_estado ON turnos(estado);
ALTER TABLE turnos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pub read" ON turnos FOR SELECT USING (true);
CREATE POLICY "pub insert" ON turnos FOR INSERT WITH CHECK (true);
CREATE POLICY "pub update" ON turnos FOR UPDATE USING (true);
