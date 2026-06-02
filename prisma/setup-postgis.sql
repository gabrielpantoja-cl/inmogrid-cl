-- Asegurarnos de que PostGIS está instalado en el esquema público
CREATE SCHEMA IF NOT EXISTS public;
SET search_path TO public;

-- Reinstalar las extensiones en el orden correcto
DROP EXTENSION IF EXISTS postgis_topology CASCADE;
DROP EXTENSION IF EXISTS postgis_raster CASCADE;
DROP EXTENSION IF EXISTS postgis CASCADE;

CREATE EXTENSION IF NOT EXISTS postgis SCHEMA public;
CREATE EXTENSION IF NOT EXISTS postgis_topology SCHEMA topology;
CREATE EXTENSION IF NOT EXISTS postgis_raster SCHEMA public;