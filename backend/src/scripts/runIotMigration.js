// Run IoT migration using the same DB connection as the app
import { query } from '../config/database.js';
import fs from 'fs';

const runMigration = async () => {
    const sqlPath = '../../migrations/add_iot_columns.sql';

    try {
        const sql = fs.readFileSync(sqlPath, 'utf8');
        // Split by semicolons and run each statement
        const statements = sql.split(';').filter(s => s.trim() && !s.includes('RAISE NOTICE'));

        for (const statement of statements) {
            if (statement.trim()) {
                console.log('Running:', statement.substring(0, 80) + '...');
                await query(statement);
            }
        }

        console.log('✅ IoT columns migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
};

runMigration();
