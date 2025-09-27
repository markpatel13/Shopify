const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Creating SQLite database...');

db.serialize(() => {
    // Drop existing tables
    db.run('DROP TABLE IF EXISTS users');
    db.run('DROP TABLE IF EXISTS products');
    db.run('DROP TABLE IF EXISTS orders');
    db.run('DROP TABLE IF EXISTS categories');

    // Create users table
    db.run(`CREATE TABLE users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'customer',
        isActive INTEGER DEFAULT 1,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create products table  
    db.run(`CREATE TABLE products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        category TEXT,
        sku TEXT UNIQUE,
        stock INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        images TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create orders table
    db.run(`CREATE TABLE orders (
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
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create categories table
    db.run(`CREATE TABLE categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    // Insert admin user
    const adminId = 'admin_001';
    const adminPassword = bcrypt.hashSync('admin123', 12);
    db.run(`INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)`,
        [adminId, 'Admin User', 'admin@shopify.com', adminPassword, 'admin']);

    // Insert sample customer
    const customerId = 'customer_001';
    const customerPassword = bcrypt.hashSync('customer123', 12);
    db.run(`INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)`,
        [customerId, 'John Doe', 'john@example.com', customerPassword, 'customer']);

    // Insert categories
    db.run(`INSERT INTO categories (id, name, slug, description) VALUES (?, ?, ?, ?)`,
        ['cat_001', 'Electronics', 'electronics', 'Electronic devices and accessories']);
    db.run(`INSERT INTO categories (id, name, slug, description) VALUES (?, ?, ?, ?)`,
        ['cat_002', 'Fashion', 'fashion', 'Clothing and fashion accessories']);
    db.run(`INSERT INTO categories (id, name, slug, description) VALUES (?, ?, ?, ?)`,
        ['cat_003', 'Home', 'home', 'Home and living products']);
    db.run(`INSERT INTO categories (id, name, slug, description) VALUES (?, ?, ?, ?)`,
        ['cat_004', 'Sports', 'sports', 'Sports and fitness equipment']);

    // Insert sample products
    const images1 = JSON.stringify([{
        url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop',
        isDefault: true,
        alt: 'Wireless Headphones'
    }]);

    const images2 = JSON.stringify([{
        url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop',
        isDefault: true,
        alt: 'Smart Watch'
    }]);

    db.run(`INSERT INTO products (id, name, description, price, category, sku, stock, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['prod_001', 'Premium Wireless Headphones', 'High-quality wireless headphones with noise cancellation', 249.99, 'electronics', 'WH-001', 50, images1]);

    db.run(`INSERT INTO products (id, name, description, price, category, sku, stock, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['prod_002', 'Smart Fitness Watch', 'Advanced smartwatch with health tracking', 199.99, 'electronics', 'SW-001', 30, images2]);

    console.log('Sample data inserted successfully!');
});

db.close((err) => {
    if (err) {
        console.error('Error closing database:', err);
    } else {
        console.log('Database created and initialized successfully!');
    }
});