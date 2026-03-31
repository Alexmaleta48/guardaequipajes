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

ALTER TABLE luggage ENABLE ROW LEVEL SECURITY;

-- ☠️ CERRANDO LA PUERTA (Borrar la regla MVP insegura si existe)
DROP POLICY IF EXISTS "Enable all operations for MVP" ON luggage;

-- 🛡️ REGRA MILITAR: Solo el perfil autenticado alexmaletas48 puede leer/escribir/borrar sus maletas
CREATE POLICY "Security Check: Solo Administrador Autenticado"
ON luggage
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- IMPORTANTE: Corre ESTE ARCHIVO AHORA MISMO en el SQL Editor de Supabase
-- para evitar que cualquiera con la Anon_Key robe o borre los datos desde internet.
