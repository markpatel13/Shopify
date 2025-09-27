const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');
const router = express.Router();

// Simple in-memory wishlist storage (in production, use database)
const userWishlists = new Map();

// Helper function to get user wishlist
const getUserWishlist = (userId) => {
    if (!userWishlists.has(userId)) {
        userWishlists.set(userId, {
            items: [],
            updatedAt: new Date()
        });
    }
    return userWishlists.get(userId);
};

// @route   GET /api/wishlist
// @desc    Get user's wishlist
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const wishlist = getUserWishlist(req.user.id);
        
        res.json({
            status: 'success',
            data: {
                wishlist
            }
        });
        
    } catch (error) {
        logger.error('Get wishlist error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch wishlist'
        });
    }
});

// @route   POST /api/wishlist/add
// @desc    Add item to wishlist
// @access  Private
router.post('/add', [
    auth,
    body('productId').isMongoId().withMessage('Valid product ID is required')
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
        
        const { productId } = req.body;
        const wishlist = getUserWishlist(req.user.id);
        
        // Check if item already exists
        const existingItem = wishlist.items.find(item => item.productId === productId);
        if (existingItem) {
            return res.status(400).json({
                status: 'error',
                message: 'Item already in wishlist'
            });
        }
        
        wishlist.items.push({
            productId,
            addedAt: new Date()
        });
        wishlist.updatedAt = new Date();
        
        res.json({
            status: 'success',
            message: 'Item added to wishlist'
        });
        
    } catch (error) {
        logger.error('Add to wishlist error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to add item to wishlist'
        });
    }
});

// @route   DELETE /api/wishlist/remove/:productId
// @desc    Remove item from wishlist
// @access  Private
router.delete('/remove/:productId', auth, async (req, res) => {
    try {
        const { productId } = req.params;
        const wishlist = getUserWishlist(req.user.id);
        
        const itemIndex = wishlist.items.findIndex(item => item.productId === productId);
        if (itemIndex === -1) {
            return res.status(404).json({
                status: 'error',
                message: 'Item not found in wishlist'
            });
        }
        
        wishlist.items.splice(itemIndex, 1);
        wishlist.updatedAt = new Date();
        
        res.json({
            status: 'success',
            message: 'Item removed from wishlist'
        });
        
    } catch (error) {
        logger.error('Remove from wishlist error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to remove item from wishlist'
        });
    }
});

module.exports = router;