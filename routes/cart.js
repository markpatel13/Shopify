const express = require('express');
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');
const router = express.Router();

// Simple in-memory cart storage (in production, use Redis or database)
const userCarts = new Map();

// Helper function to get user cart
const getUserCart = (userId) => {
    if (!userCarts.has(userId)) {
        userCarts.set(userId, {
            items: [],
            updatedAt: new Date()
        });
    }
    return userCarts.get(userId);
};

// Helper function to calculate cart totals
const calculateCartTotals = (cartItems) => {
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.18; // 18% GST
    const shipping = subtotal >= 5000 ? 0 : 500; // Free shipping over ₹5000
    const total = subtotal + tax + shipping;
    
    return {
        subtotal: Math.round(subtotal * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        shipping: Math.round(shipping * 100) / 100,
        total: Math.round(total * 100) / 100,
        itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0)
    };
};

// @route   GET /api/cart
// @desc    Get user's cart
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const cart = getUserCart(req.user.id);
        
        // Populate product details for cart items
        const populatedItems = [];
        
        for (const item of cart.items) {
            const product = await Product.findById(item.productId)
                .select('name price images inventory status');
                
            if (product && product.status === 'active') {
                populatedItems.push({
                    ...item,
                    product: {
                        _id: product._id,
                        name: product.name,
                        price: product.price,
                        image: product.images[0]?.url || null,
                        inStock: product.isInStock(item.quantity),
                        stockQuantity: product.inventory.stock
                    }
                });
            }
        }
        
        const totals = calculateCartTotals(populatedItems);
        
        res.json({
            status: 'success',
            data: {
                cart: {
                    items: populatedItems,
                    totals,
                    updatedAt: cart.updatedAt
                }
            }
        });
        
    } catch (error) {
        logger.error('Get cart error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch cart'
        });
    }
});

// @route   POST /api/cart/add
// @desc    Add item to cart
// @access  Private
router.post('/add', [
    auth,
    body('productId').isMongoId().withMessage('Valid product ID is required'),
    body('quantity').isInt({ min: 1, max: 100 }).withMessage('Quantity must be between 1 and 100')
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
        
        const { productId, quantity, variant } = req.body;
        
        // Check if product exists and is available
        const product = await Product.findById(productId);
        if (!product || product.status !== 'active') {
            return res.status(404).json({
                status: 'error',
                message: 'Product not found or not available'
            });
        }
        
        // Check stock availability
        if (!product.isInStock(quantity)) {
            return res.status(400).json({
                status: 'error',
                message: 'Insufficient stock available'
            });
        }
        
        const cart = getUserCart(req.user.id);
        
        // Check if item already exists in cart
        const existingItemIndex = cart.items.findIndex(item => 
            item.productId === productId && 
            JSON.stringify(item.variant) === JSON.stringify(variant)
        );
        
        if (existingItemIndex > -1) {
            // Update quantity of existing item
            const newQuantity = cart.items[existingItemIndex].quantity + quantity;
            
            if (!product.isInStock(newQuantity)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Cannot add more items. Insufficient stock available'
                });
            }
            
            cart.items[existingItemIndex].quantity = newQuantity;
        } else {
            // Add new item to cart
            cart.items.push({
                productId,
                quantity,
                price: product.price,
                variant,
                addedAt: new Date()
            });
        }
        
        cart.updatedAt = new Date();
        
        // Update product analytics
        await product.incrementCartAdditions();
        
        logger.info(`Item added to cart: ${product.name} by ${req.user.email}`);
        
        res.json({
            status: 'success',
            message: 'Item added to cart successfully',
            data: {
                itemsInCart: cart.items.length,
                totalQuantity: cart.items.reduce((sum, item) => sum + item.quantity, 0)
            }
        });
        
    } catch (error) {
        logger.error('Add to cart error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to add item to cart'
        });
    }
});

// @route   PUT /api/cart/update
// @desc    Update cart item quantity
// @access  Private
router.put('/update', [
    auth,
    body('productId').isMongoId().withMessage('Valid product ID is required'),
    body('quantity').isInt({ min: 0, max: 100 }).withMessage('Quantity must be between 0 and 100')
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
        
        const { productId, quantity, variant } = req.body;
        const cart = getUserCart(req.user.id);
        
        const itemIndex = cart.items.findIndex(item => 
            item.productId === productId && 
            JSON.stringify(item.variant) === JSON.stringify(variant)
        );
        
        if (itemIndex === -1) {
            return res.status(404).json({
                status: 'error',
                message: 'Item not found in cart'
            });
        }
        
        if (quantity === 0) {
            // Remove item from cart
            cart.items.splice(itemIndex, 1);
        } else {
            // Check stock availability
            const product = await Product.findById(productId);
            if (!product || !product.isInStock(quantity)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Insufficient stock available'
                });
            }
            
            // Update quantity
            cart.items[itemIndex].quantity = quantity;
            cart.items[itemIndex].price = product.price; // Update price in case it changed
        }
        
        cart.updatedAt = new Date();
        
        res.json({
            status: 'success',
            message: 'Cart updated successfully',
            data: {
                itemsInCart: cart.items.length,
                totalQuantity: cart.items.reduce((sum, item) => sum + item.quantity, 0)
            }
        });
        
    } catch (error) {
        logger.error('Update cart error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update cart'
        });
    }
});

// @route   DELETE /api/cart/remove/:productId
// @desc    Remove item from cart
// @access  Private
router.delete('/remove/:productId', auth, async (req, res) => {
    try {
        const { productId } = req.params;
        const { variant } = req.query;
        
        const cart = getUserCart(req.user.id);
        
        const itemIndex = cart.items.findIndex(item => 
            item.productId === productId && 
            JSON.stringify(item.variant) === JSON.stringify(variant)
        );
        
        if (itemIndex === -1) {
            return res.status(404).json({
                status: 'error',
                message: 'Item not found in cart'
            });
        }
        
        cart.items.splice(itemIndex, 1);
        cart.updatedAt = new Date();
        
        res.json({
            status: 'success',
            message: 'Item removed from cart successfully',
            data: {
                itemsInCart: cart.items.length,
                totalQuantity: cart.items.reduce((sum, item) => sum + item.quantity, 0)
            }
        });
        
    } catch (error) {
        logger.error('Remove from cart error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to remove item from cart'
        });
    }
});

// @route   DELETE /api/cart/clear
// @desc    Clear entire cart
// @access  Private
router.delete('/clear', auth, async (req, res) => {
    try {
        const cart = getUserCart(req.user.id);
        cart.items = [];
        cart.updatedAt = new Date();
        
        res.json({
            status: 'success',
            message: 'Cart cleared successfully'
        });
        
    } catch (error) {
        logger.error('Clear cart error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to clear cart'
        });
    }
});

module.exports = router;