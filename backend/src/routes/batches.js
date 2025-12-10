import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import multer from 'multer';
import { query, getClient } from '../config/database.js';
import { authenticate, requireRole, optionalAuth } from '../middleware/auth.js';
import { uploadFile } from '../config/minio.js';
import { getFabricService } from '../config/fabric.js';
import { getIoTDefaults, getCropTypeEncoded } from '../config/iotConfig.js';
import { getLocationTemperature } from '../services/weatherService.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Per-role Fabric connection tracking
const fabricConnectedByRole = {};

const tryConnectFabric = async (role) => {
    const fabricService = getFabricService(role);
    if (!fabricService.isConnected()) {
        try {
            const connected = await fabricService.connect(role);
            fabricConnectedByRole[role] = connected;
            if (connected) {
                console.log(`✅ Connected to Hyperledger Fabric network as ${role}`);
            }
        } catch (err) {
            console.log(`⚠️ Fabric network not available for ${role}, using PostgreSQL only`);
            fabricConnectedByRole[role] = false;
        }
    }
    return fabricConnectedByRole[role] ? fabricService : null;
};

// Generate batch ID
const generateBatchId = (crop) => {
    const prefix = crop.substring(0, 3).toUpperCase();
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${year}-${random}`;
};

// Helper to update farmer reliability score
const updateFarmerScore = async (client, farmerId) => {
    try {
        // Get stats
        const stats = await client.query(
            `SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status IN ('received', 'sold')) as successful
             FROM batches 
             WHERE farmer_id = $1`,
            [farmerId]
        );

        const total = parseInt(stats.rows[0].total) || 0;
        const successful = parseInt(stats.rows[0].successful) || 0;

        if (total === 0) return;

        // Base score calculation
        let score = (successful / total) * 100;

        // Check verification bonus
        const farmer = await client.query(
            'SELECT verified FROM farmers WHERE id = $1',
            [farmerId]
        );

        if (farmer.rows[0]?.verified) {
            score = Math.min(100, score + 5); // Cap at 100
        }

        // Update farmer record
        await client.query(
            `UPDATE farmers 
             SET reliability_score = $1, 
                 total_batches = $2, 
                 successful_batches = $3 
             WHERE id = $4`,
            [score.toFixed(2), total, successful, farmerId]
        );

        console.log(`⭐ Updated score for farmer ${farmerId}: ${score.toFixed(2)}`);
    } catch (err) {
        console.error('Failed to update farmer score:', err);
    }
};

// Create a new batch (Farmer only)
router.post('/', authenticate, requireRole('farmer'), upload.any(), async (req, res) => {
    console.log('📂 Received files:', req.files);
    console.log('📝 Received body:', req.body);

    // Handle file from upload.any()
    if (req.files && req.files.length > 0) {
        const imageFile = req.files.find(f => f.fieldname === 'image');
        if (imageFile) {
            req.file = imageFile;
        } else {
            console.log('⚠️ No file with fieldname "image" found in:', req.files.map(f => f.fieldname));
        }
    }

    const client = await getClient();
    try {
        await client.query('BEGIN');
        const { crop, variety, quantity, unit, harvestDate, latitude, longitude, address } = req.body;

        if (!crop || !quantity) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Crop and quantity are required' });
        }

        // Get farmer profile
        const farmerResult = await client.query('SELECT * FROM farmers WHERE user_id = $1', [req.user.id]);

        if (farmerResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'Farmer profile not found',
                message: 'Please complete AgriStack onboarding first'
            });
        }

        const farmer = farmerResult.rows[0];
        const batchId = generateBatchId(crop);

        // Upload image if provided
        let imageUrls = [];
        if (req.file) {
            console.log('📸 Uploading image to MinIO:', req.file.originalname);
            const { url } = await uploadFile(req.file.originalname, req.file.buffer, req.file.mimetype);
            imageUrls.push(url);
            console.log('✅ Image uploaded:', url);
        } else {
            console.log('⚠️ No image file received');
        }

        // Generate QR code
        const qrData = JSON.stringify({
            batchId,
            crop,
            farmer: farmer.name,
            harvestDate,
            scanUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/scan/${batchId}`,
        });
        const qrCodeDataUrl = await QRCode.toDataURL(qrData, { width: 300 });

        // Upload QR code to MinIO
        const qrBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
        const { url: qrUrl } = await uploadFile(`qr-${batchId}.png`, qrBuffer, 'image/png');

        // Get IoT defaults for this crop type
        const iotDefaults = getIoTDefaults(crop);
        const cropTypeEncoded = getCropTypeEncoded(crop);
        console.log(`🌡️ IoT Defaults for ${crop}: crate=${iotDefaults.crate_temp}°C, reefer=${iotDefaults.reefer_temp}°C, humidity=${iotDefaults.humidity}%`);

        // Create batch with IoT defaults
        const result = await client.query(
            `INSERT INTO batches (
        batch_id, crop, variety, quantity, unit, harvest_date, farmer_id,
        current_owner_type, current_owner_id, status,
        origin_latitude, origin_longitude, origin_address,
        qr_code_url, image_urls,
        crate_temp, reefer_temp, humidity, crop_type_encoded
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
            [
                batchId, crop, variety || null, parseFloat(quantity), unit || 'kg',
                harvestDate || new Date(), farmer.id,
                'farmer', farmer.id, 'created',
                parseFloat(latitude) || null, parseFloat(longitude) || null, address || null,
                qrUrl, imageUrls.length > 0 ? imageUrls : null,
                iotDefaults.crate_temp, iotDefaults.reefer_temp, iotDefaults.humidity, cropTypeEncoded
            ]
        );

        const batch = result.rows[0];

        // Create initial journey event
        await client.query(
            `INSERT INTO journey_events (
        batch_id, event_type, actor_type, actor_id, actor_name,
        latitude, longitude, address, notes, image_urls
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
                batch.id, 'created', 'farmer', farmer.id, farmer.name,
                parseFloat(latitude) || null, parseFloat(longitude) || null,
                address || null, `Batch created by ${farmer.name}`, imageUrls
            ]
        );

        // Update farmer score (to reflect new total batch count)
        await updateFarmerScore(client, farmer.id);

        // Write to Hyperledger Fabric blockchain
        let blockchainTxId = null;
        try {
            const fabricService = await tryConnectFabric('farmer');
            if (fabricService) {
                const fabricResult = await fabricService.createBatch({
                    batchId,
                    farmerId: farmer.id,
                    farmerName: farmer.name,
                    agriStackId: farmer.agristack_id || '',
                    crop,
                    variety: variety || '',
                    quantity: parseFloat(quantity),
                    unit: unit || 'kg',
                    harvestDate: harvestDate || new Date().toISOString(),
                    originLat: parseFloat(latitude) || 0,
                    originLng: parseFloat(longitude) || 0,
                    originAddress: address || '',
                });
                blockchainTxId = fabricResult.txId;
                console.log(`✅ Batch ${batchId} recorded on blockchain: ${blockchainTxId}`);

                // Update batch with blockchain txId
                await client.query(
                    'UPDATE batches SET blockchain_tx_id = $1 WHERE id = $2',
                    [blockchainTxId, batch.id]
                );
            }
        } catch (fabricErr) {
            console.log('⚠️ Blockchain write failed (continuing with PostgreSQL):', fabricErr.message);
        }

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Batch created successfully',
            batch: {
                ...batch,
                qr_code_data_url: qrCodeDataUrl,
                blockchain_tx_hash: blockchainTxId,
            },
            farmer: {
                id: farmer.id,
                name: farmer.name,
                agristack_id: farmer.agristack_id,
            },
            blockchain: blockchainTxId ? {
                network: 'Hyperledger Fabric',
                channel: 'tracesafe-channel',
                chaincode: 'tracesafe',
                txId: blockchainTxId,
            } : null,
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Create batch error:', err);
        res.status(500).json({ error: 'Failed to create batch', details: err.message });
    } finally {
        client.release();
    }
});

// Get all retailers (for driver delivery dropdown)
router.get('/retailers', authenticate, requireRole('driver', 'admin'), async (req, res) => {
    try {
        const result = await query(
            `SELECT r.id, r.name, r.shop_name, r.phone, r.address, r.latitude, r.longitude
             FROM retailers r
             JOIN users u ON r.user_id = u.id
             ORDER BY r.name ASC`
        );

        res.json({
            retailers: result.rows,
            count: result.rows.length
        });
    } catch (err) {
        console.error('Get retailers error:', err);
        res.status(500).json({ error: 'Failed to fetch retailers', details: err.message });
    }
});

// Get all batches (filtered by role)
router.get('/', authenticate, async (req, res) => {
    try {
        const { status, crop, limit = 50, offset = 0 } = req.query;
        const user = req.user;

        let sql = `
      SELECT b.*, f.name as farmer_name, f.agristack_id
      FROM batches b
      LEFT JOIN farmers f ON b.farmer_id = f.id
      WHERE 1=1
    `;
        const params = [];
        let paramCount = 0;

        // Role-based filtering
        if (user.role === 'farmer') {
            const farmerResult = await query('SELECT id FROM farmers WHERE user_id = $1', [user.id]);
            if (farmerResult.rows.length > 0) {
                paramCount++;
                sql += ` AND b.farmer_id = $${paramCount}`;
                params.push(farmerResult.rows[0].id);
            }
        } else if (user.role === 'driver') {
            const driverResult = await query('SELECT id FROM drivers WHERE user_id = $1', [user.id]);
            if (driverResult.rows.length > 0) {
                paramCount++;
                sql += ` AND (b.current_owner_type = 'driver' AND b.current_owner_id = $${paramCount} OR b.status IN ('created', 'in_transit'))`;
                params.push(driverResult.rows[0].id);
            }
        } else if (user.role === 'retailer') {
            const retailerResult = await query('SELECT id FROM retailers WHERE user_id = $1', [user.id]);
            if (retailerResult.rows.length > 0) {
                paramCount++;
                sql += ` AND (b.current_owner_type = 'retailer' AND b.current_owner_id = $${paramCount} OR b.status = 'delivered')`;
                params.push(retailerResult.rows[0].id);
            }
        }
        // Admin sees all batches

        if (status) {
            paramCount++;
            sql += ` AND b.status = $${paramCount}`;
            params.push(status);
        }

        if (crop) {
            paramCount++;
            sql += ` AND b.crop ILIKE $${paramCount}`;
            params.push(`%${crop}%`);
        }

        sql += ` ORDER BY b.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await query(sql, params);

        res.json({
            batches: result.rows,
            limit: parseInt(limit),
            offset: parseInt(offset),
        });
    } catch (err) {
        console.error('Get batches error:', err);
        res.status(500).json({ error: 'Failed to fetch batches', details: err.message });
    }
});

// Get single batch by ID (public)
router.get('/:batchId', optionalAuth, async (req, res) => {
    try {
        const { batchId } = req.params;

        const result = await query(
            `SELECT b.*, f.name as farmer_name, f.agristack_id, f.district, f.state
       FROM batches b
       LEFT JOIN farmers f ON b.farmer_id = f.id
       WHERE b.batch_id = $1`,
            [batchId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Batch not found' });
        }

        const batch = result.rows[0];

        // Get journey events
        const journeyResult = await query(
            `SELECT * FROM journey_events WHERE batch_id = $1 ORDER BY created_at ASC`,
            [batch.id]
        );

        res.json({
            batch,
            journey: journeyResult.rows,
        });
    } catch (err) {
        console.error('Get batch error:', err);
        res.status(500).json({ error: 'Failed to fetch batch', details: err.message });
    }
});

// Update transit status (Driver)
router.post('/:batchId/transit', authenticate, requireRole('driver'), upload.any(), async (req, res) => {
    // Handle file from upload.any()
    if (req.files && req.files.length > 0) {
        const imageFile = req.files.find(f => f.fieldname === 'image');
        if (imageFile) req.file = imageFile;
    }
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const { batchId } = req.params;
        const { latitude, longitude, temperature, humidity, notes } = req.body;

        // Get or create driver profile
        let driverResult = await client.query('SELECT * FROM drivers WHERE user_id = $1', [req.user.id]);

        if (driverResult.rows.length === 0) {
            // Create driver profile
            driverResult = await client.query(
                'INSERT INTO drivers (user_id, name, phone) VALUES ($1, $2, $3) RETURNING *',
                [req.user.id, req.user.name, req.user.phone]
            );
        }
        const driver = driverResult.rows[0];

        // Upload image if present
        let imageUrls = [];
        if (req.file) {
            const { url } = await uploadFile(req.file.originalname, req.file.buffer, req.file.mimetype);
            imageUrls.push(url);
        }

        // Verify batch exists and is in 'in_transit' status and owned by driver
        const batchCheck = await client.query(
            "SELECT * FROM batches WHERE batch_id = $1 AND status = 'in_transit' AND current_owner_id = $2",
            [batchId, driver.id]
        );

        if (batchCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Batch not found or not in your possession' });
        }

        // Update batch status and owner
        await client.query(
            `UPDATE batches SET status = 'in_transit', current_owner_type = 'driver', current_owner_id = $1 WHERE id = $2`,
            [driver.id, batchCheck.rows[0].id]
        );

        // Record journey event
        await client.query(
            `INSERT INTO journey_events
            (batch_id, event_type, actor_type, actor_id, actor_name, latitude, longitude, temperature, humidity, notes, image_urls)
            VALUES ($1, 'transit_update', 'driver', $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                batchCheck.rows[0].id,
                driver.id,
                driver.name,
                parseFloat(latitude) || null,
                parseFloat(longitude) || null,
                parseFloat(temperature) || null,
                parseFloat(humidity) || null,
                notes,
                imageUrls
            ]
        );

        await client.query('COMMIT');

        res.json({
            message: 'Transit updated successfully',
            batch_id: batchId,
            status: 'in_transit',
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Transit update error:', err);
        res.status(500).json({ error: 'Failed to update transit', details: err.message });
    } finally {
        client.release();
    }
});



// Pickup batch (Driver)
router.post('/:batchId/pickup', authenticate, requireRole('driver'), upload.any(), async (req, res) => {
    // Handle file from upload.any()
    if (req.files && req.files.length > 0) {
        const imageFile = req.files.find(f => f.fieldname === 'image');
        if (imageFile) req.file = imageFile;
    }
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const { batchId } = req.params;
        const { latitude, longitude, notes } = req.body;

        // Get or create driver profile
        let driverResult = await client.query('SELECT * FROM drivers WHERE user_id = $1', [req.user.id]);

        if (driverResult.rows.length === 0) {
            driverResult = await client.query(
                'INSERT INTO drivers (user_id, name, phone) VALUES ($1, $2, $3) RETURNING *',
                [req.user.id, req.user.name, req.user.phone]
            );
        }
        const driver = driverResult.rows[0];

        // Upload image if present
        let imageUrls = [];
        if (req.file) {
            const { url } = await uploadFile(req.file.originalname, req.file.buffer, req.file.mimetype);
            imageUrls.push(url);
        }

        // Verify batch exists and is in 'created' status
        const batchCheck = await client.query(
            "SELECT * FROM batches WHERE batch_id = $1 AND status = 'created'",
            [batchId]
        );

        if (batchCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Batch not found or not ready for pickup' });
        }

        const batch = batchCheck.rows[0];

        // Fetch location temperature from OpenWeather API
        let locationTemp = batch.location_temp || 22.0;
        try {
            if (latitude && longitude) {
                locationTemp = await getLocationTemperature(parseFloat(latitude), parseFloat(longitude));
                console.log(`🌡️ Location temp for pickup: ${locationTemp}°C`);
            }
        } catch (weatherErr) {
            console.log('⚠️ Blockchain write failed (continuing with PostgreSQL):', weatherErr.message);
        }

        // Update batch status with transit_start_time and location_temp
        const batchResult = await client.query(
            `UPDATE batches
            SET status = 'in_transit',
                current_owner_type = 'driver',
                current_owner_id = $1,
                transit_start_time = NOW(),
                location_temp = $3
            WHERE batch_id = $2
            RETURNING *`,
            [driver.id, batchId, locationTemp]
        );

        // Create transfer record
        await client.query(
            `INSERT INTO transfers (batch_id, from_type, from_id, to_type, to_id, latitude, longitude, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [batch.id, batch.current_owner_type, batch.current_owner_id, 'driver', driver.id,
            parseFloat(latitude) || null, parseFloat(longitude) || null, notes]
        );

        // Record journey event
        await client.query(
            `INSERT INTO journey_events
            (batch_id, event_type, actor_type, actor_id, actor_name, latitude, longitude, notes, image_urls)
            VALUES ($1, 'pickup', 'driver', $2, $3, $4, $5, $6, $7)`,
            [
                batchResult.rows[0].id,
                driver.id,
                driver.name,
                parseFloat(latitude) || null,
                parseFloat(longitude) || null,
                notes || `Picked up by driver ${driver.name}`,
                imageUrls
            ]
        );

        // Record on blockchain
        let blockchainTxId = null;
        try {
            const fabricService = await tryConnectFabric('driver');
            if (fabricService) {
                // Append IoT data to notes for blockchain immutability
                const blockchainNotes = `${notes || ''} | IoT: Location Temp ${locationTemp}°C`.trim();

                const fabricResult = await fabricService.recordPickup(
                    batchId,
                    driver.name,
                    parseFloat(latitude) || 0,
                    parseFloat(longitude) || 0,
                    blockchainNotes
                );
                blockchainTxId = fabricResult.txId;
                console.log(`✅ Pickup ${batchId} recorded on blockchain: ${blockchainTxId}`);
            }
        } catch (fabricErr) {
            console.log('⚠️ Blockchain write failed (continuing with PostgreSQL):', fabricErr.message);
        }

        await client.query('COMMIT');

        res.json({
            message: 'Batch picked up successfully',
            batch_id: batchId,
            status: 'in_transit',
            blockchain_tx_id: blockchainTxId,
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Pickup error:', err);
        res.status(500).json({ error: 'Failed to pickup batch', details: err.message });
    } finally {
        client.release();
    }
});

// Deliver batch (Driver delivers to retailer)
router.post('/:batchId/deliver', authenticate, requireRole('driver'), upload.any(), async (req, res) => {
    // Handle file from upload.any()
    if (req.files && req.files.length > 0) {
        const imageFile = req.files.find(f => f.fieldname === 'image');
        if (imageFile) req.file = imageFile;
    }
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const { batchId } = req.params;
        const { latitude, longitude, retailerId, notes } = req.body;

        // VALIDATION: Retailer must be specified for delivery
        if (!retailerId) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'Retailer ID required',
                message: 'You must specify which retailer you are delivering to'
            });
        }

        // Validate retailer exists
        const retailerCheck = await client.query('SELECT * FROM retailers WHERE id = $1', [retailerId]);
        if (retailerCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Retailer not found' });
        }
        const targetRetailer = retailerCheck.rows[0];

        const batchResult = await client.query('SELECT * FROM batches WHERE batch_id = $1', [batchId]);

        if (batchResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Batch not found' });
        }

        const batch = batchResult.rows[0];

        if (batch.status !== 'in_transit') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Batch must be in transit to deliver', status: batch.status });
        }

        const driverResult = await client.query('SELECT * FROM drivers WHERE user_id = $1', [req.user.id]);
        const driver = driverResult.rows[0];

        // VALIDATION: Driver must be the current owner
        if (batch.current_owner_type !== 'driver' || batch.current_owner_id !== driver.id) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'You are not the current owner of this batch' });
        }

        // Upload image if present
        let imageUrls = [];
        if (req.file) {
            const { url } = await uploadFile(req.file.originalname, req.file.buffer, req.file.mimetype);
            imageUrls.push(url);
        }

        // Calculate transit duration in hours
        let transitDuration = null;
        if (batch.transit_start_time) {
            const startTime = new Date(batch.transit_start_time);
            const endTime = new Date();
            transitDuration = Math.round((endTime - startTime) / (1000 * 60 * 60)); // hours
            console.log(`⏱️ Transit duration for ${batchId}: ${transitDuration} hours`);
        }

        // Update batch with delivery info, pending retailer, and delivery location
        await client.query(
            `UPDATE batches SET 
                status = 'delivered', 
                transit_end_time = NOW(),
                transit_duration = $2,
                pending_retailer_id = $3,
                delivery_latitude = $4,
                delivery_longitude = $5
            WHERE id = $1`,
            [batch.id, transitDuration, retailerId, parseFloat(latitude) || null, parseFloat(longitude) || null]
        );

        // Create journey event
        await client.query(
            `INSERT INTO journey_events (
        batch_id, event_type, actor_type, actor_id, actor_name,
        latitude, longitude, notes, image_urls
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [batch.id, 'delivery', 'driver', driver.id, driver.name,
            parseFloat(latitude) || null, parseFloat(longitude) || null,
            notes || `Delivered by driver ${driver.name}`, imageUrls]
        );

        // Record on blockchain
        let blockchainTxId = null;
        try {
            const fabricService = await tryConnectFabric('driver');
            if (fabricService) {
                // Append IoT data to notes for blockchain immutability
                const blockchainNotes = `${notes || ''} | IoT: Transit Duration ${transitDuration || 0}h`.trim();

                const fabricResult = await fabricService.recordDelivery(
                    batchId,
                    driver.name,
                    '',  // retailerName not available here
                    parseFloat(latitude) || 0,
                    parseFloat(longitude) || 0,
                    blockchainNotes
                );
                blockchainTxId = fabricResult.txId;
                console.log(`✅ Delivery ${batchId} recorded on blockchain: ${blockchainTxId}`);
            }
        } catch (fabricErr) {
            console.log('⚠️ Blockchain write failed (continuing with PostgreSQL):', fabricErr.message);
        }

        // CRITICAL: Commit the transaction
        await client.query('COMMIT');

        res.json({
            message: 'Batch delivered successfully',
            batch_id: batchId,
            status: 'delivered',
            blockchain_tx_id: blockchainTxId,
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Deliver error:', err);
        res.status(500).json({ error: 'Failed to deliver batch', details: err.message });
    } finally {
        client.release();
    }
});

// Receive batch (Retailer receives)
router.post('/:batchId/receive', authenticate, requireRole('retailer'), async (req, res) => {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const { batchId } = req.params;
        const { latitude, longitude, notes } = req.body;

        const batchResult = await client.query('SELECT * FROM batches WHERE batch_id = $1', [batchId]);

        if (batchResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Batch not found' });
        }

        const batch = batchResult.rows[0];

        // VALIDATION: Batch must be in 'delivered' status (driver must deliver first)
        if (batch.status !== 'delivered') {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'Batch not delivered yet',
                message: 'The driver must mark this batch as delivered before you can receive it',
                current_status: batch.status
            });
        }

        // Get or create retailer profile
        let retailerResult = await client.query('SELECT * FROM retailers WHERE user_id = $1', [req.user.id]);

        if (retailerResult.rows.length === 0) {
            retailerResult = await client.query(
                'INSERT INTO retailers (user_id, name, phone) VALUES ($1, $2, $3) RETURNING *',
                [req.user.id, req.user.name, req.user.phone]
            );
        }

        const retailer = retailerResult.rows[0];

        // VALIDATION: Only the designated retailer can receive this batch
        if (batch.pending_retailer_id && batch.pending_retailer_id !== retailer.id) {
            await client.query('ROLLBACK');
            return res.status(403).json({
                error: 'Not authorized to receive this batch',
                message: 'This batch was delivered to a different retailer'
            });
        }

        // Update batch
        await client.query(
            `UPDATE batches SET status = 'received', current_owner_type = 'retailer', current_owner_id = $1 WHERE id = $2`,
            [retailer.id, batch.id]
        );

        // Create transfer record
        await client.query(
            `INSERT INTO transfers (batch_id, from_type, from_id, to_type, to_id, latitude, longitude, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [batch.id, batch.current_owner_type, batch.current_owner_id, 'retailer', retailer.id,
            parseFloat(latitude) || null, parseFloat(longitude) || null, notes]
        );

        // Create journey event
        await client.query(
            `INSERT INTO journey_events (
        batch_id, event_type, actor_type, actor_id, actor_name,
        latitude, longitude, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [batch.id, 'received', 'retailer', retailer.id, retailer.name,
            parseFloat(latitude) || null, parseFloat(longitude) || null,
            notes || `Received by retailer ${retailer.name}`]
        );

        // Update farmer score (successful delivery)
        await updateFarmerScore(client, batch.farmer_id);

        // Record on blockchain
        let blockchainTxId = null;
        let retries = 3;
        while (retries > 0) {
            try {
                const fabricService = await tryConnectFabric('retailer');
                if (fabricService) {
                    const fabricResult = await fabricService.recordReceipt(
                        batchId,
                        retailer.name,
                        parseFloat(latitude) || 0,
                        parseFloat(longitude) || 0,
                        notes || ''
                    );
                    blockchainTxId = fabricResult.txId;
                    console.log(`✅ Receipt ${batchId} recorded on blockchain: ${blockchainTxId}`);
                    break; // Success, exit loop
                } else {
                    console.log('⚠️ Fabric service not available, retrying...');
                }
            } catch (fabricErr) {
                console.log(`⚠️ Blockchain write failed (attempt ${4 - retries}/3):`, fabricErr.message);
                if (retries === 1) {
                    console.log('❌ Giving up on blockchain write after 3 attempts');
                } else {
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
                }
            }
            retries--;
        }

        await client.query('COMMIT');

        res.json({
            message: 'Batch received successfully',
            batch_id: batchId,
            status: 'received',
            blockchain_tx_id: blockchainTxId,
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Receive error:', err);
        res.status(500).json({ error: 'Failed to receive batch', details: err.message });
    } finally {
        client.release();
    }
});

// Mark batch as sold (Retailer only)
router.post('/:batchId/sell', authenticate, requireRole('retailer'), async (req, res) => {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const { batchId } = req.params;
        const { notes } = req.body;

        const batchResult = await client.query('SELECT * FROM batches WHERE batch_id = $1', [batchId]);

        if (batchResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Batch not found' });
        }

        const batch = batchResult.rows[0];

        if (batch.status !== 'received') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Batch must be received before selling', status: batch.status });
        }

        const retailerResult = await client.query('SELECT * FROM retailers WHERE user_id = $1', [req.user.id]);
        const retailer = retailerResult.rows[0];

        // Update batch
        await client.query('UPDATE batches SET status = $1 WHERE id = $2', ['sold', batch.id]);

        // Create journey event
        await client.query(
            `INSERT INTO journey_events (
        batch_id, event_type, actor_type, actor_id, actor_name, notes
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [batch.id, 'sold', 'retailer', retailer.id, retailer.name, notes || `Sold by ${retailer.name}`]
        );

        // Update farmer score (successful sale)
        await updateFarmerScore(client, batch.farmer_id);

        // Record on blockchain
        let blockchainTxId = null;
        try {
            const fabricService = await tryConnectFabric('retailer');
            if (fabricService) {
                const fabricResult = await fabricService.recordSale(
                    batchId,
                    retailer.name,
                    notes || ''
                );
                blockchainTxId = fabricResult.txId;
                console.log(`✅ Sale ${batchId} recorded on blockchain: ${blockchainTxId}`);
            }
        } catch (fabricErr) {
            console.log('⚠️ Blockchain write failed (continuing with PostgreSQL):', fabricErr.message);
        }

        await client.query('COMMIT');

        res.json({
            message: 'Batch marked as sold',
            batch_id: batchId,
            status: 'sold',
            blockchain_tx_id: blockchainTxId,
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Sell error:', err);
        res.status(500).json({ error: 'Failed to mark batch as sold', details: err.message });
    } finally {
        client.release();
    }
});

// Get batch journey/history (public)
router.get('/:batchId/journey', async (req, res) => {
    try {
        const { batchId } = req.params;

        const batchResult = await query(
            `SELECT b.*, f.name as farmer_name, f.agristack_id, f.verified as farmer_verified,
              af.registry_status as agristack_status
       FROM batches b
       LEFT JOIN farmers f ON b.farmer_id = f.id
       LEFT JOIN agristack_farmers af ON f.agristack_id = af.farmer_id
       WHERE b.batch_id = $1`,
            [batchId]
        );

        if (batchResult.rows.length === 0) {
            return res.status(404).json({ error: 'Batch not found' });
        }

        const batch = batchResult.rows[0];

        const journeyResult = await query(
            `SELECT * FROM journey_events WHERE batch_id = $1 ORDER BY created_at ASC`,
            [batch.id]
        );

        const transfersResult = await query(
            `SELECT * FROM transfers WHERE batch_id = $1 ORDER BY transfer_date ASC`,
            [batch.id]
        );

        res.json({
            batch: {
                id: batch.batch_id,
                crop: batch.crop,
                variety: batch.variety,
                quantity: `${batch.quantity} ${batch.unit}`,
                harvest_date: batch.harvest_date,
                status: batch.status,
                origin: {
                    latitude: batch.origin_latitude,
                    longitude: batch.origin_longitude,
                    address: batch.origin_address,
                },
                qr_code_url: batch.qr_code_url,
                created_at: batch.created_at,
            },
            farmer: {
                name: batch.farmer_name,
                agristack_id: batch.agristack_id,
                verified: batch.farmer_verified,
                agristack_status: batch.agristack_status,
            },
            journey: journeyResult.rows.map(event => ({
                event_type: event.event_type,
                actor: event.actor_name,
                actor_type: event.actor_type,
                location: {
                    latitude: event.latitude,
                    longitude: event.longitude,
                    address: event.address,
                },
                data: {
                    temperature: event.temperature,
                    humidity: event.humidity,
                },
                notes: event.notes,
                timestamp: event.created_at,
            })),
            transfers: transfersResult.rows,
        });
    } catch (err) {
        console.error('Get journey error:', err);
        res.status(500).json({ error: 'Failed to fetch journey', details: err.message });
    }
});

export default router;
