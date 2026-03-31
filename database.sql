-- Añadiendo columna para WhatsApp al esquema original

CREATE TABLE IF NOT EXISTS luggage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  client_name TEXT,
  client_phone TEXT, -- NUEVO: Para el WhatsApp
  small_bags INTEGER DEFAULT 0,
  large_bags INTEGER DEFAULT 0,
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active',
  check_out_time TIMESTAMPTZ,
  total_paid NUMERIC(10, 2) DEFAULT 0,
  payment_method TEXT
);

ALTER TABLE luggage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all operations for MVP"
ON luggage
FOR ALL TO anon
USING (true)
WITH CHECK (true);

-- Si ya ejecutaste la primera vez, solo necesitas correr esto para actualizar:
-- ALTER TABLE luggage ADD COLUMN client_phone TEXT;
