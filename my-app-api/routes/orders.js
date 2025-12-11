const express = require('express');
const db = require('../db');
const router = express.Router();

// Handle incoming GET requests to /orders
router.get('/', async (req, res, next) => {
    try {
        // Fetch orders for the logged-in user
        const result = await db.query(
            'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Handle incoming POST requests to /orders
router.post('/', async (req, res, next) => {
    try {
        // 1. Insert the main order
        // Using db.query directly because db.connect() is not available on the wrapper
        const orderRes = await db.query(
            'INSERT INTO orders (user_id, total_amount, status) VALUES ($1, $2, $3) RETURNING id',
            [req.user.id, req.body.total_amount, 'order placed']
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

// Handle incoming GET requests to /orders/:orderId
router.get('/:orderId', async (req, res, next) => {
    try {
        const orderId = req.params.orderId;
        // Fetch order details along with product info
        // We join orders, order_items, and products tables
        const query = `
            SELECT o.id, o.created_at, o.total_amount, o.status,
                   i.id as item_id, i.quantity, i.price, i.tier,
                   p.description, p.item
            FROM orders o
            JOIN order_items i ON o.id = i.order_id
            JOIN products p ON i.product_id = p.id
            WHERE o.id = $1 AND o.user_id = $2
        `;
        
        const result = await db.query(query, [orderId, req.user.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Group the flat list of rows into a single order object with an items array
        const order = {
            id: result.rows[0].id,
            created_at: result.rows[0].created_at,
            total_amount: result.rows[0].total_amount,
            status: result.rows[0].status,
            items: result.rows.map(row => ({
                id: row.item_id,
                quantity: row.quantity,
                price: row.price,
                tier: row.tier,
                product: {
                    description: row.description,
                    image_url: process.env.IMAGE_BASE_URL 
                        ? `${process.env.IMAGE_BASE_URL}/${row.item}.webp` 
                        : null
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
