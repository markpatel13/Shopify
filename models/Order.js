const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    productSnapshot: {
        name: String,
        price: Number,
        image: String,
        sku: String
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    total: {
        type: Number,
        required: true,
        min: 0
    },
    variant: {
        name: String,
        value: String
    }
});

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        unique: true,
        required: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [orderItemSchema],
    pricing: {
        subtotal: {
            type: Number,
            required: true,
            min: 0
        },
        tax: {
            type: Number,
            default: 0,
            min: 0
        },
        shipping: {
            type: Number,
            default: 0,
            min: 0
        },
        discount: {
            type: Number,
            default: 0,
            min: 0
        },
        total: {
            type: Number,
            required: true,
            min: 0
        }
    },
    shippingAddress: {
        name: {
            type: String,
            required: true
        },
        street: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        country: {
            type: String,
            required: true
        },
        zipCode: {
            type: String,
            required: true
        },
        phone: String
    },
    billingAddress: {
        name: String,
        street: String,
        city: String,
        state: String,
        country: String,
        zipCode: String,
        phone: String,
        sameAsShipping: {
            type: Boolean,
            default: true
        }
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
        default: 'pending'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['credit_card', 'debit_card', 'paypal', 'stripe', 'cash_on_delivery'],
        required: true
    },
    paymentDetails: {
        transactionId: String,
        paymentIntentId: String, // Stripe payment intent ID
        last4: String, // Last 4 digits of card
        brand: String, // Card brand (visa, mastercard, etc.)
        expiryMonth: Number,
        expiryYear: Number
    },
    shipping: {
        method: String,
        carrier: String,
        trackingNumber: String,
        trackingUrl: String,
        estimatedDelivery: Date,
        actualDelivery: Date
    },
    notes: {
        customer: String,
        internal: String
    },
    timeline: [{
        status: String,
        message: String,
        timestamp: {
            type: Date,
            default: Date.now
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    refunds: [{
        amount: {
            type: Number,
            required: true
        },
        reason: String,
        processedAt: {
            type: Date,
            default: Date.now
        },
        processedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        refundId: String // External refund ID
    }],
    coupon: {
        code: String,
        discountAmount: Number,
        discountType: {
            type: String,
            enum: ['percentage', 'fixed']
        }
    },
    isGift: {
        type: Boolean,
        default: false
    },
    giftMessage: String,
    source: {
        type: String,
        enum: ['web', 'mobile', 'admin'],
        default: 'web'
    },
    deliveredAt: Date,
    cancelledAt: Date,
    cancelReason: String
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'shipping.trackingNumber': 1 });

// Virtual for order age in days
orderSchema.virtual('orderAge').get(function() {
    return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual for total items count
orderSchema.virtual('totalItems').get(function() {
    return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Virtual for refunded amount
orderSchema.virtual('refundedAmount').get(function() {
    return this.refunds.reduce((total, refund) => total + refund.amount, 0);
});

// Pre-save middleware to generate order number
orderSchema.pre('save', async function(next) {
    if (this.isNew) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        // Find the last order of the day
        const lastOrder = await this.constructor.findOne({
            orderNumber: new RegExp(`^ORD-${year}${month}${day}-`)
        }).sort({ orderNumber: -1 });
        
        let sequence = 1;
        if (lastOrder) {
            const lastSequence = parseInt(lastOrder.orderNumber.split('-')[2]);
            sequence = lastSequence + 1;
        }
        
        this.orderNumber = `ORD-${year}${month}${day}-${String(sequence).padStart(4, '0')}`;
    }
    next();
});

// Pre-save middleware to update timeline
orderSchema.pre('save', function(next) {
    if (this.isModified('status') && !this.isNew) {
        this.timeline.push({
            status: this.status,
            message: `Order status changed to ${this.status}`,
            timestamp: new Date()
        });
        
        // Update specific timestamps
        if (this.status === 'delivered' && !this.deliveredAt) {
            this.deliveredAt = new Date();
        }
        
        if (this.status === 'cancelled' && !this.cancelledAt) {
            this.cancelledAt = new Date();
        }
    }
    next();
});

// Method to calculate totals
orderSchema.methods.calculateTotals = function() {
    this.pricing.subtotal = this.items.reduce((sum, item) => sum + item.total, 0);
    
    // Apply coupon discount
    let discount = 0;
    if (this.coupon) {
        if (this.coupon.discountType === 'percentage') {
            discount = (this.pricing.subtotal * this.coupon.discountAmount) / 100;
        } else {
            discount = this.coupon.discountAmount;
        }
    }
    
    this.pricing.discount = discount;
    this.pricing.total = this.pricing.subtotal + this.pricing.tax + this.pricing.shipping - discount;
    
    return this;
};

// Method to add timeline entry
orderSchema.methods.addTimelineEntry = function(status, message, updatedBy) {
    this.timeline.push({
        status,
        message,
        timestamp: new Date(),
        updatedBy
    });
    return this.save();
};

// Method to process refund
orderSchema.methods.processRefund = function(amount, reason, processedBy) {
    this.refunds.push({
        amount,
        reason,
        processedAt: new Date(),
        processedBy
    });
    
    const totalRefunded = this.refundedAmount + amount;
    
    if (totalRefunded >= this.pricing.total) {
        this.paymentStatus = 'refunded';
        this.status = 'refunded';
    } else {
        this.paymentStatus = 'partially_refunded';
    }
    
    return this.save();
};

// Static method to find orders by customer
orderSchema.statics.findByCustomer = function(customerId, options = {}) {
    return this.find({ customer: customerId })
        .populate('items.product')
        .sort(options.sort || { createdAt: -1 })
        .limit(options.limit || 20);
};

// Static method to get order statistics
orderSchema.statics.getStatistics = function(dateRange = {}) {
    const matchQuery = {};
    
    if (dateRange.start && dateRange.end) {
        matchQuery.createdAt = {
            $gte: new Date(dateRange.start),
            $lte: new Date(dateRange.end)
        };
    }
    
    return this.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: '$pricing.total' },
                averageOrderValue: { $avg: '$pricing.total' },
                totalItems: { $sum: { $sum: '$items.quantity' } }
            }
        }
    ]);
};

module.exports = mongoose.model('Order', orderSchema);