-- Add started_at column to deliveries table
ALTER TABLE deliveries 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;

-- Index for querying active deliveries
CREATE INDEX IF NOT EXISTS idx_deliveries_started_at ON deliveries(started_at);