-- Migration: Add get_coordinates RPC function
-- Purpose: Extract lat/lon from geography column for API responses
-- Build Document: Full detail endpoint needs lat/lon extracted from PostGIS geom

-- Function to extract coordinates from a location's geography
CREATE OR REPLACE FUNCTION get_coordinates(location_id INTEGER)
RETURNS TABLE (lon DOUBLE PRECISION, lat DOUBLE PRECISION) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ST_X(geom::geometry) AS lon,
    ST_Y(geom::geometry) AS lat
  FROM locations
  WHERE id = location_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission to authenticated and anon roles
GRANT EXECUTE ON FUNCTION get_coordinates(INTEGER) TO authenticated, anon;

-- Add comment for documentation
COMMENT ON FUNCTION get_coordinates IS 'Extracts longitude and latitude from a location geography column';
