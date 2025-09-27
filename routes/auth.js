const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');
const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
    body('name')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        })
], async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { name, email, password, phone, dateOfBirth, gender } = req.body;

        // Check if user already exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({
                status: 'error',
                message: 'User with this email already exists'
            });
        }

        // Create new user
        const user = new User({
            name,
            email,
            password,
            phone,
            dateOfBirth,
            gender,
            verification: {
                email: {
                    verified: false,
                    token: require('crypto').randomBytes(32).toString('hex'),
                    expires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
                }
            }
        });

        await user.save();

        // Generate tokens
        const accessToken = user.generateAuthToken();
        const refreshToken = user.generateRefreshToken();

        // Add refresh token to user
        user.refreshTokens.push({ token: refreshToken });
        await user.save();

        // Remove sensitive data
        const userResponse = user.toObject();
        delete userResponse.password;
        delete userResponse.refreshTokens;
        delete userResponse.security;

        logger.info(`New user registered: ${email}`);

        res.status(201).json({
            status: 'success',
            message: 'User registered successfully',
            data: {
                user: userResponse,
                tokens: {
                    accessToken,
                    refreshToken
                }
            }
        });

        // TODO: Send welcome email with verification link

    } catch (error) {
        logger.error('Registration error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Registration failed',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
], async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { email, password, rememberMe } = req.body;

        // Find user and include password
        const user = await User.findOne({ 
            email: email.toLowerCase(),
            isActive: true 
        }).select('+password');

        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid email or password'
            });
        }

        // Check if account is locked
        if (user.isAccountLocked()) {
            return res.status(423).json({
                status: 'error',
                message: 'Account is temporarily locked due to too many failed login attempts. Please try again later.'
            });
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            await user.handleFailedLogin();
            return res.status(401).json({
                status: 'error',
                message: 'Invalid email or password'
            });
        }

        // Handle successful login
        await user.handleSuccessfulLogin(req);

        // Generate tokens
        const accessToken = user.generateAuthToken();
        const refreshToken = user.generateRefreshToken();

        // Add refresh token to user
        user.refreshTokens.push({ 
            token: refreshToken,
            createdAt: new Date()
        });

        // Limit refresh tokens to 5 per user
        if (user.refreshTokens.length > 5) {
            user.refreshTokens = user.refreshTokens.slice(-5);
        }

        await user.save();

        // Remove sensitive data
        const userResponse = user.toObject();
        delete userResponse.password;
        delete userResponse.refreshTokens;
        delete userResponse.security;

        logger.info(`User logged in: ${email}`);

        res.json({
            status: 'success',
            message: 'Login successful',
            data: {
                user: userResponse,
                tokens: {
                    accessToken,
                    refreshToken
                }
            }
        });

    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Login failed',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh', [
    body('refreshToken')
        .notEmpty()
        .withMessage('Refresh token is required')
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

        const { refreshToken } = req.body;

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        // Find user with this refresh token
        const user = await User.findOne({
            _id: decoded.id,
            'refreshTokens.token': refreshToken,
            isActive: true
        });

        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid refresh token'
            });
        }

        // Generate new access token
        const newAccessToken = user.generateAuthToken();

        res.json({
            status: 'success',
            message: 'Token refreshed successfully',
            data: {
                accessToken: newAccessToken
            }
        });

    } catch (error) {
        logger.error('Token refresh error:', error);
        res.status(401).json({
            status: 'error',
            message: 'Invalid or expired refresh token'
        });
    }
});

// @route   POST /api/auth/logout
// @desc    Logout user (invalidate refresh token)
// @access  Private
router.post('/logout', auth, async (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        if (refreshToken) {
            // Remove specific refresh token
            await User.findByIdAndUpdate(req.user.id, {
                $pull: { refreshTokens: { token: refreshToken } }
            });
        } else {
            // Remove all refresh tokens (logout from all devices)
            await User.findByIdAndUpdate(req.user.id, {
                $set: { refreshTokens: [] }
            });
        }

        logger.info(`User logged out: ${req.user.email}`);

        res.json({
            status: 'success',
            message: 'Logged out successfully'
        });

    } catch (error) {
        logger.error('Logout error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Logout failed',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @route   POST /api/auth/forgot-password
// @desc    Request password reset
// @access  Public
router.post('/forgot-password', [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email')
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

        const { email } = req.body;

        const user = await User.findByEmail(email);
        if (!user) {
            // Don't reveal if email exists or not for security
            return res.json({
                status: 'success',
                message: 'If an account with that email exists, a password reset link has been sent.'
            });
        }

        // Generate reset token
        const resetToken = user.generateResetPasswordToken();
        await user.save();

        // TODO: Send password reset email
        
        logger.info(`Password reset requested for: ${email}`);

        res.json({
            status: 'success',
            message: 'If an account with that email exists, a password reset link has been sent.',
            // In development, return the token
            ...(process.env.NODE_ENV === 'development' && { resetToken })
        });

    } catch (error) {
        logger.error('Forgot password error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to process password reset request'
        });
    }
});

// @route   POST /api/auth/reset-password/:token
// @desc    Reset password
// @access  Public
router.post('/reset-password/:token', [
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        })
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

        const { password } = req.body;
        const { token } = req.params;

        // Hash the token to compare with stored hash
        const hashedToken = require('crypto')
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: Date.now() },
            isActive: true
        });

        if (!user) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid or expired password reset token'
            });
        }

        // Set new password
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        
        // Clear all refresh tokens (logout from all devices)
        user.refreshTokens = [];

        await user.save();

        logger.info(`Password reset completed for: ${user.email}`);

        res.json({
            status: 'success',
            message: 'Password reset successful. Please log in with your new password.'
        });

    } catch (error) {
        logger.error('Reset password error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Password reset failed'
        });
    }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('addresses')
            .select('-password -refreshTokens -security.twoFactorAuth.secret');

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        res.json({
            status: 'success',
            data: {
                user
            }
        });

    } catch (error) {
        logger.error('Get current user error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get user information'
        });
    }
});

// @route   PUT /api/auth/change-password
// @desc    Change password
// @access  Private
router.put('/change-password', [
    auth,
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Passwords do not match');
            }
            return true;
        })
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

        const { currentPassword, newPassword } = req.body;

        // Get user with password
        const user = await User.findById(req.user.id).select('+password');
        
        // Verify current password
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                status: 'error',
                message: 'Current password is incorrect'
            });
        }

        // Update password
        user.password = newPassword;
        
        // Clear refresh tokens except current session
        const currentRefreshToken = req.headers['x-refresh-token'];
        if (currentRefreshToken) {
            user.refreshTokens = user.refreshTokens.filter(
                tokenObj => tokenObj.token === currentRefreshToken
            );
        } else {
            user.refreshTokens = [];
        }

        await user.save();

        logger.info(`Password changed for user: ${user.email}`);

        res.json({
            status: 'success',
            message: 'Password changed successfully'
        });

    } catch (error) {
        logger.error('Change password error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to change password'
        });
    }
});

module.exports = router;