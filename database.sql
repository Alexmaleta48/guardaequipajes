-- Añadiendo columna para las fotos de seguridad (base64)
CREATE TABLE IF NOT EXISTS luggage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  client_name TEXT,
  client_phone TEXT, 
  photo_data TEXT,
  small_bags INTEGER DEFAULT 0,
  large_bags INTEGER DEFAULT 0,
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active',
  check_out_time TIMESTAMPTZ,
  total_paid NUMERIC(10, 2) DEFAULT 0,
  payment_method TEXT
);

-- NUEVAS TABLAS PARA CONTABILIDAD Y CIERRE DE CAJA
CREATE TABLE IF NOT EXISTS daily_shifts (
  date_opened DATE DEFAULT CURRENT_DATE PRIMARY KEY,
  initial_cash NUMERIC(10, 2) DEFAULT 0,
  closed_at TIMESTAMPTZ,
  final_cash_counted NUMERIC(10, 2) DEFAULT 0,
  final_card_calculated NUMERIC(10, 2) DEFAULT 0,
  final_cash_calculated NUMERIC(10, 2) DEFAULT 0,
  total_expenses NUMERIC(10, 2) DEFAULT 0,
  difference NUMERIC(10, 2) DEFAULT 0,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS cash_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_date DATE NOT NULL,
  amount NUMERIC(10, 2) DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HABILITAR PROTECCIÓN RLS
ALTER TABLE luggage ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

-- ☠️ CERRANDO LA PUERTA (Borrar la regla MVP insegura si existe)
DROP POLICY IF EXISTS "Enable all operations for MVP" ON luggage;

-- 🛡️ REGLAS MILITARES: Solo el Gestor Autenticado puede tocar
CREATE POLICY "Solo Administrador Autenticado" ON luggage FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Solo Administrador Autenticado" ON daily_shifts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Solo Administrador Autenticado" ON cash_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- IMPORTANTE: Corre ESTE ARCHIVO de nuevo en el SQL Editor de Supabase
-- para crear las nuevas tablas de Cierres Diarios y Gastos Menores.
