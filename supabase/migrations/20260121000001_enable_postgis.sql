-- Enable PostGIS extension for spatial data support
-- Required for geography(Point, 4326) columns and spatial indexes

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Verify PostGIS installation
SELECT PostGIS_Version();
