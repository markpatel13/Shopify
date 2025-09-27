const logger = require('../utils/logger');

/**
 * Global error handler middleware
 * Handles all errors in a consistent format
 */
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log error
    logger.error('Error:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        user: req.user ? req.user.email : 'anonymous'
    });

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = 'Resource not found';
        error = {
            message,
            statusCode: 404,
            code: 'RESOURCE_NOT_FOUND'
        };
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        const value = err.keyValue[field];
        const message = `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists`;
        error = {
            message,
            statusCode: 400,
            code: 'DUPLICATE_FIELD'
        };
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message).join(', ');
        error = {
            message,
            statusCode: 400,
            code: 'VALIDATION_ERROR',
            details: Object.values(err.errors).map(val => ({
                field: val.path,
                message: val.message,
                value: val.value
            }))
        };
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        error = {
            message: 'Invalid token',
            statusCode: 401,
            code: 'INVALID_TOKEN'
        };
    }

    if (err.name === 'TokenExpiredError') {
        error = {
            message: 'Token expired',
            statusCode: 401,
            code: 'TOKEN_EXPIRED'
        };
    }

    // Rate limit error
    if (err.status === 429) {
        error = {
            message: 'Too many requests, please try again later',
            statusCode: 429,
            code: 'RATE_LIMIT_EXCEEDED'
        };
    }

    // File upload errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        error = {
            message: 'File too large',
            statusCode: 400,
            code: 'FILE_TOO_LARGE'
        };
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        error = {
            message: 'Unexpected file field',
            statusCode: 400,
            code: 'UNEXPECTED_FILE'
        };
    }

    // Payment errors
    if (err.type === 'StripeError') {
        error = {
            message: 'Payment processing failed',
            statusCode: 400,
            code: 'PAYMENT_FAILED',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        };
    }

    // Database connection errors
    if (err.name === 'MongoError' || err.name === 'MongooseError') {
        error = {
            message: 'Database connection error',
            statusCode: 503,
            code: 'DATABASE_ERROR'
        };
    }

    // Network/timeout errors
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
        error = {
            message: 'Service temporarily unavailable',
            statusCode: 503,
            code: 'SERVICE_UNAVAILABLE'
        };
    }

    // Default to 500 server error
    const statusCode = error.statusCode || err.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    const code = error.code || 'INTERNAL_ERROR';

    // Prepare error response
    const errorResponse = {
        status: 'error',
        message,
        code,
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
    };

    // Add additional details in development
    if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = err.stack;
        errorResponse.details = error.details;
    }

    // Add request ID if available
    if (req.id) {
        errorResponse.requestId = req.id;
    }

    res.status(statusCode).json(errorResponse);
};

/**
 * Async error handler wrapper
 * Wraps async route handlers to catch errors
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * 404 handler for undefined routes
 */
const notFound = (req, res, next) => {
    const error = new Error(`Route ${req.originalUrl} not found`);
    error.statusCode = 404;
    error.code = 'ROUTE_NOT_FOUND';
    next(error);
};

module.exports = {
    errorHandler,
    asyncHandler,
    notFound
};