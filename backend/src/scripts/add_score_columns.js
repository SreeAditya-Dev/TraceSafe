import { query } from '../config/database.js';

const migrate = async () => {
    try {
        console.log('🔄 Starting migration: Add reliability_score to farmers table...');

        // Add columns if they don't exist
        await query(`
            ALTER TABLE farmers 
            ADD COLUMN IF NOT EXISTS reliability_score DECIMAL(5, 2) DEFAULT 50.00,
            ADD COLUMN IF NOT EXISTS total_batches INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS successful_batches INTEGER DEFAULT 0;
        `);

        console.log('✅ Migration successful: Added columns to farmers table');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
};

migrate();
