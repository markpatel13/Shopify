const winston = require('winston');
const path = require('path');

// Define log levels and colors
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
};

const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white'
};

winston.addColors(colors);

// Define log format
const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`
    )
);

// Define which logs to write to which transports based on environment
const level = () => {
    const env = process.env.NODE_ENV || 'development';
    const isDevelopment = env === 'development';
    return isDevelopment ? 'debug' : 'warn';
};

// Define different transports
const transports = [
    // Console transport
    new winston.transports.Console({
        level: level(),
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }),
    
    // Error log file
    new winston.transports.File({
        filename: path.join(__dirname, '../logs/error.log'),
        level: 'error',
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
        ),
        maxsize: 5242880, // 5MB
        maxFiles: 5
    }),
    
    // Combined log file
    new winston.transports.File({
        filename: path.join(__dirname, '../logs/combined.log'),
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
        ),
        maxsize: 5242880, // 5MB
        maxFiles: 5
    })
];

// Create logger instance
const logger = winston.createLogger({
    level: level(),
    levels,
    format,
    transports,
    exitOnError: false
});

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Add request logging utility
logger.logRequest = (req, res, responseTime) => {
    const message = `${req.method} ${req.originalUrl} - ${res.statusCode} - ${responseTime}ms - ${req.ip}`;
    
    if (res.statusCode >= 400) {
        logger.error(message);
    } else {
        logger.http(message);
    }
};

// Add structured logging methods
logger.logError = (message, error, meta = {}) => {
    logger.error(message, {
        error: {
            message: error.message,
            stack: error.stack,
            name: error.name
        },
        ...meta
    });
};

logger.logUserAction = (action, userId, details = {}) => {
    logger.info(`User Action: ${action}`, {
        userId,
        action,
        ...details
    });
};

logger.logSecurityEvent = (event, details = {}) => {
    logger.warn(`Security Event: ${event}`, {
        event,
        timestamp: new Date().toISOString(),
        ...details
    });
};

logger.logPerformance = (operation, duration, details = {}) => {
    const level = duration > 1000 ? 'warn' : 'info';
    logger[level](`Performance: ${operation} took ${duration}ms`, {
        operation,
        duration,
        ...details
    });
};

module.exports = logger;