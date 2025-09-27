const Database = require('./database');

class Category extends Database {
    constructor() {
        super();
    }

    async create(categoryData) {
        const id = this.generateId();
        const now = this.now();
        
        const sql = `INSERT INTO categories (id, name, slug, description, createdAt) 
                     VALUES (?, ?, ?, ?, ?)`;
        
        const params = [
            id,
            categoryData.name,
            categoryData.slug || categoryData.name.toLowerCase().replace(/\s+/g, '-'),
            categoryData.description || '',
            now
        ];
        
        await this.run(sql, params);
        
        return await this.findById(id);
    }

    async findById(id) {
        const sql = `SELECT * FROM categories WHERE id = ?`;
        return await this.get(sql, [id]);
    }

    async findBySlug(slug) {
        const sql = `SELECT * FROM categories WHERE slug = ?`;
        return await this.get(sql, [slug]);
    }

    async findAll() {
        const sql = `SELECT * FROM categories ORDER BY name ASC`;
        return await this.all(sql, []);
    }

    // Static methods for compatibility
    static async findById(id) {
        const category = new Category();
        return await category.findById(id);
    }

    static async find() {
        const category = new Category();
        return await category.findAll();
    }

    static async create(data) {
        const category = new Category();
        return await category.create(data);
    }
}

module.exports = Category;