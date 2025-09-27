const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { auth } = require('../middleware/auth');
const { ownerOrAdminAuth, adminAuth } = require('../middleware/adminAuth');
const logger = require('../utils/logger');
const router = express.Router();

// @route   POST /api/orders
// @desc    Create new order
// @access  Private
router.post('/', [
    auth,
    body('items').isArray({ min: 1 }).withMessage('Order must contain at least one item'),
    body('items.*.product').isMongoId().withMessage('Valid product ID is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('shippingAddress.name').trim().notEmpty().withMessage('Shipping name is required'),
    body('shippingAddress.street').trim().notEmpty().withMessage('Shipping street is required'),
    body('shippingAddress.city').trim().notEmpty().withMessage('Shipping city is required'),
    body('shippingAddress.state').trim().notEmpty().withMessage('Shipping state is required'),
    body('shippingAddress.country').trim().notEmpty().withMessage('Shipping country is required'),
    body('shippingAddress.zipCode').trim().notEmpty().withMessage('Shipping ZIP code is required'),
    body('paymentMethod').isIn(['credit_card', 'debit_card', 'paypal', 'stripe', 'cash_on_delivery']).withMessage('Valid payment method is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { items, shippingAddress, billingAddress, paymentMethod, paymentDetails, notes, coupon } = req.body;

        // Validate and process items
        const orderItems = [];
        let subtotal = 0;

        for (const item of items) {
            const product = await Product.findById(item.product);
            if (!product || product.status !== 'active') {
                return res.status(400).json({
                    status: 'error',
                    message: `Product ${item.product} is not available`
                });
            }

            // Check stock availability
            if (!product.isInStock(item.quantity)) {
                return res.status(400).json({
                    status: 'error',
                    message: `Insufficient stock for product: ${product.name}`
                });
            }

            const itemTotal = product.price * item.quantity;
            subtotal += itemTotal;

            orderItems.push({
                product: product._id,
                productSnapshot: {
                    name: product.name,
                    price: product.price,
                    image: product.mainImage?.url,
                    sku: product.sku
                },
                quantity: item.quantity,
                price: product.price,
                total: itemTotal,
                variant: item.variant
            });

            // Reserve stock
            await product.reserveStock(item.quantity);
            
            // Update analytics
            await product.incrementCartAdditions();
            await product.incrementPurchases();
        }

        // Calculate taxes (8% for demonstration)
        const tax = subtotal * 0.08;
        
        // Calculate shipping (free for orders over ₹5000)
        const shipping = subtotal >= 100 ? 0 : 10;
        
        // Apply coupon discount if provided
        let discount = 0;
        if (coupon && coupon.code) {
            // TODO: Implement coupon validation
            // For now, apply a simple discount
            if (coupon.discountType === 'percentage') {
                discount = (subtotal * coupon.discountAmount) / 100;
            } else {
                discount = coupon.discountAmount;
            }
        }

        const total = subtotal + tax + shipping - discount;

        // Create order
        const order = new Order({
            customer: req.user.id,
            items: orderItems,
            pricing: {
                subtotal,
                tax,
                shipping,
                discount,
                total
            },
            shippingAddress,
            billingAddress: billingAddress || { ...shippingAddress, sameAsShipping: true },
            paymentMethod,
            paymentDetails,
            notes,
            coupon,
            status: 'pending',
            paymentStatus: 'pending',
            source: 'web'
        });

        await order.save();

        // Update user stats
        await req.user.updateStats({ total, items: orderItems });

        // Populate order for response
        const populatedOrder = await Order.findById(order._id)
            .populate('customer', 'name email')
            .populate('items.product', 'name images');

        logger.info(`Order created: ${order.orderNumber} by ${req.user.email}`);

        // Emit real-time notification to admin
        const io = req.app.get('io');
        io.to('admin_room').emit('new_order', {
            orderId: order._id,
            orderNumber: order.orderNumber,
            customer: req.user.name,
            total: order.pricing.total
        });

        res.status(201).json({
            status: 'success',
            message: 'Order created successfully',
            data: {
                order: populatedOrder
            }
        });

    } catch (error) {
        logger.error('Create order error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create order',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @route   GET /api/orders
// @desc    Get user's orders
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;

        const query = { customer: req.user.id };
        if (status) {
            query.status = status;
        }

        const skip = (page - 1) * limit;

        const orders = await Order.find(query)
            .populate('items.product', 'name images slug')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const totalOrders = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalOrders / limit);

        res.json({
            status: 'success',
            data: {
                orders,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalOrders,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            }
        });

    } catch (error) {
        logger.error('Get orders error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch orders'
        });
    }
});

// @route   GET /api/orders/:id
// @desc    Get single order
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('customer', 'name email')
            .populate('items.product', 'name images slug');

        if (!order) {
            return res.status(404).json({
                status: 'error',
                message: 'Order not found'
            });
        }

        // Check if user owns the order or is admin
        if (order.customer._id.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Access denied'
            });
        }

        res.json({
            status: 'success',
            data: {
                order
            }
        });

    } catch (error) {
        logger.error('Get order error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch order'
        });
    }
});

// @route   PUT /api/orders/:id/cancel
// @desc    Cancel order
// @access  Private
router.put('/:id/cancel', [
    auth,
    body('reason').optional().trim().isLength({ max: 500 }).withMessage('Cancellation reason must be less than 500 characters')
], async (req, res) => {
    try {
        const { reason } = req.body;
        
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                status: 'error',
                message: 'Order not found'
            });
        }

        // Check if user owns the order
        if (order.customer.toString() !== req.user.id) {
            return res.status(403).json({
                status: 'error',
                message: 'Access denied'
            });
        }

        // Check if order can be cancelled
        if (order.status === 'shipped' || order.status === 'delivered' || order.status === 'cancelled') {
            return res.status(400).json({
                status: 'error',
                message: `Order cannot be cancelled. Current status: ${order.status}`
            });
        }

        // Release reserved stock
        for (const item of order.items) {
            const product = await Product.findById(item.product);
            if (product) {
                await product.releaseStock(item.quantity);
            }
        }

        // Update order status
        order.status = 'cancelled';
        order.cancelledAt = new Date();
        order.cancelReason = reason || 'Cancelled by customer';
        
        await order.addTimelineEntry('cancelled', `Order cancelled by customer. Reason: ${reason || 'No reason provided'}`, req.user.id);

        logger.info(`Order cancelled: ${order.orderNumber} by ${req.user.email}`);

        // Emit real-time notification to admin
        const io = req.app.get('io');
        io.to('admin_room').emit('order_cancelled', {
            orderId: order._id,
            orderNumber: order.orderNumber,
            customer: req.user.name,
            reason
        });

        res.json({
            status: 'success',
            message: 'Order cancelled successfully',
            data: {
                order
            }
        });

    } catch (error) {
        logger.error('Cancel order error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to cancel order'
        });
    }
});

// @route   GET /api/orders/tracking/:trackingNumber
// @desc    Track order by tracking number
// @access  Public
router.get('/tracking/:trackingNumber', async (req, res) => {
    try {
        const { trackingNumber } = req.params;

        const order = await Order.findOne({
            'shipping.trackingNumber': trackingNumber
        })
        .select('orderNumber status timeline shipping estimatedDelivery actualDelivery')
        .populate('timeline.updatedBy', 'name');

        if (!order) {
            return res.status(404).json({
                status: 'error',
                message: 'Order not found with this tracking number'
            });
        }

        res.json({
            status: 'success',
            data: {
                order: {
                    orderNumber: order.orderNumber,
                    status: order.status,
                    timeline: order.timeline,
                    shipping: order.shipping,
                    estimatedDelivery: order.estimatedDelivery,
                    actualDelivery: order.actualDelivery
                }
            }
        });

    } catch (error) {
        logger.error('Track order error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to track order'
        });
    }
});

module.exports = router;