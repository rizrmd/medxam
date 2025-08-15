-- Migration to add committee and scorer assignments to deliveries

-- Create delivery_committee table
CREATE TABLE IF NOT EXISTS delivery_committee (
    id SERIAL PRIMARY KEY,
    delivery_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(delivery_id, user_id)
);

-- Create delivery_scorer table
CREATE TABLE IF NOT EXISTS delivery_scorer (
    id SERIAL PRIMARY KEY,
    delivery_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(delivery_id, user_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_delivery_committee_delivery_id ON delivery_committee(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_committee_user_id ON delivery_committee(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_scorer_delivery_id ON delivery_scorer(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_scorer_user_id ON delivery_scorer(user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to update updated_at automatically
DROP TRIGGER IF EXISTS update_delivery_committee_updated_at ON delivery_committee;
CREATE TRIGGER update_delivery_committee_updated_at
    BEFORE UPDATE ON delivery_committee
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_delivery_scorer_updated_at ON delivery_scorer;
CREATE TRIGGER update_delivery_scorer_updated_at
    BEFORE UPDATE ON delivery_scorer
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();