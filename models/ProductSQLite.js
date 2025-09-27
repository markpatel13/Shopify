const Database = require('./database');

class Product extends Database {
    constructor() {
        super();
    }

    async create(productData) {
        const id = this.generateId();
        const now = this.now();
        
        const sql = `INSERT INTO products 
                     (id, name, description, price, category, sku, stock, status, images, createdAt, updatedAt) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        const params = [
            id,
            productData.name,
            productData.description || '',
            productData.price,
            productData.category,
            productData.sku || `SKU-${Date.now()}`,
            productData.inventory?.stock || productData.stock || 0,
            productData.status || 'active',
            JSON.stringify(productData.images || []),
            now,
            now
        ];
        
        await this.run(sql, params);
        
        return await this.findById(id);
    }

    async findById(id) {
        const sql = `SELECT * FROM products WHERE id = ?`;
        const product = await this.get(sql, [id]);
        
        if (product && product.images) {
            product.images = JSON.parse(product.images);
        }
        
        return product;
    }

    async findAll(query = {}, limit = 50, offset = 0) {
        let sql = `SELECT * FROM products WHERE status = 'active'`;
        const params = [];
        
        if (query.category) {
            sql += ` AND category = ?`;
            params.push(query.category);
        }
        
        sql += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);
        
        const products = await this.all(sql, params);
        
        return products.map(product => {
            if (product.images) {
                product.images = JSON.parse(product.images);
            }
            return product;
        });
    }

    async updateById(id, updates) {
        const fields = [];
        const values = [];
        
        Object.keys(updates).forEach(key => {
            if (key === 'images') {
                fields.push(`${key} = ?`);
                values.push(JSON.stringify(updates[key]));
            } else if (key === 'inventory' && updates[key].stock !== undefined) {
                fields.push(`stock = ?`);
                values.push(updates[key].stock);
            } else if (key !== 'inventory') {
                fields.push(`${key} = ?`);
                values.push(updates[key]);
            }
        });
        
        if (fields.length === 0) return await this.findById(id);
        
        values.push(this.now()); // updatedAt
        values.push(id);
        
        const sql = `UPDATE products SET ${fields.join(', ')}, updatedAt = ? WHERE id = ?`;
        await this.run(sql, values);
        
        return await this.findById(id);
    }

    async deleteById(id) {
        const sql = `UPDATE products SET status = 'deleted', updatedAt = ? WHERE id = ?`;
        const result = await this.run(sql, [this.now(), id]);
        return result.changes > 0;
    }

    async countDocuments(query = {}) {
        let sql = `SELECT COUNT(*) as count FROM products WHERE status = 'active'`;
        const params = [];
        
        if (query.category) {
            sql += ` AND category = ?`;
            params.push(query.category);
        }
        
        const result = await this.get(sql, params);
        return result.count;
    }

    // Static methods for compatibility
    static async create(data) {
        const product = new Product();
        return await product.create(data);
    }

    static async findById(id) {
        const product = new Product();
        return await product.findById(id);
    }

    static async find(query = {}) {
        const product = new Product();
        return await product.findAll(query);
    }

    static async findByIdAndUpdate(id, updates) {
        const product = new Product();
        return await product.updateById(id, updates);
    }

    static async findByIdAndDelete(id) {
        const product = new Product();
        return await product.deleteById(id);
    }

    static async countDocuments(query = {}) {
        const product = new Product();
        return await product.countDocuments(query);
    }

    static async findOne(query) {
        const product = new Product();
        let sql = `SELECT * FROM products WHERE status = 'active'`;
        const params = [];
        
        if (query.sku) {
            sql += ` AND sku = ?`;
            params.push(query.sku);
        }
        
        sql += ` LIMIT 1`;
        
        const result = await product.get(sql, params);
        if (result && result.images) {
            result.images = JSON.parse(result.images);
        }
        return result;
    }
}

module.exports = Product;