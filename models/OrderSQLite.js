const Database = require('./database');

class Order extends Database {
    constructor() {
        super();
    }

    async create(orderData) {
        const id = this.generateId();
        const orderNumber = 'ORD-' + Date.now();
        const now = this.now();
        
        const sql = `INSERT INTO orders 
                     (id, orderNumber, customerId, items, subtotal, tax, total, status, shippingAddress, paymentMethod, createdAt, updatedAt) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        const params = [
            id,
            orderNumber,
            orderData.customer || orderData.customerId,
            JSON.stringify(orderData.items),
            orderData.pricing?.subtotal || orderData.subtotal || 0,
            orderData.pricing?.tax || orderData.tax || 0,
            orderData.pricing?.total || orderData.total || 0,
            orderData.status || 'pending',
            JSON.stringify(orderData.shippingAddress),
            orderData.paymentMethod,
            now,
            now
        ];
        
        await this.run(sql, params);
        
        const order = await this.findById(id);
        order.orderNumber = orderNumber;
        return order;
    }

    async findById(id) {
        const sql = `SELECT * FROM orders WHERE id = ?`;
        const order = await this.get(sql, [id]);
        
        if (order && order.items) {
            order.items = JSON.parse(order.items);
        }
        if (order && order.shippingAddress) {
            order.shippingAddress = JSON.parse(order.shippingAddress);
        }
        
        return order;
    }

    async findByCustomer(customerId, limit = 20, offset = 0) {
        const sql = `SELECT * FROM orders WHERE customerId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
        const orders = await this.all(sql, [customerId, limit, offset]);
        
        return orders.map(order => {
            if (order.items) order.items = JSON.parse(order.items);
            if (order.shippingAddress) order.shippingAddress = JSON.parse(order.shippingAddress);
            return order;
        });
    }

    async findAll(limit = 50, offset = 0, status = null) {
        let sql = `SELECT o.*, u.name as customerName, u.email as customerEmail 
                   FROM orders o 
                   LEFT JOIN users u ON o.customerId = u.id`;
        const params = [];
        
        if (status) {
            sql += ` WHERE o.status = ?`;
            params.push(status);
        }
        
        sql += ` ORDER BY o.createdAt DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);
        
        const orders = await this.all(sql, params);
        
        return orders.map(order => {
            if (order.items) order.items = JSON.parse(order.items);
            if (order.shippingAddress) order.shippingAddress = JSON.parse(order.shippingAddress);
            
            // Add customer object for compatibility
            order.customer = {
                id: order.customerId,
                name: order.customerName,
                email: order.customerEmail
            };
            
            return order;
        });
    }

    async updateStatus(id, status) {
        const sql = `UPDATE orders SET status = ?, updatedAt = ? WHERE id = ?`;
        await this.run(sql, [status, this.now(), id]);
        
        return await this.findById(id);
    }

    async countDocuments(query = {}) {
        let sql = `SELECT COUNT(*) as count FROM orders`;
        const params = [];
        
        if (query.customerId) {
            sql += ` WHERE customerId = ?`;
            params.push(query.customerId);
        } else if (query.status) {
            sql += ` WHERE status = ?`;
            params.push(query.status);
        }
        
        const result = await this.get(sql, params);
        return result.count;
    }

    // Static methods for compatibility
    static async create(data) {
        const order = new Order();
        return await order.create(data);
    }

    static async findById(id) {
        const order = new Order();
        return await order.findById(id);
    }

    static async find(query = {}) {
        const order = new Order();
        if (query.customer) {
            return await order.findByCustomer(query.customer);
        }
        return await order.findAll();
    }

    static async findByIdAndUpdate(id, updates) {
        const order = new Order();
        if (updates.status) {
            return await order.updateStatus(id, updates.status);
        }
        return await order.findById(id);
    }

    static async countDocuments(query = {}) {
        const order = new Order();
        return await order.countDocuments(query);
    }
}

module.exports = Order;