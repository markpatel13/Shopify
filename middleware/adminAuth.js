const logger = require('../utils/logger');

/**
 * Admin authorization middleware
 * Requires auth middleware to be used first
 * Checks if user has admin or moderator role
 */
const adminAuth = (req, res, next) => {
    try {
        // Check if user exists (should be set by auth middleware)
        if (!req.user) {
            return res.status(401).json({
                status: 'error',
                message: 'Authentication required.',
                code: 'AUTH_REQUIRED'
            });
        }

        // Check if user has admin role
        if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
            logger.warn(`Unauthorized admin access attempt by user: ${req.user.email}`);
            return res.status(403).json({
                status: 'error',
                message: 'Access denied. Admin privileges required.',
                code: 'INSUFFICIENT_PRIVILEGES'
            });
        }

        // User has admin access, continue
        next();

    } catch (error) {
        logger.error('Admin auth middleware error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Authorization check failed.',
            code: 'AUTH_CHECK_ERROR'
        });
    }
};

/**
 * Super admin authorization middleware
 * Only allows users with 'admin' role (not moderator)
 */
const superAdminAuth = (req, res, next) => {
    try {
        // Check if user exists (should be set by auth middleware)
        if (!req.user) {
            return res.status(401).json({
                status: 'error',
                message: 'Authentication required.',
                code: 'AUTH_REQUIRED'
            });
        }

        // Check if user has admin role (not moderator)
        if (req.user.role !== 'admin') {
            logger.warn(`Unauthorized super admin access attempt by user: ${req.user.email} (role: ${req.user.role})`);
            return res.status(403).json({
                status: 'error',
                message: 'Access denied. Super admin privileges required.',
                code: 'INSUFFICIENT_PRIVILEGES'
            });
        }

        // User has super admin access, continue
        next();

    } catch (error) {
        logger.error('Super admin auth middleware error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Authorization check failed.',
            code: 'AUTH_CHECK_ERROR'
        });
    }
};

/**
 * Owner or admin authorization middleware
 * Allows access if user owns the resource or is admin
 * Requires resourceUserId parameter to be set by previous middleware
 */
const ownerOrAdminAuth = (req, res, next) => {
    try {
        // Check if user exists
        if (!req.user) {
            return res.status(401).json({
                status: 'error',
                message: 'Authentication required.',
                code: 'AUTH_REQUIRED'
            });
        }

        // Check if user is admin
        if (req.user.role === 'admin' || req.user.role === 'moderator') {
            return next();
        }

        // Check if user owns the resource
        const resourceUserId = req.resourceUserId || req.params.userId || req.body.userId;
        
        if (!resourceUserId) {
            logger.error('ownerOrAdminAuth: No resource user ID provided');
            return res.status(500).json({
                status: 'error',
                message: 'Resource ownership check failed.',
                code: 'OWNERSHIP_CHECK_ERROR'
            });
        }

        if (req.user.id === resourceUserId || req.user._id.toString() === resourceUserId) {
            return next();
        }

        // User doesn't own the resource and isn't admin
        logger.warn(`Unauthorized resource access attempt by user: ${req.user.email}`);
        return res.status(403).json({
            status: 'error',
            message: 'Access denied. You can only access your own resources.',
            code: 'ACCESS_DENIED'
        });

    } catch (error) {
        logger.error('Owner or admin auth middleware error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Authorization check failed.',
            code: 'AUTH_CHECK_ERROR'
        });
    }
};

module.exports = {
    adminAuth,
    superAdminAuth,
    ownerOrAdminAuth
};