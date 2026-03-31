-- Ejecuta esto en el "SQL Editor" de Supabase

CREATE TABLE luggage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  client_name TEXT,
  small_bags INTEGER DEFAULT 0,
  large_bags INTEGER DEFAULT 0,
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active', -- 'active' o 'completed'
  check_out_time TIMESTAMPTZ,
  total_paid NUMERIC(10, 2) DEFAULT 0,
  payment_method TEXT
);

-- Hacer la tabla pública (solo porque es un MVP cerrado sin inicio de sesión por ahora)
-- WARNING: En una APP pública de verdad habría que poner políticas Row Level Security (RLS)
ALTER TABLE luggage ENABLE ROW LEVEL SECURITY;

-- Permite todas las operaciones para simplificar el MVP en producción
CREATE POLICY "Enable all operations for MVP"
ON luggage
FOR ALL TO anon
USING (true)
WITH CHECK (true);
