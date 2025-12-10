import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// --- e-NAM Endpoints ---

// Get commodity prices (Mocked but served from backend)
router.get('/enam/prices', async (req, res) => {
    try {
        // In a real system, this would fetch from e-NAM API
        const prices = [
            { market: "Azadpur (Delhi)", commodity: "Wheat", minPrice: 2100, maxPrice: 2350, modalPrice: 2225, date: new Date().toISOString().split('T')[0] },
            { market: "Vashi (Mumbai)", commodity: "Onion", minPrice: 1200, maxPrice: 1800, modalPrice: 1550, date: new Date().toISOString().split('T')[0] },
            { market: "Kolar (Karnataka)", commodity: "Tomato", minPrice: 800, maxPrice: 1500, modalPrice: 1100, date: new Date().toISOString().split('T')[0] },
            { market: "Guntur (Andhra)", commodity: "Chilli", minPrice: 12000, maxPrice: 15500, modalPrice: 14200, date: new Date().toISOString().split('T')[0] },
            { market: "Indore (MP)", commodity: "Soybean", minPrice: 3800, maxPrice: 4200, modalPrice: 4050, date: new Date().toISOString().split('T')[0] },
        ];
        res.json(prices);
    } catch (err) {
        console.error('e-NAM prices error:', err);
        res.status(500).json({ error: 'Failed to fetch prices' });
    }
});

// --- FSSAI Endpoints ---

// Verify FSSAI License (Mock logic)
router.get('/fssai/license/:number', async (req, res) => {
    try {
        const { number } = req.params;

        // Mock validation logic
        if (!number || number.length !== 14) {
            return res.status(400).json({ error: 'Invalid license number format' });
        }

        // Deterministic mock response based on last digit
        const lastDigit = parseInt(number.slice(-1));
        const isValid = lastDigit % 2 !== 0; // Odd numbers are valid

        if (isValid) {
            res.json({
                valid: true,
                licenseNumber: number,
                entityName: "TraceSafe Certified Entity",
                entityType: "Manufacturer/Processor",
                status: "Active",
                issueDate: "2023-01-15",
                expiryDate: "2028-01-14",
                state: "Multi-State"
            });
        } else {
            res.json({
                valid: false,
                status: "Expired or Invalid",
                message: "License number not found or expired"
            });
        }
    } catch (err) {
        console.error('FSSAI license check error:', err);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// Get Batch Compliance Data (Derived from real batches)
router.get('/fssai/compliance', async (req, res) => {
    try {
        // Fetch real batches and determine compliance based on data completeness
        const result = await query(`
            SELECT b.batch_id, b.crop, b.status, b.created_at,
                   f.name as farmer_name
            FROM batches b
            JOIN farmers f ON b.farmer_id = f.id
            ORDER BY b.created_at DESC
            LIMIT 20
        `);

        const complianceData = result.rows.map(batch => {
            // Logic: If batch has completed journey (received/sold), it's compliant.
            // If in transit, it's under review.
            let status = "Under Review";
            let risk = "Medium";

            if (['received', 'sold'].includes(batch.status)) {
                status = "Compliant";
                risk = "Low";
            } else if (batch.status === 'created') {
                status = "Pending";
                risk = "Low";
            }

            return {
                batchId: batch.batch_id,
                commodity: batch.crop,
                riskAssessment: risk,
                status: status,
                lastUpdated: new Date(batch.created_at).toISOString().split('T')[0]
            };
        });

        res.json(complianceData);
    } catch (err) {
        console.error('FSSAI compliance error:', err);
        res.status(500).json({ error: 'Failed to fetch compliance data' });
    }
});

export default router;
