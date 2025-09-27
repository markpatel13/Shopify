const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');
const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password -refreshTokens');
        
        res.json({
            status: 'success',
            data: {
                user
            }
        });
        
    } catch (error) {
        logger.error('Get profile error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch profile'
        });
    }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
    auth,
    body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('phone').optional().matches(/^\+?[\d\s\-\(\)]{10,}$/).withMessage('Valid phone number is required'),
    body('dateOfBirth').optional().isISO8601().withMessage('Valid date of birth is required')
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
        
        const allowedUpdates = ['name', 'phone', 'dateOfBirth', 'preferences'];
        const updates = {};
        
        Object.keys(req.body).forEach(key => {
            if (allowedUpdates.includes(key)) {
                updates[key] = req.body[key];
            }
        });
        
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-password -refreshTokens');
        
        logger.info(`Profile updated: ${user.email}`);
        
        res.json({
            status: 'success',
            message: 'Profile updated successfully',
            data: {
                user
            }
        });
        
    } catch (error) {
        logger.error('Update profile error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update profile'
        });
    }
});

// @route   PUT /api/users/address
// @desc    Update user address
// @access  Private
router.put('/address', [
    auth,
    body('street').trim().isLength({ min: 5, max: 100 }).withMessage('Street address must be between 5 and 100 characters'),
    body('city').trim().isLength({ min: 2, max: 50 }).withMessage('City must be between 2 and 50 characters'),
    body('state').trim().isLength({ min: 2, max: 50 }).withMessage('State must be between 2 and 50 characters'),
    body('zipCode').trim().isLength({ min: 5, max: 10 }).withMessage('ZIP code must be between 5 and 10 characters'),
    body('country').trim().isLength({ min: 2, max: 50 }).withMessage('Country must be between 2 and 50 characters')
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
        
        const { street, city, state, zipCode, country, isDefault } = req.body;
        
        const addressData = {
            street,
            city,
            state,
            zipCode,
            country,
            isDefault: isDefault || false
        };
        
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { address: addressData } },
            { new: true, runValidators: true }
        ).select('-password -refreshTokens');
        
        logger.info(`Address updated: ${user.email}`);
        
        res.json({
            status: 'success',
            message: 'Address updated successfully',
            data: {
                user
            }
        });
        
    } catch (error) {
        logger.error('Update address error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update address'
        });
    }
});

// @route   GET /api/users/orders
// @desc    Get user orders
// @access  Private
router.get('/orders', auth, async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        
        // This would integrate with Order model when available
        // For now, return placeholder data
        const orders = [];
        
        res.json({
            status: 'success',
            data: {
                orders,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: 0,
                    totalOrders: 0
                }
            }
        });
        
    } catch (error) {
        logger.error('Get user orders error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch orders'
        });
    }
});

module.exports = router;