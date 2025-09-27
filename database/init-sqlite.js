const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('./database.sqlite');

async function initializeDatabase() {
    console.log('Initializing SQLite database...');

    // Create tables
    db.serialize(() => {
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
        )`);

        console.log('Tables created, inserting sample data...');
        
        // Insert default admin user
        const adminPassword = bcrypt.hashSync('admin123', 12);
        const adminId = 'admin_' + Date.now();
        
        db.run(`INSERT OR REPLACE INTO users (id, name, email, password, role, createdAt, updatedAt) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`, 
                [adminId, 'Admin User', 'admin@shopify.com', adminPassword, 'admin', 
                 new Date().toISOString(), new Date().toISOString()], 
                function(err) {
                    if (err) console.error('Error inserting admin:', err);
                    else console.log('Admin user created');
                });

        // Insert sample categories
        const categories = [
            { name: 'Electronics', slug: 'electronics' },
            { name: 'Fashion', slug: 'fashion' },
            { name: 'Home & Living', slug: 'home' },
            { name: 'Sports', slug: 'sports' }
        ];

        categories.forEach((cat, index) => {
            setTimeout(() => {
                const catId = 'cat_' + Date.now() + '_' + index;
                db.run(`INSERT OR REPLACE INTO categories (id, name, slug, description, createdAt) 
                        VALUES (?, ?, ?, ?, ?)`, 
                        [catId, cat.name, cat.slug, cat.name + ' products', new Date().toISOString()],
                        function(err) {
                            if (err) console.error('Error inserting category:', err);
                            else console.log('Category created:', cat.name);
                        });
            }, index * 10);
        });

        // Insert sample products
        setTimeout(() => {
            const products = [
                {
                    name: 'Premium Wireless Headphones',
                    description: 'High-quality wireless headphones with noise cancellation',
                    price: 249.99,
                    category: 'electronics',
                    sku: 'WH-001',
                    stock: 50
                },
                {
                    name: 'Smart Fitness Watch',
                    description: 'Advanced smartwatch with health tracking',
                    price: 199.99,
                    category: 'electronics',
                    sku: 'SW-001',
                    stock: 30
                }
            ];

            products.forEach((product, index) => {
                setTimeout(() => {
                    const productId = 'prod_' + Date.now() + '_' + index;
                    const images = JSON.stringify([{
                        url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop',
                        isDefault: true,
                        alt: product.name
                    }]);
                    
                    db.run(`INSERT OR REPLACE INTO products 
                            (id, name, description, price, category, sku, stock, status, images, createdAt, updatedAt) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                            [productId, product.name, product.description, product.price, 
                             product.category, product.sku, product.stock, 'active', images,
                             new Date().toISOString(), new Date().toISOString()],
                            function(err) {
                                if (err) console.error('Error inserting product:', err);
                                else console.log('Product created:', product.name);
                            });
                }, index * 20);
            });
        }, 100);
    });

    console.log('Database initialized successfully!');
}

// Run initialization
initializeDatabase();

// Close database connection
db.close((err) => {
    if (err) {
        console.error('Error closing database:', err);
    } else {
        console.log('Database connection closed.');
    }
});