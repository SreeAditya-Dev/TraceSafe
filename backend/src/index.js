import express from 'express';
import cors from 'cors';
import { initMinioBucket } from './config/minio.js';
import { query } from './config/database.js';

// Routes
import authRoutes from './routes/auth.js';
import agristackRoutes from './routes/agristack.js';
import batchRoutes from './routes/batches.js';
import mediaRoutes from './routes/media.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: '*',
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} | ${req.method} ${req.path}`);
    next();
});

// Health check
app.get('/health', async (req, res) => {
    try {
        await query('SELECT 1');
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: 'connected',
        });
    } catch (err) {
        res.status(500).json({
            status: 'unhealthy',
            error: err.message,
        });
    }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/agristack', agristackRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/media', mediaRoutes);

// Dashboard stats endpoint
app.get('/api/stats', async (req, res) => {
    try {
        const [batchesResult, farmersResult, journeyResult, agristackResult] = await Promise.all([
            query(`SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'created') as created,
        COUNT(*) FILTER (WHERE status = 'in_transit') as in_transit,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
        COUNT(*) FILTER (WHERE status = 'received') as received,
        COUNT(*) FILTER (WHERE status = 'sold') as sold
        FROM batches`),
            query('SELECT COUNT(*) FROM farmers'),
            query('SELECT COUNT(*) FROM journey_events'),
            query(`SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE verified = true) as verified
        FROM agristack_farmers`),
        ]);

        res.json({
            batches: {
                total: parseInt(batchesResult.rows[0].total),
                created: parseInt(batchesResult.rows[0].created),
                in_transit: parseInt(batchesResult.rows[0].in_transit),
                delivered: parseInt(batchesResult.rows[0].delivered),
                received: parseInt(batchesResult.rows[0].received),
                sold: parseInt(batchesResult.rows[0].sold),
            },
            farmers: {
                registered: parseInt(farmersResult.rows[0].count),
            },
            journey_events: parseInt(journeyResult.rows[0].count),
            agristack: {
                total: parseInt(agristackResult.rows[0].total),
                verified: parseInt(agristackResult.rows[0].verified),
            },
        });
    } catch (err) {
        console.error('Stats error:', err);
        res.status(500).json({ error: 'Failed to fetch stats', details: err.message });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found', path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Initialize and start server
const startServer = async () => {
    try {
        // Test database connection
        await query('SELECT NOW()');
        console.log('✅ Database connection established');

        // Initialize MinIO bucket
        await initMinioBucket();
        console.log('✅ MinIO initialized');

        app.listen(PORT, () => {
            console.log(`\n🚀 TraceSafe Backend running on http://localhost:${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/health`);
            console.log(`📚 API Endpoints:`);
            console.log(`   - POST /api/auth/register`);
            console.log(`   - POST /api/auth/login`);
            console.log(`   - POST /api/auth/quick-login`);
            console.log(`   - GET  /api/agristack`);
            console.log(`   - GET  /api/agristack/verify/:farmerId`);
            console.log(`   - POST /api/agristack/onboard`);
            console.log(`   - GET  /api/batches`);
            console.log(`   - POST /api/batches`);
            console.log(`   - GET  /api/batches/:batchId`);
            console.log(`   - POST /api/batches/:batchId/pickup`);
            console.log(`   - POST /api/batches/:batchId/transit`);
            console.log(`   - POST /api/batches/:batchId/deliver`);
            console.log(`   - POST /api/batches/:batchId/receive`);
            console.log(`   - POST /api/batches/:batchId/sell`);
            console.log(`   - GET  /api/batches/:batchId/journey`);
            console.log(`   - POST /api/media/upload`);
            console.log(`   - GET  /api/stats\n`);
        });
    } catch (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    }
};

startServer();
