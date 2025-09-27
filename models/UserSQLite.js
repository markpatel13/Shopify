const Database = require('./database');
const bcrypt = require('bcryptjs');

class User extends Database {
    constructor() {
        super();
    }

    async create({ name, email, password, role = 'customer' }) {
        const hashedPassword = await bcrypt.hash(password, 12);
        const id = this.generateId();
        
        const sql = `INSERT INTO users (id, name, email, password, role, createdAt, updatedAt) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;
        
        const now = this.now();
        await this.run(sql, [id, name, email, hashedPassword, role, now, now]);
        
        return await this.findById(id);
    }

    async findById(id) {
        const sql = `SELECT * FROM users WHERE id = ?`;
        const user = await this.get(sql, [id]);
        return user;
    }

    async findByEmail(email) {
        const sql = `SELECT * FROM users WHERE email = ?`;
        const user = await this.get(sql, [email]);
        return user;
    }

    async findAll(limit = 50, offset = 0) {
        const sql = `SELECT * FROM users ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
        const users = await this.all(sql, [limit, offset]);
        return users;
    }

    async updateById(id, updates) {
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);
        values.push(this.now()); // updatedAt
        values.push(id);
        
        const sql = `UPDATE users SET ${fields}, updatedAt = ? WHERE id = ?`;
        await this.run(sql, values);
        
        return await this.findById(id);
    }

    async deleteById(id) {
        const sql = `DELETE FROM users WHERE id = ?`;
        const result = await this.run(sql, [id]);
        return result.changes > 0;
    }

    async countDocuments(query = {}) {
        let sql = `SELECT COUNT(*) as count FROM users`;
        const params = [];
        
        if (query.role) {
            sql += ` WHERE role = ?`;
            params.push(query.role);
        }
        
        const result = await this.get(sql, params);
        return result.count;
    }

    async validatePassword(password, hashedPassword) {
        return await bcrypt.compare(password, hashedPassword);
    }

    // Static methods for compatibility
    static async findById(id) {
        const user = new User();
        return await user.findById(id);
    }

    static async findOne(query) {
        const user = new User();
        if (query.email) {
            return await user.findByEmail(query.email);
        }
        return null;
    }

    static async create(data) {
        const user = new User();
        return await user.create(data);
    }

    static async countDocuments(query = {}) {
        const user = new User();
        return await user.countDocuments(query);
    }
}

module.exports = User;