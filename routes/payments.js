const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');
const router = express.Router();

// @route   POST /api/payments/create-intent
// @desc    Create payment intent
// @access  Private
router.post('/create-intent', [
    auth,
    body('amount').isNumeric().withMessage('Valid amount is required'),
    body('currency').isIn(['inr', 'usd', 'eur', 'gbp']).withMessage('Valid currency is required')
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
        
        const { amount, currency = 'inr', metadata = {} } = req.body;
        
        // Simulate payment intent creation (would integrate with Stripe in production)
        const paymentIntent = {
            id: `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            amount: Math.round(amount * 100), // Convert to cents
            currency,
            status: 'requires_payment_method',
            client_secret: `pi_${Date.now()}_secret_${Math.random().toString(36)}`,
            metadata: {
                userId: req.user.id,
                ...metadata
            },
            created: new Date().toISOString()
        };
        
        logger.info(`Payment intent created: ${paymentIntent.id} for ${req.user.email}`);
        
        res.json({
            status: 'success',
            data: {
                paymentIntent
            }
        });
        
    } catch (error) {
        logger.error('Create payment intent error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create payment intent'
        });
    }
});

// @route   POST /api/payments/confirm
// @desc    Confirm payment
// @access  Private
router.post('/confirm', [
    auth,
    body('paymentIntentId').notEmpty().withMessage('Payment intent ID is required'),
    body('paymentMethodId').notEmpty().withMessage('Payment method ID is required')
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
        
        const { paymentIntentId, paymentMethodId } = req.body;
        
        // Simulate payment confirmation (would integrate with Stripe in production)
        const paymentResult = {
            id: paymentIntentId,
            status: 'succeeded',
            amount: 2999, // Example amount in cents
            currency: 'inr',
            paymentMethod: paymentMethodId,
            receiptUrl: `https://pay.stripe.com/receipts/${paymentIntentId}`,
            confirmedAt: new Date().toISOString()
        };
        
        logger.info(`Payment confirmed: ${paymentIntentId} for ${req.user.email}`);
        
        res.json({
            status: 'success',
            message: 'Payment confirmed successfully',
            data: {
                payment: paymentResult
            }
        });
        
    } catch (error) {
        logger.error('Confirm payment error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to confirm payment'
        });
    }
});

// @route   GET /api/payments/methods
// @desc    Get user payment methods
// @access  Private
router.get('/methods', auth, async (req, res) => {
    try {
        // Simulate getting payment methods (would integrate with Stripe in production)
        const paymentMethods = [
            {
                id: 'pm_1234567890',
                type: 'card',
                card: {
                    brand: 'visa',
                    last4: '4242',
                    expMonth: 12,
                    expYear: 2025
                },
                isDefault: true
            }
        ];
        
        res.json({
            status: 'success',
            data: {
                paymentMethods
            }
        });
        
    } catch (error) {
        logger.error('Get payment methods error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch payment methods'
        });
    }
});

module.exports = router;