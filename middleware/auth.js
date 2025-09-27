const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Authentication middleware
 * Verifies JWT token and adds user to request object
 */
const auth = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.header('Authorization');
        const token = authHeader && authHeader.startsWith('Bearer ') 
            ? authHeader.slice(7) 
            : req.header('x-auth-token');

        if (!token) {
            return res.status(401).json({
                status: 'error',
                message: 'Access denied. No token provided.',
                code: 'NO_TOKEN'
            });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Get user from database
            const user = await User.findById(decoded.id).select('-password -refreshTokens');
            
            if (!user) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Token is valid but user no longer exists.',
                    code: 'USER_NOT_FOUND'
                });
            }

            if (!user.isActive) {
                return res.status(401).json({
                    status: 'error',
                    message: 'User account is disabled.',
                    code: 'ACCOUNT_DISABLED'
                });
            }

            // Check if account is locked
            if (user.isAccountLocked()) {
                return res.status(423).json({
                    status: 'error',
                    message: 'Account is temporarily locked.',
                    code: 'ACCOUNT_LOCKED'
                });
            }

            // Update last active timestamp
            user.activity.lastActive = new Date();
            await user.save();

            // Add user to request object
            req.user = user;
            next();

        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    status: 'error',
                    message: 'Token has expired.',
                    code: 'TOKEN_EXPIRED'
                });
            }
            
            if (jwtError.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    status: 'error',
                    message: 'Invalid token.',
                    code: 'INVALID_TOKEN'
                });
            }
            
            throw jwtError;
        }

    } catch (error) {
        logger.error('Authentication middleware error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Authentication failed.',
            code: 'AUTH_ERROR'
        });
    }
};

/**
 * Optional authentication middleware
 * Adds user to request if token is provided, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.header('Authorization');
        const token = authHeader && authHeader.startsWith('Bearer ') 
            ? authHeader.slice(7) 
            : req.header('x-auth-token');

        if (!token) {
            // No token provided, continue without user
            return next();
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Get user from database
            const user = await User.findById(decoded.id).select('-password -refreshTokens');
            
            if (user && user.isActive && !user.isAccountLocked()) {
                // Update last active timestamp
                user.activity.lastActive = new Date();
                await user.save();
                
                // Add user to request object
                req.user = user;
            }

            next();

        } catch (jwtError) {
            // Token is invalid or expired, continue without user
            next();
        }

    } catch (error) {
        logger.error('Optional authentication middleware error:', error);
        // Don't fail the request, just continue without user
        next();
    }
};

module.exports = { auth, optionalAuth };