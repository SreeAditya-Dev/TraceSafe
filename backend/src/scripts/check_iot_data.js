// Script to check the latest batch for IoT data
import { getClient } from '../config/database.js';

const checkLatestBatch = async () => {
    const client = await getClient();
    try {
        const res = await client.query(`
            SELECT 
                batch_id, 
                crop, 
                status,
                crate_temp, 
                reefer_temp, 
                humidity, 
                location_temp, 
                transit_duration,
                transit_start_time,
                transit_end_time
            FROM batches 
            ORDER BY created_at DESC 
            LIMIT 1
        `);

        if (res.rows.length === 0) {
            console.log('No batches found.');
        } else {
            const batch = res.rows[0];
            console.log('\n📊 LATEST BATCH IOT DATA:');
            console.log('=========================');
            console.log(`🆔 Batch ID:       ${batch.batch_id}`);
            console.log(`🌱 Crop:           ${batch.crop}`);
            console.log(`📍 Status:         ${batch.status}`);
            console.log('-------------------------');
            console.log(`🌡️  Crate Temp:     ${batch.crate_temp}°C`);
            console.log(`❄️  Reefer Temp:    ${batch.reefer_temp}°C`);
            console.log(`💧 Humidity:       ${batch.humidity}%`);
            console.log(`🌍 Location Temp:  ${batch.location_temp ? batch.location_temp + '°C' : 'N/A'}`);
            console.log(`⏱️  Transit Time:   ${batch.transit_duration ? batch.transit_duration + ' hours' : 'N/A'}`);
            console.log('=========================\n');
        }
    } catch (err) {
        console.error('Error querying database:', err);
    } finally {
        client.release();
    }
};

checkLatestBatch();
