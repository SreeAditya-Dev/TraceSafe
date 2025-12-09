import { query } from '../config/database.js';

const recalculateScores = async () => {
    try {
        console.log('🔄 Starting score recalculation for all farmers...');

        // Get all farmers
        const farmers = await query('SELECT id, verified FROM farmers');

        console.log(`Found ${farmers.rows.length} farmers.`);

        for (const farmer of farmers.rows) {
            // Get stats for this farmer
            const stats = await query(
                `SELECT 
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status IN ('received', 'sold')) as successful
                 FROM batches 
                 WHERE farmer_id = $1`,
                [farmer.id]
            );

            const total = parseInt(stats.rows[0].total) || 0;
            const successful = parseInt(stats.rows[0].successful) || 0;

            // Calculate score
            let score = 50.00; // Default
            if (total > 0) {
                score = (successful / total) * 100;

                // Bonus for verification
                if (farmer.verified) {
                    score = Math.min(100, score + 5);
                }
            }

            // Update farmer record
            await query(
                `UPDATE farmers 
                 SET reliability_score = $1, 
                     total_batches = $2, 
                     successful_batches = $3 
                 WHERE id = $4`,
                [score.toFixed(2), total, successful, farmer.id]
            );

            console.log(`✅ Updated Farmer ${farmer.id}: Score=${score.toFixed(2)}, Total=${total}, Successful=${successful}`);
        }

        console.log('🎉 Recalculation complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Recalculation failed:', err);
        process.exit(1);
    }
};

recalculateScores();
