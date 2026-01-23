const express = require('express');
const db = require('../db');
const router = express.Router();

// Handle incoming GET requests to /orders
router.get('/', async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            console.error('GET /orders: User not authenticated');
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const filterUserId = req.query.user_id;
        let query;
        let params = [req.user.id];

        if (req.user.role === 'admin') {
            if (filterUserId) {
                query = `
                    SELECT o.*, o.order_date as created_at, u.name as customer_name, u.username as customer_username,
                           c.name as creator_name, c.username as creator_username
                    FROM orders o
                    JOIN users u ON o.user_id = u.id
                    LEFT JOIN users c ON o.created_by = c.id
                    WHERE o.user_id = $1
                    ORDER BY o.order_date DESC
                `;
                params = [filterUserId];
            } else {
                // Admin sees all orders with customer name
                query = `
                    SELECT o.*, o.order_date as created_at, u.name as customer_name, u.username as customer_username,
                           c.name as creator_name, c.username as creator_username
                    FROM orders o
                    JOIN users u ON o.user_id = u.id
                    LEFT JOIN users c ON o.created_by = c.id
                    ORDER BY o.order_date DESC
                `;
                params = [];
            }
        } else if (req.user.role === 'sales_rep') {
            if (filterUserId) {
                // Filter for specific customer, ensuring they belong to this rep (or it's the rep themselves)
                query = `
                    SELECT o.*, o.order_date as created_at, u.name as customer_name, u.username as customer_username,
                           c.name as creator_name, c.username as creator_username
                    FROM orders o
                    JOIN users u ON o.user_id = u.id
                    LEFT JOIN users c ON o.created_by = c.id
                    WHERE (o.user_id = $1 OR u.sales_rep_id = $1) AND o.user_id = $2
                    ORDER BY o.order_date DESC
                `;
                params = [req.user.id, filterUserId];
            } else {
                // Sales Rep sees their own orders AND orders of their assigned customers
                query = `
                    SELECT o.*, o.order_date as created_at, u.name as customer_name, u.username as customer_username,
                           c.name as creator_name, c.username as creator_username
                    FROM orders o
                    JOIN users u ON o.user_id = u.id
                    LEFT JOIN users c ON o.created_by = c.id
                    WHERE o.user_id = $1 OR u.sales_rep_id = $1
                    ORDER BY o.order_date DESC
                `;
            }
        } else if (req.user.role === 'picker') {
            // Pickers see all orders
            query = `
                SELECT o.*, o.order_date as created_at, u.name as customer_name, u.username as customer_username,
                       c.name as creator_name, c.username as creator_username
                FROM orders o
                JOIN users u ON o.user_id = u.id
                LEFT JOIN users c ON o.created_by = c.id
                ORDER BY CASE WHEN LOWER(o.status) IN ('placed', 'order placed') THEN 1 ELSE 2 END, o.order_date ASC
            `;
            params = [];
        } else {
            // Customers see only their own orders
            query = `
                SELECT o.*, o.order_date as created_at, u.name as customer_name, u.username as customer_username,
                       c.name as creator_name, c.username as creator_username
                FROM orders o
                JOIN users u ON o.user_id = u.id
                LEFT JOIN users c ON o.created_by = c.id
                WHERE o.user_id = $1 ORDER BY o.order_date DESC`;
        }

        const result = await db.query(query, params);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error in GET /orders:', err);
        res.status(500).json({ error: err.message });
    }
});

// Handle incoming POST requests to /orders
router.post('/', async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        let targetUserId = req.user.id;

        // Allow Sales Rep or Admin to place order on behalf of a customer
        if (req.body.customer_id && (req.user.role === 'sales_rep' || req.user.role === 'admin')) {
            targetUserId = req.body.customer_id;
        }

        const { 
            total_amount, 
            net_amount, 
            tax_amount, 
            delivery_date, 
            delivery_address, 
            customer_phone, 
            notes 
        } = req.body;

        // 1. Insert the main order
        // Using db.query directly because db.connect() is not available on the wrapper
        const orderRes = await db.query(
            'INSERT INTO orders (user_id, created_by, total_amount, net_amount, tax_amount, delivery_date, delivery_address, customer_phone, notes, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id',
            [targetUserId, req.user.id, total_amount, net_amount, tax_amount, delivery_date, delivery_address, customer_phone, notes, 'order placed']
        );
        const orderId = orderRes.rows[0].id;

        // 2. Insert the order items
        const items = req.body.items;
        for (const item of items) {
            await db.query(
                'INSERT INTO order_items (order_id, product_id, tier, quantity, price) VALUES ($1, $2, $3, $4, $5)',
                [orderId, item.product_id, item.tier, item.quantity, item.price]
            );
        }

        res.status(201).json({
            message: 'Order created successfully',
            orderId: orderId
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// PUT /api/orders/:orderId/status - Update order status (e.g. for Pickers)
router.put('/:orderId/status', async (req, res) => {
    try {
        const { status } = req.body;
        const { orderId } = req.params;
        
        // Validate status
        const validStatuses = ['placed', 'picked', 'completed'];
        if (!validStatuses.includes(status)) {
             return res.status(400).json({ message: 'Invalid status' });
        }

        await db.query('UPDATE orders SET status = $1 WHERE id = $2', [status, orderId]);
        res.json({ message: `Order status updated to ${status}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Handle incoming GET requests to /orders/:orderId
router.get('/:orderId', async (req, res, next) => {
    try {
        const orderId = req.params.orderId;
        
        let accessCheck = 'AND o.user_id = $2';
        let params = [orderId, req.user.id];

        if (req.user.role === 'admin') {
            accessCheck = ''; // Admin sees all
            params = [orderId];
        } else if (req.user.role === 'sales_rep') {
            // Allow if order belongs to rep OR one of their customers
            accessCheck = 'AND (o.user_id = $2 OR o.user_id IN (SELECT id FROM users WHERE sales_rep_id = $2))';
        } else if (req.user.role === 'picker') {
            // Pickers can see any order
            accessCheck = '';
            params = [orderId];
        }

        // Fetch order details along with product info
        // We join orders, order_items, and products tables
        const query = `
            SELECT o.*, o.order_date as created_at,
                   u.username as customer_username, u.name as customer_name,
                   c.username as creator_username, c.name as creator_name,
                   i.id as item_id, i.quantity, i.price, i.tier,
                   p.id as product_id, p.description, p.item,
                   pp.pack_size
            FROM orders o
            JOIN users u ON o.user_id = u.id
            LEFT JOIN users c ON o.created_by = c.id
            JOIN order_items i ON o.id = i.order_id
            JOIN products p ON i.product_id = p.id
            LEFT JOIN product_pricing pp ON i.product_id = pp.product_id AND i.tier = pp.tier
            WHERE o.id = $1 ${accessCheck}
        `;
        
        const result = await db.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Group the flat list of rows into a single order object with an items array
        const order = {
            id: result.rows[0].id,
            created_at: result.rows[0].created_at,
            total_amount: result.rows[0].total_amount,
            net_amount: result.rows[0].net_amount,
            tax_amount: result.rows[0].tax_amount,
            delivery_date: result.rows[0].delivery_date,
            delivery_address: result.rows[0].delivery_address,
            customer_phone: result.rows[0].customer_phone,
            notes: result.rows[0].notes,
            status: result.rows[0].status,
            customer_username: result.rows[0].customer_username,
            customer_name: result.rows[0].customer_name,
            creator_username: result.rows[0].creator_username,
            creator_name: result.rows[0].creator_name,
            items: result.rows.map(row => ({
                id: row.item_id,
                quantity: row.quantity,
                price: row.price,
                tier: row.tier,
                pack_size: row.pack_size,
                product_id: row.product_id,
                product: {
                    id: row.product_id,
                    description: row.description,
                    item: row.item,
                    image_url: `https://thames-product-images.s3.us-east-1.amazonaws.com/produc_images/bagistoimagesprivatewebp/${row.item}.webp`
                }
            }))
        };

        res.status(200).json(order);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
