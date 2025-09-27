const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Order = require('../models/Order');
const { auth } = require('../middleware/auth');
const { adminAuth } = require('../middleware/adminAuth');
const logger = require('../utils/logger');
const router = express.Router();

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Private/Admin
router.get('/dashboard', [auth, adminAuth], async (req, res) => {
    try {
        const { timeframe = '30d' } = req.query;
        
        // Calculate date range
        const now = new Date();
        let startDate;
        
        switch (timeframe) {
            case '7d':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case '1y':
                startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        
        // Get user statistics
        const totalUsers = await User.countDocuments();
        const newUsers = await User.countDocuments({
            createdAt: { $gte: startDate }
        });
        const activeUsers = await User.countDocuments({
            lastActive: { $gte: startDate }
        });
        
        // Get user registrations by day (last 30 days)
        const userRegistrations = await User.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id': 1 }
            }
        ]);
        
        // Get top customers by order value (placeholder - would need Order model)
        const topCustomers = await User.find({
            role: 'customer'
        })
        .select('name email createdAt')
        .sort({ createdAt: -1 })
        .limit(10);
        
        res.json({
            status: 'success',
            data: {
                overview: {
                    totalUsers,
                    newUsers,
                    activeUsers,
                    userGrowthRate: totalUsers > 0 ? ((newUsers / totalUsers) * 100).toFixed(2) : 0
                },
                charts: {
                    userRegistrations,
                    timeframe
                },
                topCustomers
            }
        });
        
    } catch (error) {
        logger.error('Admin dashboard error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch dashboard data'
        });
    }
});

// @route   GET /api/admin/users
// @desc    Get all users (Admin only)
// @access  Private/Admin
router.get('/users', [auth, adminAuth], async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = '',
            role = '',
            status = '',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;
        
        const query = {};
        
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        
        if (role) {
            query.role = role;
        }
        
        if (status) {
            query.status = status;
        }
        
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        const users = await User.find(query)
            .select('-password -refreshTokens')
            .sort(sortOptions)
            .limit(limit * 1)
            .skip((page - 1) * limit);
            
        const totalUsers = await User.countDocuments(query);
        const totalPages = Math.ceil(totalUsers / limit);
        
        res.json({
            status: 'success',
            data: {
                users,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalUsers,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            }
        });
        
    } catch (error) {
        logger.error('Get users error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch users'
        });
    }
});

// @route   PUT /api/admin/users/:id/status
// @desc    Update user status (Admin only)
// @access  Private/Admin
router.put('/users/:id/status', [
    auth,
    adminAuth,
    body('status').isIn(['active', 'inactive', 'suspended']).withMessage('Valid status is required')
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
        
        const { id } = req.params;
        const { status, reason } = req.body;
        
        // Prevent admin from deactivating themselves
        if (id === req.user.id && status !== 'active') {
            return res.status(400).json({
                status: 'error',
                message: 'You cannot deactivate your own account'
            });
        }
        
        const user = await User.findById(id).select('-password -refreshTokens');
        
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }
        
        user.status = status;
        
        // Log status change
        if (!user.adminNotes) {
            user.adminNotes = [];
        }
        
        user.adminNotes.push({
            action: `Status changed to ${status}`,
            reason: reason || 'No reason provided',
            adminId: req.user.id,
            adminName: req.user.name,
            timestamp: new Date()
        });
        
        await user.save();
        
        logger.info(`User status updated: ${user.email} -> ${status} by ${req.user.email}`);
        
        res.json({
            status: 'success',
            message: 'User status updated successfully',
            data: {
                user
            }
        });
        
    } catch (error) {
        logger.error('Update user status error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update user status'
        });
    }
});

// @route   GET /api/admin/orders
// @desc    Get all orders for admin
// @access  Private/Admin
router.get('/orders', [auth, adminAuth], async (req, res) => {
    try {
        const { page = 1, limit = 20, status, startDate, endDate } = req.query;
        
        // Build query
        const query = {};
        if (status) {
            query.status = status;
        }
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }
        
        const skip = (page - 1) * limit;
        
        const orders = await Order.find(query)
            .populate('customer', 'name email')
            .populate('items.product', 'name images')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
            
        const totalOrders = await Order.countDocuments(query);
        
        res.json({
            status: 'success',
            data: {
                orders,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalOrders / limit),
                    totalOrders,
                    hasNextPage: page < Math.ceil(totalOrders / limit),
                    hasPrevPage: page > 1
                }
            }
        });
        
    } catch (error) {
        logger.error('Get admin orders error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch orders'
        });
    }
});

// @route   PUT /api/admin/orders/:id/status
// @desc    Update order status
// @access  Private/Admin
router.put('/orders/:id/status', [
    auth,
    adminAuth,
    body('status').isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid status')
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
        
        const { status } = req.body;
        const orderId = req.params.id;
        
        const order = await Order.findByIdAndUpdate(
            orderId,
            { 
                status,
                updatedAt: new Date()
            },
            { new: true }
        ).populate('customer', 'name email');
        
        if (!order) {
            return res.status(404).json({
                status: 'error',
                message: 'Order not found'
            });
        }
        
        logger.info(`Order ${order.orderNumber} status updated to ${status} by admin ${req.user.email}`);
        
        res.json({
            status: 'success',
            message: 'Order status updated successfully',
            data: { order }
        });
        
    } catch (error) {
        logger.error('Update order status error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update order status'
        });
    }
});

module.exports = router;