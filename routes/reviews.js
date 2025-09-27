const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');
const router = express.Router();

// Simple in-memory reviews storage (in production, use database)
const productReviews = new Map();

// @route   GET /api/reviews/product/:productId
// @desc    Get reviews for a product
// @access  Public
router.get('/product/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        
        const reviews = productReviews.get(productId) || [];
        
        // Sort reviews
        reviews.sort((a, b) => {
            if (sortBy === 'rating') {
                return sortOrder === 'desc' ? b.rating - a.rating : a.rating - b.rating;
            }
            return sortOrder === 'desc' ? 
                new Date(b.createdAt) - new Date(a.createdAt) : 
                new Date(a.createdAt) - new Date(b.createdAt);
        });
        
        // Paginate
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedReviews = reviews.slice(startIndex, endIndex);
        
        // Calculate average rating
        const averageRating = reviews.length > 0 ? 
            reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
            
        res.json({
            status: 'success',
            data: {
                reviews: paginatedReviews,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(reviews.length / limit),
                    totalReviews: reviews.length
                },
                stats: {
                    averageRating: Math.round(averageRating * 10) / 10,
                    totalReviews: reviews.length
                }
            }
        });
        
    } catch (error) {
        logger.error('Get product reviews error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch reviews'
        });
    }
});

// @route   POST /api/reviews
// @desc    Create a review
// @access  Private
router.post('/', [
    auth,
    body('productId').isMongoId().withMessage('Valid product ID is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('title').trim().isLength({ min: 5, max: 100 }).withMessage('Title must be between 5 and 100 characters'),
    body('comment').trim().isLength({ min: 10, max: 500 }).withMessage('Comment must be between 10 and 500 characters')
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
        
        const { productId, rating, title, comment } = req.body;
        
        // Check if user already reviewed this product
        const existingReviews = productReviews.get(productId) || [];
        const existingReview = existingReviews.find(review => review.userId === req.user.id);
        
        if (existingReview) {
            return res.status(400).json({
                status: 'error',
                message: 'You have already reviewed this product'
            });
        }
        
        const review = {
            id: Date.now().toString(),
            userId: req.user.id,
            userName: req.user.name,
            productId,
            rating,
            title,
            comment,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        existingReviews.push(review);
        productReviews.set(productId, existingReviews);
        
        logger.info(`Review created for product ${productId} by ${req.user.email}`);
        
        res.status(201).json({
            status: 'success',
            message: 'Review created successfully',
            data: {
                review
            }
        });
        
    } catch (error) {
        logger.error('Create review error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create review'
        });
    }
});

module.exports = router;