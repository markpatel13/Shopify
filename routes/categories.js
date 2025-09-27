const express = require('express');
const { body, validationResult } = require('express-validator');
const Category = require('../models/Category');
const { auth } = require('../middleware/auth');
const { adminAuth } = require('../middleware/adminAuth');
const logger = require('../utils/logger');
const router = express.Router();

// @route   GET /api/categories
// @desc    Get all categories
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { featured, parent, level } = req.query;
        
        const query = { isActive: true };
        
        if (featured === 'true') {
            query.isFeatured = true;
        }
        
        if (parent) {
            query.parent = parent === 'null' ? null : parent;
        }
        
        if (level !== undefined) {
            query.level = parseInt(level);
        }
        
        const categories = await Category.find(query)
            .populate('parent', 'name slug')
            .populate('children', 'name slug')
            .sort({ sortOrder: 1, name: 1 });
            
        res.json({
            status: 'success',
            data: {
                categories
            }
        });
        
    } catch (error) {
        logger.error('Get categories error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch categories'
        });
    }
});

// @route   GET /api/categories/tree
// @desc    Get category tree structure
// @access  Public
router.get('/tree', async (req, res) => {
    try {
        const categoryTree = await Category.getCategoryTree();
        
        res.json({
            status: 'success',
            data: {
                categoryTree
            }
        });
        
    } catch (error) {
        logger.error('Get category tree error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch category tree'
        });
    }
});

// @route   GET /api/categories/:id
// @desc    Get single category
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const category = await Category.findById(req.params.id)
            .populate('parent', 'name slug')
            .populate('children', 'name slug');
            
        if (!category || !category.isActive) {
            return res.status(404).json({
                status: 'error',
                message: 'Category not found'
            });
        }
        
        res.json({
            status: 'success',
            data: {
                category
            }
        });
        
    } catch (error) {
        logger.error('Get category error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch category'
        });
    }
});

// @route   GET /api/categories/slug/:slug
// @desc    Get category by slug
// @access  Public
router.get('/slug/:slug', async (req, res) => {
    try {
        const category = await Category.findOne({ slug: req.params.slug, isActive: true })
            .populate('parent', 'name slug')
            .populate('children', 'name slug');
            
        if (!category) {
            return res.status(404).json({
                status: 'error',
                message: 'Category not found'
            });
        }
        
        res.json({
            status: 'success',
            data: {
                category
            }
        });
        
    } catch (error) {
        logger.error('Get category by slug error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch category'
        });
    }
});

// @route   POST /api/categories
// @desc    Create new category (Admin only)
// @access  Private/Admin
router.post('/', [
    auth,
    adminAuth,
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Category name is required and must be less than 100 characters'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
    body('parent').optional().isMongoId().withMessage('Valid parent category ID is required')
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
        
        // Check if parent category exists if provided
        if (req.body.parent) {
            const parentCategory = await Category.findById(req.body.parent);
            if (!parentCategory) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Parent category not found'
                });
            }
        }
        
        const category = new Category(req.body);
        await category.save();
        
        // Update parent's children array if parent exists
        if (category.parent) {
            await Category.findByIdAndUpdate(category.parent, {
                $push: { children: category._id }
            });
        }
        
        const populatedCategory = await Category.findById(category._id)
            .populate('parent', 'name slug');
            
        logger.info(`Category created: ${category.name} by ${req.user.email}`);
        
        res.status(201).json({
            status: 'success',
            message: 'Category created successfully',
            data: {
                category: populatedCategory
            }
        });
        
    } catch (error) {
        logger.error('Create category error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create category'
        });
    }
});

module.exports = router;