import fs from 'fs';
import path from 'path';
import pool from './db';

const migrate = async () => {
    const client = await pool.connect();
    try {
        console.log('Starting migration...');
        const curDir = __dirname;
        // Assuming migration file is at ../migrations/001_create_tables.sql relative to src/
        const migrationPath = path.join(curDir, '..', 'migrations', '001_create_tables.sql');

        if (!fs.existsSync(migrationPath)) {
            throw new Error(`Migration file not found at ${migrationPath}`);
        }

        const sql = fs.readFileSync(migrationPath, 'utf8');
        await client.query(sql);
        console.log('Migration complete');
    } catch (err) {
        console.error('Migration failed', err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
};

migrate();
