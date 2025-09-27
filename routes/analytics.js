const express = require('express');
const { auth } = require('../middleware/auth');
const { adminAuth } = require('../middleware/adminAuth');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const logger = require('../utils/logger');
const router = express.Router();

// @route   GET /api/analytics/overview
// @desc    Get analytics overview (Admin only)
// @access  Private/Admin
router.get('/overview', [auth, adminAuth], async (req, res) => {
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
        
        // Get basic metrics
        const totalUsers = await User.countDocuments();
        const totalProducts = await Product.countDocuments();
        const totalOrders = await Order.countDocuments();
        
        const newUsers = await User.countDocuments({
            createdAt: { $gte: startDate }
        });
        
        const newProducts = await Product.countDocuments({
            createdAt: { $gte: startDate }
        });
        
        const recentOrders = await Order.countDocuments({
            createdAt: { $gte: startDate }
        });
        
        // Calculate total revenue (example calculation)
        const revenueResult = await Order.aggregate([
            { $match: { createdAt: { $gte: startDate }, status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;
        
        res.json({
            status: 'success',
            data: {
                overview: {
                    totalUsers,
                    totalProducts,
                    totalOrders,
                    totalRevenue,
                    newUsers,
                    newProducts,
                    recentOrders,
                    timeframe
                },
                growth: {
                    userGrowthRate: totalUsers > 0 ? ((newUsers / totalUsers) * 100).toFixed(2) : 0,
                    productGrowthRate: totalProducts > 0 ? ((newProducts / totalProducts) * 100).toFixed(2) : 0,
                    orderGrowthRate: totalOrders > 0 ? ((recentOrders / totalOrders) * 100).toFixed(2) : 0
                }
            }
        });
        
    } catch (error) {
        logger.error('Analytics overview error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch analytics overview'
        });
    }
});

// @route   GET /api/analytics/sales
// @desc    Get sales analytics (Admin only)
// @access  Private/Admin
router.get('/sales', [auth, adminAuth], async (req, res) => {
    try {
        const { timeframe = '30d', groupBy = 'day' } = req.query;
        
        // This would contain more complex aggregation in production
        const salesData = {
            totalSales: 15420.50,
            totalOrders: 87,
            averageOrderValue: 177.24,
            conversionRate: 3.2,
            topProducts: [
                { name: 'Premium Headphones', sales: 45, revenue: 6750 },
                { name: 'Smart Watch', sales: 32, revenue: 9600 },
                { name: 'Wireless Earbuds', sales: 28, revenue: 4200 }
            ]
        };
        
        res.json({
            status: 'success',
            data: {
                sales: salesData,
                timeframe,
                groupBy
            }
        });
        
    } catch (error) {
        logger.error('Sales analytics error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch sales analytics'
        });
    }
});

// @route   GET /api/analytics/products
// @desc    Get product analytics (Admin only)
// @access  Private/Admin
router.get('/products', [auth, adminAuth], async (req, res) => {
    try {
        // Get product performance metrics
        const topViewedProducts = await Product.find()
            .sort({ 'analytics.views': -1 })
            .limit(10)
            .select('name price analytics');
            
        const topCartProducts = await Product.find()
            .sort({ 'analytics.cartAdditions': -1 })
            .limit(10)
            .select('name price analytics');
            
        const lowStockProducts = await Product.find({
            'inventory.stock': { $lt: 10 },
            status: 'active'
        })
        .select('name inventory.stock')
        .limit(20);
        
        res.json({
            status: 'success',
            data: {
                topViewedProducts,
                topCartProducts,
                lowStockProducts,
                totalProducts: await Product.countDocuments(),
                activeProducts: await Product.countDocuments({ status: 'active' }),
                outOfStockProducts: await Product.countDocuments({ 'inventory.stock': 0 })
            }
        });
        
    } catch (error) {
        logger.error('Product analytics error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch product analytics'
        });
    }
});

// @route   GET /api/analytics/users
// @desc    Get user analytics (Admin only)
// @access  Private/Admin
router.get('/users', [auth, adminAuth], async (req, res) => {
    try {
        const { timeframe = '30d' } = req.query;
        
        // Calculate date range
        const now = new Date();
        const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const userStats = {
            totalUsers: await User.countDocuments(),
            activeUsers: await User.countDocuments({ lastActive: { $gte: startDate } }),
            newRegistrations: await User.countDocuments({ createdAt: { $gte: startDate } }),
            usersByRole: await User.aggregate([
                { $group: { _id: '$role', count: { $sum: 1 } } }
            ])
        };
        
        res.json({
            status: 'success',
            data: {
                userStats,
                timeframe
            }
        });
        
    } catch (error) {
        logger.error('User analytics error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch user analytics'
        });
    }
});

module.exports = router;