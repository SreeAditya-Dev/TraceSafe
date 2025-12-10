import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { JWT_SECRET, authenticate } from '../middleware/auth.js';

const router = express.Router();

// Register a new user
router.post('/register', async (req, res) => {
    try {
        const { email, password, name, role, phone } = req.body;

        if (!email || !password || !name || !role) {
            return res.status(400).json({ error: 'Missing required fields: email, password, name, role' });
        }

        const validRoles = ['farmer', 'driver', 'retailer', 'admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
        }

        // Check if user exists
        const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const result = await query(
            `INSERT INTO users (email, password_hash, name, role, phone) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, email, name, role, phone, created_at`,
            [email, passwordHash, name, role, phone]
        );

        const user = result.rows[0];

        // Create role-specific profile
        if (role === 'retailer') {
            await query(
                `INSERT INTO retailers (user_id, name, phone, shop_name) 
                 VALUES ($1, $2, $3, $4)`,
                [user.id, name, phone, `${name}'s Shop`]
            );
        } else if (role === 'driver') {
            await query(
                `INSERT INTO drivers (user_id, name, phone) 
                 VALUES ($1, $2, $3)`,
                [user.id, name, phone]
            );
        }

        // Generate token
        const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                phone: user.phone,
            },
            token,
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Registration failed', details: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Find user
        const result = await query('SELECT * FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        // Check password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                phone: user.phone,
            },
            token,
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed', details: err.message });
    }
});

// AgriStack Farmer ID Login (farmers login with their AgriStack ID)
router.post('/agristack-login', async (req, res) => {
    try {
        const { agristackId } = req.body;

        if (!agristackId) {
            return res.status(400).json({ error: 'AgriStack Farmer ID required' });
        }

        // Check if farmer exists in AgriStack registry
        const agristackResult = await query(
            'SELECT * FROM agristack_farmers WHERE farmer_id = $1',
            [agristackId]
        );

        if (agristackResult.rows.length === 0) {
            return res.status(401).json({ error: 'AgriStack Farmer ID not found in registry' });
        }

        const agristackFarmer = agristackResult.rows[0];

        // Find or create farmer account
        let farmerResult = await query(
            'SELECT * FROM farmers WHERE agristack_id = $1',
            [agristackId]
        );

        let farmer;
        if (farmerResult.rows.length === 0) {
            // Create farmer account from AgriStack data
            const passwordHash = await bcrypt.hash(agristackId, 10); // Use AgriStack ID as password

            // Create user
            const userResult = await query(
                `INSERT INTO users (email, password_hash, name, role) 
                 VALUES ($1, $2, $3, $4) 
                 RETURNING *`,
                [`${agristackId}@agristack.local`, passwordHash, agristackFarmer.name, 'farmer']
            );
            const user = userResult.rows[0];

            // Create farmer profile
            farmerResult = await query(
                `INSERT INTO farmers (user_id, name, agristack_id, verified, phone) 
                 VALUES ($1, $2, $3, $4, $5) 
                 RETURNING *`,
                [user.id, agristackFarmer.name, agristackId, agristackFarmer.verified, '']
            );
            farmer = farmerResult.rows[0];
        } else {
            farmer = farmerResult.rows[0];
        }

        // Get user account
        const userResult = await query(
            'SELECT * FROM users WHERE id = (SELECT user_id FROM farmers WHERE id = $1)',
            [farmer.id]
        );
        const user = userResult.rows[0];

        // Generate token
        const token = jwt.sign({ userId: user.id, role: 'farmer' }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            message: 'AgriStack login successful',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                phone: user.phone,
            },
            token,
        });
    } catch (err) {
        console.error('AgriStack login error:', err);
        res.status(500).json({ error: 'Login failed', details: err.message });
    }
});

// Quick login (for demo - select role without password)
router.post('/quick-login', async (req, res) => {
    try {
        const { role, name } = req.body;

        const validRoles = ['farmer', 'driver', 'retailer', 'admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
        }

        // Find or create demo user for this role
        const email = `demo-${role}@tracesafe.local`;
        let result = await query('SELECT * FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            // Create demo user
            const passwordHash = await bcrypt.hash('demo123', 10);
            result = await query(
                `INSERT INTO users (email, password_hash, name, role) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
                [email, passwordHash, name || `Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`, role]
            );
        }

        const user = result.rows[0];
        const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            message: 'Quick login successful',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
            token,
        });
    } catch (err) {
        console.error('Quick login error:', err);
        res.status(500).json({ error: 'Quick login failed', details: err.message });
    }
});

// Get current user profile
router.get('/me', authenticate, async (req, res) => {
    try {
        const user = req.user;

        let profileData = null;

        // Get role-specific profile data
        if (user.role === 'farmer') {
            const result = await query(
                `SELECT f.*, af.land, af.crops, af.verified, af.registry_status 
         FROM farmers f 
         LEFT JOIN agristack_farmers af ON f.agristack_id = af.farmer_id 
         WHERE f.user_id = $1`,
                [user.id]
            );
            if (result.rows.length > 0) {
                profileData = result.rows[0];
            }
        } else if (user.role === 'driver') {
            const result = await query('SELECT * FROM drivers WHERE user_id = $1', [user.id]);
            if (result.rows.length > 0) {
                profileData = result.rows[0];
            }
        } else if (user.role === 'retailer') {
            const result = await query('SELECT * FROM retailers WHERE user_id = $1', [user.id]);
            if (result.rows.length > 0) {
                profileData = result.rows[0];
            }
        }

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                phone: user.phone,
                created_at: user.created_at,
            },
            profile: profileData,
        });
    } catch (err) {
        console.error('Get profile error:', err);
        res.status(500).json({ error: 'Failed to get profile', details: err.message });
    }
});

export default router;
