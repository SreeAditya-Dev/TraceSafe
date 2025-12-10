-- TraceSafe Database Schema

-- Users table for authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('farmer', 'driver', 'retailer', 'admin')),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AgriStack farmers registry (synced from government)
CREATE TABLE agristack_farmers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    land VARCHAR(50),
    crops TEXT,
    verified BOOLEAN DEFAULT FALSE,
    registry_status VARCHAR(50),
    state VARCHAR(100),
    district VARCHAR(100),
    village VARCHAR(100),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Farmers table (linked to users and agristack)
CREATE TABLE farmers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    agristack_id VARCHAR(50) REFERENCES agristack_farmers(farmer_id),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    state VARCHAR(100),
    district VARCHAR(100),
    village VARCHAR(100),
    land_acres DECIMAL(10, 2),
    crops TEXT[],
    verified BOOLEAN DEFAULT FALSE,
    fssai_license VARCHAR(50),
    profile_image_url TEXT,
    reliability_score DECIMAL(5, 2) DEFAULT 100.0,
    total_batches INTEGER DEFAULT 0,
    successful_batches INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Drivers table
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    vehicle_number VARCHAR(50),
    license_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Retailers table
CREATE TABLE retailers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    shop_name VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    fssai_license VARCHAR(50),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Batches table (core entity for supply chain tracking)
CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id VARCHAR(50) UNIQUE NOT NULL,
    crop VARCHAR(100) NOT NULL,
    variety VARCHAR(100),
    quantity DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(20) DEFAULT 'kg',
    harvest_date DATE,
    farmer_id UUID REFERENCES farmers(id),
    current_owner_type VARCHAR(50) CHECK (current_owner_type IN ('farmer', 'driver', 'retailer')),
    current_owner_id UUID,
    status VARCHAR(50) DEFAULT 'created' CHECK (status IN ('created', 'in_transit', 'delivered', 'received', 'sold')),
    origin_latitude DECIMAL(10, 8),
    origin_longitude DECIMAL(11, 8),
    origin_address TEXT,
    qr_code_url TEXT,
    image_urls TEXT[],
    fssai_license VARCHAR(50),
    blockchain_tx_id VARCHAR(255),
    -- IoT columns
    crate_temp DECIMAL(5, 2),
    reefer_temp DECIMAL(5, 2),
    humidity DECIMAL(5, 2),
    location_temp DECIMAL(5, 2),
    transit_duration INTEGER,
    crop_type_encoded INTEGER,
    transit_start_time TIMESTAMP,
    transit_end_time TIMESTAMP,
    -- Delivery tracking columns
    pending_retailer_id UUID,
    delivery_latitude DECIMAL(10, 8),
    delivery_longitude DECIMAL(11, 8),
    -- ML Spoilage prediction columns
    spoilage_risk VARCHAR(20),
    spoilage_probability DECIMAL(5, 4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Journey events table (tracks each step of the batch journey)
CREATE TABLE journey_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('created', 'pickup', 'transit_update', 'delivery', 'received', 'sold')),
    actor_type VARCHAR(50) NOT NULL,
    actor_id UUID NOT NULL,
    actor_name VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    address TEXT,
    temperature DECIMAL(5, 2),
    humidity DECIMAL(5, 2),
    notes TEXT,
    image_urls TEXT[],
    blockchain_tx_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transfers table (ownership transfers)
CREATE TABLE transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    from_type VARCHAR(50) NOT NULL,
    from_id UUID NOT NULL,
    to_type VARCHAR(50) NOT NULL,
    to_id UUID NOT NULL,
    transfer_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    notes TEXT,
    blockchain_tx_id VARCHAR(255)
);

-- Create indexes for better query performance
CREATE INDEX idx_batches_status ON batches(status);
CREATE INDEX idx_batches_farmer ON batches(farmer_id);
CREATE INDEX idx_batches_batch_id ON batches(batch_id);
CREATE INDEX idx_journey_batch ON journey_events(batch_id);
CREATE INDEX idx_agristack_farmer_id ON agristack_farmers(farmer_id);
CREATE INDEX idx_farmers_agristack ON farmers(agristack_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_farmers_updated_at BEFORE UPDATE ON farmers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agristack_updated_at BEFORE UPDATE ON agristack_farmers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
