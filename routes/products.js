const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { auth } = require('../middleware/auth');
const { adminAuth } = require('../middleware/adminAuth');
const logger = require('../utils/logger');
const router = express.Router();

// @route   GET /api/products
// @desc    Get all products with filtering, sorting, and pagination
// @access  Public
router.get('/', [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    query('category').optional().isMongoId().withMessage('Invalid category ID'),
    query('minPrice').optional().isFloat({ min: 0 }).withMessage('Min price must be a positive number'),
    query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Max price must be a positive number'),
    query('rating').optional().isFloat({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    query('sort').optional().isIn(['price_asc', 'price_desc', 'name_asc', 'name_desc', 'rating_desc', 'newest', 'oldest']).withMessage('Invalid sort option')
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

        const {
            page = 1,
            limit = 20,
            search,
            category,
            minPrice,
            maxPrice,
            rating,
            sort = 'newest',
            featured,
            trending,
            onSale,
            inStock
        } = req.query;

        // Build query
        const query = {
            status: 'active',
            deletedAt: { $exists: false }
        };

        // Search functionality
        if (search) {
            query.$text = { $search: search };
        }

        // Category filter
        if (category) {
            query.category = category;
        }

        // Price range filter
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseFloat(minPrice);
            if (maxPrice) query.price.$lte = parseFloat(maxPrice);
        }

        // Rating filter
        if (rating) {
            query['ratings.average'] = { $gte: parseFloat(rating) };
        }

        // Feature filters
        if (featured === 'true') query.featured = true;
        if (trending === 'true') query.trending = true;
        if (onSale === 'true') query.onSale = true;
        if (inStock === 'true') {
            query.$or = [
                { 'inventory.trackInventory': false },
                { 'inventory.stock': { $gt: 0 } }
            ];
        }

        // Sorting
        let sortOptions = {};
        switch (sort) {
            case 'price_asc':
                sortOptions.price = 1;
                break;
            case 'price_desc':
                sortOptions.price = -1;
                break;
            case 'name_asc':
                sortOptions.name = 1;
                break;
            case 'name_desc':
                sortOptions.name = -1;
                break;
            case 'rating_desc':
                sortOptions['ratings.average'] = -1;
                break;
            case 'oldest':
                sortOptions.createdAt = 1;
                break;
            case 'newest':
            default:
                sortOptions.createdAt = -1;
                break;
        }

        // Add text score for search results
        if (search) {
            sortOptions.score = { $meta: 'textScore' };
        }

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Execute query
        const products = await Product.find(query)
            .populate('category', 'name slug')
            .populate('reviews', 'rating comment user createdAt', null, { 
                sort: { createdAt: -1 }, 
                limit: 3 
            })
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        // Get total count for pagination
        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);

        // Add computed fields
        const productsWithComputedFields = products.map(product => ({
            ...product,
            discountAmount: product.originalPrice && product.originalPrice > product.price 
                ? product.originalPrice - product.price 
                : 0,
            stockStatus: !product.inventory.trackInventory 
                ? 'in_stock'
                : product.inventory.stock <= 0 
                    ? 'out_of_stock'
                    : product.inventory.stock <= product.inventory.lowStockThreshold 
                        ? 'low_stock'
                        : 'in_stock',
            mainImage: product.images.find(img => img.isDefault) || product.images[0] || null
        }));

        res.json({
            status: 'success',
            data: {
                products: productsWithComputedFields,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalProducts,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                },
                filters: {
                    search,
                    category,
                    priceRange: { min: minPrice, max: maxPrice },
                    rating,
                    sort
                }
            }
        });

    } catch (error) {
        logger.error('Get products error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch products',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @route   GET /api/products/featured
// @desc    Get featured products
// @access  Public
router.get('/featured', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        const products = await Product.findFeatured(parseInt(limit));

        res.json({
            status: 'success',
            data: {
                products
            }
        });

    } catch (error) {
        logger.error('Get featured products error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch featured products'
        });
    }
});

// @route   GET /api/products/trending
// @desc    Get trending products
// @access  Public
router.get('/trending', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        const products = await Product.findTrending(parseInt(limit));

        res.json({
            status: 'success',
            data: {
                products
            }
        });

    } catch (error) {
        logger.error('Get trending products error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch trending products'
        });
    }
});

// @route   GET /api/products/best-sellers
// @desc    Get best selling products
// @access  Public
router.get('/best-sellers', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        const products = await Product.findBestSellers(parseInt(limit));

        res.json({
            status: 'success',
            data: {
                products
            }
        });

    } catch (error) {
        logger.error('Get best sellers error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch best selling products'
        });
    }
});

// @route   GET /api/products/on-sale
// @desc    Get products on sale
// @access  Public
router.get('/on-sale', async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        
        const products = await Product.findOnSale(parseInt(limit));

        res.json({
            status: 'success',
            data: {
                products
            }
        });

    } catch (error) {
        logger.error('Get sale products error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch sale products'
        });
    }
});

// @route   GET /api/products/search
// @desc    Search products
// @access  Public
router.get('/search', [
    query('q').notEmpty().withMessage('Search query is required'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
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

        const { q: searchTerm, limit = 20 } = req.query;

        const products = await Product.searchProducts(searchTerm, { limit: parseInt(limit) });

        res.json({
            status: 'success',
            data: {
                products,
                searchTerm,
                count: products.length
            }
        });

    } catch (error) {
        logger.error('Search products error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Search failed'
        });
    }
});

// @route   GET /api/products/:id
// @desc    Get single product by ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const product = await Product.findById(id)
            .populate('category', 'name slug path')
            .populate('reviews', 'rating comment user createdAt', null, { 
                sort: { createdAt: -1 } 
            })
            .populate('relatedProducts', 'name price images ratings')
            .populate('crossSells', 'name price images ratings')
            .populate('upsells', 'name price images ratings');

        if (!product || product.status !== 'active' || product.deletedAt) {
            return res.status(404).json({
                status: 'error',
                message: 'Product not found'
            });
        }

        // Increment view count
        await product.incrementViews();

        res.json({
            status: 'success',
            data: {
                product
            }
        });

    } catch (error) {
        logger.error('Get product error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch product'
        });
    }
});

// @route   GET /api/products/slug/:slug
// @desc    Get single product by slug
// @access  Public
router.get('/slug/:slug', async (req, res) => {
    try {
        const { slug } = req.params;

        const product = await Product.findOne({ 
            slug, 
            status: 'active',
            deletedAt: { $exists: false }
        })
        .populate('category', 'name slug path')
        .populate('reviews', 'rating comment user createdAt', null, { 
            sort: { createdAt: -1 } 
        })
        .populate('relatedProducts', 'name price images ratings')
        .populate('crossSells', 'name price images ratings')
        .populate('upsells', 'name price images ratings');

        if (!product) {
            return res.status(404).json({
                status: 'error',
                message: 'Product not found'
            });
        }

        // Increment view count
        await product.incrementViews();

        res.json({
            status: 'success',
            data: {
                product
            }
        });

    } catch (error) {
        logger.error('Get product by slug error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch product'
        });
    }
});

// @route   POST /api/products
// @desc    Create new product (Admin only)
// @access  Private/Admin
router.post('/', [
    auth,
    adminAuth,
    body('name').trim().isLength({ min: 1, max: 200 }).withMessage('Product name is required and must be less than 200 characters'),
    body('description').trim().isLength({ min: 1, max: 2000 }).withMessage('Description is required and must be less than 2000 characters'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('category').isMongoId().withMessage('Valid category ID is required'),
    body('sku').trim().notEmpty().withMessage('SKU is required'),
    body('inventory.stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer')
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

        // Check if category exists
        const category = await Category.findById(req.body.category);
        if (!category) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid category'
            });
        }

        // Check if SKU already exists
        const existingSku = await Product.findOne({ sku: req.body.sku.toUpperCase() });
        if (existingSku) {
            return res.status(400).json({
                status: 'error',
                message: 'SKU already exists'
            });
        }

        const product = new Product({
            ...req.body,
            createdBy: req.user.id,
            updatedBy: req.user.id
        });

        await product.save();

        // Update category product count
        await Category.findByIdAndUpdate(req.body.category, {
            $inc: { productCount: 1 }
        });

        const populatedProduct = await Product.findById(product._id)
            .populate('category', 'name slug')
            .populate('createdBy', 'name email');

        logger.info(`Product created: ${product.name} by ${req.user.email}`);

        res.status(201).json({
            status: 'success',
            message: 'Product created successfully',
            data: {
                product: populatedProduct
            }
        });

    } catch (error) {
        logger.error('Create product error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create product',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @route   PUT /api/products/:id
// @desc    Update product (Admin only)
// @access  Private/Admin
router.put('/:id', [
    auth,
    adminAuth,
    body('name').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Product name must be less than 200 characters'),
    body('description').optional().trim().isLength({ min: 1, max: 2000 }).withMessage('Description must be less than 2000 characters'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('category').optional().isMongoId().withMessage('Valid category ID is required')
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

        const product = await Product.findById(id);
        if (!product || product.deletedAt) {
            return res.status(404).json({
                status: 'error',
                message: 'Product not found'
            });
        }

        // If category is being changed, check if new category exists
        if (req.body.category && req.body.category !== product.category.toString()) {
            const category = await Category.findById(req.body.category);
            if (!category) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid category'
                });
            }
        }

        // Update product
        Object.assign(product, req.body);
        product.updatedBy = req.user.id;
        
        await product.save();

        const updatedProduct = await Product.findById(id)
            .populate('category', 'name slug')
            .populate('updatedBy', 'name email');

        logger.info(`Product updated: ${product.name} by ${req.user.email}`);

        res.json({
            status: 'success',
            message: 'Product updated successfully',
            data: {
                product: updatedProduct
            }
        });

    } catch (error) {
        logger.error('Update product error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update product'
        });
    }
});

// @route   DELETE /api/products/:id
// @desc    Delete product (Admin only) - Soft delete
// @access  Private/Admin
router.delete('/:id', auth, adminAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const product = await Product.findById(id);
        if (!product || product.deletedAt) {
            return res.status(404).json({
                status: 'error',
                message: 'Product not found'
            });
        }

        // Soft delete
        product.deletedAt = new Date();
        product.status = 'archived';
        product.updatedBy = req.user.id;
        
        await product.save();

        // Update category product count
        await Category.findByIdAndUpdate(product.category, {
            $inc: { productCount: -1 }
        });

        logger.info(`Product deleted: ${product.name} by ${req.user.email}`);

        res.json({
            status: 'success',
            message: 'Product deleted successfully'
        });

    } catch (error) {
        logger.error('Delete product error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete product'
        });
    }
});

module.exports = router;