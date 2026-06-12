-- Agrega columna direccion a la tabla appraisals para soportar
-- geocodificación de precisión en el motor de tasación.
ALTER TABLE appraisals
ADD COLUMN IF NOT EXISTS direccion text;
