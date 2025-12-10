import express from 'express';
import { query } from '../config/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all AgriStack farmers (for verification lookup)
router.get('/', async (req, res) => {
    try {
        const { search, verified, limit = 50, offset = 0 } = req.query;

        let sql = 'SELECT * FROM agristack_farmers WHERE 1=1';
        const params = [];
        let paramCount = 0;

        if (search) {
            paramCount++;
            sql += ` AND (farmer_id ILIKE $${paramCount} OR name ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }

        if (verified !== undefined) {
            paramCount++;
            sql += ` AND verified = $${paramCount}`;
            params.push(verified === 'true');
        }

        sql += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await query(sql, params);

        // Get total count
        let countSql = 'SELECT COUNT(*) FROM agristack_farmers WHERE 1=1';
        const countParams = [];
        let countParamIdx = 0;

        if (search) {
            countParamIdx++;
            countSql += ` AND (farmer_id ILIKE $${countParamIdx} OR name ILIKE $${countParamIdx})`;
            countParams.push(`%${search}%`);
        }
        if (verified !== undefined) {
            countParamIdx++;
            countSql += ` AND verified = $${countParamIdx}`;
            countParams.push(verified === 'true');
        }

        const countResult = await query(countSql, countParams);

        res.json({
            farmers: result.rows,
            total: parseInt(countResult.rows[0].count),
            limit: parseInt(limit),
            offset: parseInt(offset),
        });
    } catch (err) {
        console.error('Get AgriStack farmers error:', err);
        res.status(500).json({ error: 'Failed to fetch farmers', details: err.message });
    }
});

// Verify farmer ID against AgriStack
router.get('/verify/:farmerId', async (req, res) => {
    try {
        const { farmerId } = req.params;

        const result = await query(
            'SELECT * FROM agristack_farmers WHERE farmer_id = $1',
            [farmerId]
        );

        if (result.rows.length === 0) {
            return res.json({
                exists: false,
                message: 'Farmer ID not found in AgriStack registry',
            });
        }

        const farmer = result.rows[0];

        res.json({
            exists: true,
            verified: farmer.verified,
            farmer: {
                farmer_id: farmer.farmer_id,
                name: farmer.name,
                land: farmer.land,
                crops: farmer.crops,
                verified: farmer.verified,
                registry_status: farmer.registry_status,
            },
        });
    } catch (err) {
        console.error('Verify farmer error:', err);
        res.status(500).json({ error: 'Verification failed', details: err.message });
    }
});

// Onboard farmer (link AgriStack ID to platform account)
router.post('/onboard', authenticate, requireRole('farmer', 'admin'), async (req, res) => {
    try {
        const { agristackId, phone, state, district, village } = req.body;

        if (!agristackId) {
            return res.status(400).json({ error: 'AgriStack ID is required' });
        }

        // Verify AgriStack ID exists
        const agristackResult = await query(
            'SELECT * FROM agristack_farmers WHERE farmer_id = $1',
            [agristackId]
        );

        if (agristackResult.rows.length === 0) {
            return res.status(404).json({
                error: 'AgriStack ID not found',
                message: 'This ID does not exist in the AgriStack registry. Please verify your ID.'
            });
        }

        const agristackFarmer = agristackResult.rows[0];

        // Check if already onboarded
        const existingFarmer = await query(
            'SELECT * FROM farmers WHERE agristack_id = $1',
            [agristackId]
        );

        if (existingFarmer.rows.length > 0) {
            return res.status(409).json({
                error: 'Already onboarded',
                message: 'This AgriStack ID is already linked to a TraceSafe account'
            });
        }

        // Parse land value to decimal
        const landMatch = agristackFarmer.land?.match(/[\d.]+/);
        const landAcres = landMatch ? parseFloat(landMatch[0]) : null;

        // Parse crops to array
        const cropsArray = agristackFarmer.crops
            ? agristackFarmer.crops.split(',').map(c => c.trim())
            : [];

        // Create farmer profile
        const result = await query(
            `INSERT INTO farmers (user_id, agristack_id, name, phone, state, district, village, land_acres, crops, verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
            [
                req.user.id,
                agristackId,
                agristackFarmer.name,
                phone || null,
                state || agristackFarmer.state,
                district || agristackFarmer.district,
                village || agristackFarmer.village,
                landAcres,
                cropsArray,
                agristackFarmer.verified,
            ]
        );

        res.status(201).json({
            message: 'Farmer onboarded successfully',
            farmer: result.rows[0],
            agristack: agristackFarmer,
        });
    } catch (err) {
        console.error('Onboard farmer error:', err);
        res.status(500).json({ error: 'Onboarding failed', details: err.message });
    }
});

// Get AgriStack statistics
router.get('/stats', async (req, res) => {
    try {
        const totalResult = await query('SELECT COUNT(*) FROM agristack_farmers');
        const verifiedResult = await query('SELECT COUNT(*) FROM agristack_farmers WHERE verified = true');
        const pendingResult = await query('SELECT COUNT(*) FROM agristack_farmers WHERE verified = false');
        const linkedResult = await query('SELECT COUNT(*) FROM farmers');

        res.json({
            total_registered: parseInt(totalResult.rows[0].count),
            total_verified: parseInt(verifiedResult.rows[0].count),
            pending_verification: parseInt(pendingResult.rows[0].count),
            linked_to_tracesafe: parseInt(linkedResult.rows[0].count),
        });
    } catch (err) {
        console.error('Get stats error:', err);
        res.status(500).json({ error: 'Failed to fetch stats', details: err.message });
    }
});

// Sync data (admin only) - refresh from external AgriStack
router.post('/sync', authenticate, requireRole('admin'), async (req, res) => {
    try {
        // In production, this would fetch from actual AgriStack API
        // For now, we return the current state
        const result = await query('SELECT COUNT(*) as count, MAX(updated_at) as last_sync FROM agristack_farmers');

        res.json({
            message: 'AgriStack data is up to date',
            records: parseInt(result.rows[0].count),
            last_sync: result.rows[0].last_sync,
        });
    } catch (err) {
        console.error('Sync error:', err);
        res.status(500).json({ error: 'Sync failed', details: err.message });
    }
});

export default router;
