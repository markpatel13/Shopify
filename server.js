const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const orderRoutes = require('./routes/orders');
const cartRoutes = require('./routes/cart');
const wishlistRoutes = require('./routes/wishlist');
const reviewRoutes = require('./routes/reviews');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payments');
const uploadRoutes = require('./routes/upload');
const analyticsRoutes = require('./routes/analytics');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Create Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.io
const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Security middleware
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'", "https://api.stripe.com"]
        }
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        status: 429
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs for auth routes
    message: {
        error: 'Too many authentication attempts, please try again later.',
        status: 429
    }
});

// Apply rate limiting
app.use(limiter);
app.use('/api/auth/login', strictLimiter);
app.use('/api/auth/register', strictLimiter);

// CORS configuration
app.use(cors({
    origin: function (origin, callback) {
        const allowedOrigins = [
            process.env.FRONTEND_URL || 'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:5500',
            'http://127.0.0.1:5500'
        ];
        
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined', { 
    stream: { write: message => logger.info(message.trim()) }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Shopify Elite API is running smoothly',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: require('./package.json').version
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// API Documentation endpoint
app.get('/api', (req, res) => {
    res.json({
        message: 'Welcome to Shopify Elite API',
        version: '1.0.0',
        documentation: '/api/docs',
        endpoints: {
            auth: '/api/auth',
            users: '/api/users',
            products: '/api/products',
            categories: '/api/categories',
            orders: '/api/orders',
            cart: '/api/cart',
            wishlist: '/api/wishlist',
            reviews: '/api/reviews',
            admin: '/api/admin',
            payments: '/api/payments',
            upload: '/api/upload',
            analytics: '/api/analytics'
        }
    });
});

// Socket.io connection handling
io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);
    
    // Join user to their personal room
    socket.on('join', (userId) => {
        socket.join(`user_${userId}`);
        logger.info(`User ${userId} joined their room`);
    });
    
    // Admin room for real-time notifications
    socket.on('join_admin', (adminId) => {
        socket.join('admin_room');
        logger.info(`Admin ${adminId} joined admin room`);
    });
    
    // Handle order status updates
    socket.on('order_update', (data) => {
        io.to(`user_${data.userId}`).emit('order_status_changed', {
            orderId: data.orderId,
            status: data.status,
            message: `Your order ${data.orderId} is now ${data.status.toLowerCase()}`
        });
    });
    
    socket.on('disconnect', () => {
        logger.info(`Socket disconnected: ${socket.id}`);
    });
});

// Make io available to routes
app.set('io', io);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        status: 'error',
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
    });
});

// Global error handler
app.use(errorHandler);

// SQLite Database connection
const connectDB = async () => {
    try {
        const db = new sqlite3.Database('./database.sqlite', (err) => {
            if (err) {
                logger.error('SQLite connection failed:', err);
                process.exit(1);
            }
            logger.info('SQLite Database Connected');
        });
        
        // Make db available globally
        global.db = db;
        
        // Initialize database tables
        await initializeTables();
        
    } catch (error) {
        logger.error('Database connection failed:', error);
        process.exit(1);
    }
};

// Initialize SQLite tables
const initializeTables = () => {
    return new Promise((resolve, reject) => {
        const db = global.db;
        
        // Users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'customer',
            isActive INTEGER DEFAULT 1,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        
        // Products table
        db.run(`CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            category TEXT,
            sku TEXT UNIQUE,
            stock INTEGER DEFAULT 0,
            status TEXT DEFAULT 'active',
            images TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        
        // Orders table
        db.run(`CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            orderNumber TEXT UNIQUE NOT NULL,
            customerId TEXT NOT NULL,
            items TEXT NOT NULL,
            subtotal REAL NOT NULL,
            tax REAL NOT NULL,
            total REAL NOT NULL,
            status TEXT DEFAULT 'pending',
            shippingAddress TEXT,
            paymentMethod TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customerId) REFERENCES users(id)
        )`);
        
        // Categories table
        db.run(`CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            description TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                logger.error('Error creating tables:', err);
                reject(err);
            } else {
                logger.info('Database tables initialized');
                resolve();
            }
        });
    });
};

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    
    httpServer.close(() => {
        logger.info('HTTP server closed');
        
        if (global.db) {
            global.db.close((err) => {
                if (err) {
                    logger.error('Error closing SQLite database:', err);
                } else {
                    logger.info('SQLite database connection closed');
                }
                process.exit(0);
            });
        } else {
            process.exit(0);
        }
    });
    
    // Force shutdown after 30 seconds
    setTimeout(() => {
        logger.error('Forced shutdown after 30 seconds');
        process.exit(1);
    }, 30000);
};

// Handle process signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Rejection:', err);
    gracefulShutdown('unhandledRejection');
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await connectDB();
    
    httpServer.listen(PORT, () => {
        logger.info(`🚀 Shopify Elite API Server running on port ${PORT}`);
        logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
        logger.info(`📚 API docs: http://localhost:${PORT}/api`);
        
        // Log all registered routes in development
        if (process.env.NODE_ENV !== 'production') {
            logger.info('🛣️  Registered routes:');
            app._router.stack.forEach((middleware) => {
                if (middleware.route) {
                    const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
                    logger.info(`   ${methods} ${middleware.route.path}`);
                } else if (middleware.name === 'router') {
                    middleware.handle.stack.forEach((handler) => {
                        if (handler.route) {
                            const methods = Object.keys(handler.route.methods).join(', ').toUpperCase();
                            logger.info(`   ${methods} ${handler.route.path}`);
                        }
                    });
                }
            });
        }
    });
};

// Initialize server
if (require.main === module) {
    startServer().catch((error) => {
        logger.error('Failed to start server:', error);
        process.exit(1);
    });
}

module.exports = { app, httpServer, io };