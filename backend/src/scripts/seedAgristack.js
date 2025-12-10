import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const seedAgristack = async () => {
    try {
        console.log('🌱 Starting AgriStack data seeding...');

        // Read agristack.json
        const dataPath = path.join(__dirname, '../../data/agristack.json');

        if (!fs.existsSync(dataPath)) {
            console.error('❌ agristack.json not found at:', dataPath);
            process.exit(1);
        }

        const rawData = fs.readFileSync(dataPath, 'utf-8');
        const farmers = JSON.parse(rawData);

        console.log(`📊 Found ${farmers.length} farmers to seed`);

        // Clear existing data (optional - comment out if you want to preserve existing)
        await query('DELETE FROM farmers WHERE agristack_id IS NOT NULL');
        await query('DELETE FROM agristack_farmers');
        console.log('🗑️  Cleared existing AgriStack data');

        // Insert farmers
        let inserted = 0;
        let skipped = 0;

        for (const farmer of farmers) {
            try {
                // Check if farmer already exists
                const existing = await query(
                    'SELECT id FROM agristack_farmers WHERE farmer_id = $1',
                    [farmer.farmer_id]
                );

                if (existing.rows.length > 0) {
                    skipped++;
                    continue;
                }

                // Extract state from farmer_id prefix
                const stateMap = {
                    'MH': 'Maharashtra',
                    'OD': 'Odisha',
                    'KA': 'Karnataka',
                    'TN': 'Tamil Nadu',
                    'RJ': 'Rajasthan',
                    'UP': 'Uttar Pradesh',
                    'PB': 'Punjab',
                    'GJ': 'Gujarat',
                    'BR': 'Bihar',
                    'AP': 'Andhra Pradesh',
                    'TS': 'Telangana',
                    'HR': 'Haryana',
                    'KL': 'Kerala',
                    'JK': 'Jammu & Kashmir',
                    'CH': 'Chandigarh',
                    'DL': 'Delhi',
                    'AS': 'Assam',
                    'GA': 'Goa',
                    'MN': 'Manipur',
                    'TR': 'Tripura',
                };

                const statePrefix = farmer.farmer_id.substring(0, 2);
                const state = stateMap[statePrefix] || null;

                await query(
                    `INSERT INTO agristack_farmers (farmer_id, name, land, crops, verified, registry_status, state)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [
                        farmer.farmer_id,
                        farmer.name,
                        farmer.land,
                        farmer.crops,
                        farmer.verified,
                        farmer.registry_status,
                        state,
                    ]
                );

                inserted++;
            } catch (err) {
                console.error(`❌ Failed to insert farmer ${farmer.farmer_id}:`, err.message);
            }
        }

        console.log(`✅ Seeding complete: ${inserted} inserted, ${skipped} skipped`);

        // Verify by querying
        const countResult = await query('SELECT COUNT(*) FROM agristack_farmers');
        const verifiedResult = await query('SELECT COUNT(*) FROM agristack_farmers WHERE verified = true');

        console.log(`📊 Total farmers in database: ${countResult.rows[0].count}`);
        console.log(`📊 Verified farmers: ${verifiedResult.rows[0].count}`);

        // Show sample data
        const sampleResult = await query('SELECT farmer_id, name, state, verified FROM agristack_farmers LIMIT 5');
        console.log('\n📋 Sample data:');
        console.table(sampleResult.rows);

        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
};

seedAgristack();
