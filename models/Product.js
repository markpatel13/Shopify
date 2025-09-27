const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
        maxlength: [200, 'Product name cannot exceed 200 characters']
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true
    },
    description: {
        type: String,
        required: [true, 'Product description is required'],
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    shortDescription: {
        type: String,
        maxlength: [500, 'Short description cannot exceed 500 characters']
    },
    price: {
        type: Number,
        required: [true, 'Product price is required'],
        min: [0, 'Price cannot be negative']
    },
    originalPrice: {
        type: Number,
        min: [0, 'Original price cannot be negative']
    },
    discountPercentage: {
        type: Number,
        min: [0, 'Discount cannot be negative'],
        max: [100, 'Discount cannot exceed 100%'],
        default: 0
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Product category is required']
    },
    subcategory: {
        type: String,
        trim: true
    },
    brand: {
        type: String,
        trim: true
    },
    sku: {
        type: String,
        required: [true, 'SKU is required'],
        unique: true,
        uppercase: true,
        trim: true
    },
    images: [{
        public_id: {
            type: String,
            required: true
        },
        url: {
            type: String,
            required: true
        },
        alt: String,
        isDefault: {
            type: Boolean,
            default: false
        }
    }],
    inventory: {
        stock: {
            type: Number,
            required: [true, 'Stock quantity is required'],
            min: [0, 'Stock cannot be negative'],
            default: 0
        },
        lowStockThreshold: {
            type: Number,
            default: 10
        },
        trackInventory: {
            type: Boolean,
            default: true
        },
        allowBackorders: {
            type: Boolean,
            default: false
        },
        warehouse: {
            type: String,
            default: 'main'
        }
    },
    dimensions: {
        weight: {
            value: Number,
            unit: {
                type: String,
                enum: ['kg', 'lb', 'g', 'oz'],
                default: 'kg'
            }
        },
        length: {
            value: Number,
            unit: {
                type: String,
                enum: ['cm', 'in', 'm', 'ft'],
                default: 'cm'
            }
        },
        width: {
            value: Number,
            unit: {
                type: String,
                enum: ['cm', 'in', 'm', 'ft'],
                default: 'cm'
            }
        },
        height: {
            value: Number,
            unit: {
                type: String,
                enum: ['cm', 'in', 'm', 'ft'],
                default: 'cm'
            }
        }
    },
    variants: [{
        name: String, // e.g., "Size", "Color"
        value: String, // e.g., "Large", "Red"
        price: Number,
        stock: Number,
        sku: String,
        image: {
            public_id: String,
            url: String
        }
    }],
    specifications: [{
        name: String,
        value: String
    }],
    tags: [String],
    ratings: {
        average: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        count: {
            type: Number,
            default: 0
        },
        distribution: {
            five: { type: Number, default: 0 },
            four: { type: Number, default: 0 },
            three: { type: Number, default: 0 },
            two: { type: Number, default: 0 },
            one: { type: Number, default: 0 }
        }
    },
    reviews: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Review'
    }],
    seo: {
        metaTitle: String,
        metaDescription: String,
        keywords: [String],
        canonicalUrl: String
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'draft', 'archived'],
        default: 'active'
    },
    featured: {
        type: Boolean,
        default: false
    },
    trending: {
        type: Boolean,
        default: false
    },
    newArrival: {
        type: Boolean,
        default: false
    },
    bestSeller: {
        type: Boolean,
        default: false
    },
    onSale: {
        type: Boolean,
        default: false
    },
    badges: [String], // e.g., ['Bestseller', 'New', 'Sale', 'Organic']
    shipping: {
        weight: Number,
        requiresShipping: {
            type: Boolean,
            default: true
        },
        shippingClass: String,
        freeShipping: {
            type: Boolean,
            default: false
        }
    },
    relatedProducts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    crossSells: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    upsells: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    analytics: {
        views: {
            type: Number,
            default: 0
        },
        purchases: {
            type: Number,
            default: 0
        },
        wishlisted: {
            type: Number,
            default: 0
        },
        cartAdditions: {
            type: Number,
            default: 0
        },
        conversionRate: {
            type: Number,
            default: 0
        }
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    publishedAt: Date,
    deletedAt: Date
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ price: 1 });
productSchema.index({ 'ratings.average': -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ featured: 1, status: 1 });
productSchema.index({ trending: 1, status: 1 });
productSchema.index({ bestSeller: 1, status: 1 });
productSchema.index({ slug: 1 });
productSchema.index({ sku: 1 });
productSchema.index({ 'inventory.stock': 1 });

// Virtual for discount amount
productSchema.virtual('discountAmount').get(function() {
    if (this.originalPrice && this.originalPrice > this.price) {
        return this.originalPrice - this.price;
    }
    return 0;
});

// Virtual for calculating actual discount percentage
productSchema.virtual('actualDiscountPercentage').get(function() {
    if (this.originalPrice && this.originalPrice > this.price) {
        return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
    }
    return 0;
});

// Virtual for stock status
productSchema.virtual('stockStatus').get(function() {
    if (!this.inventory.trackInventory) return 'in_stock';
    if (this.inventory.stock <= 0) return 'out_of_stock';
    if (this.inventory.stock <= this.inventory.lowStockThreshold) return 'low_stock';
    return 'in_stock';
});

// Virtual for availability
productSchema.virtual('availability').get(function() {
    if (this.status !== 'active') return 'unavailable';
    if (!this.inventory.trackInventory) return 'available';
    if (this.inventory.stock > 0) return 'available';
    if (this.inventory.allowBackorders) return 'backorder';
    return 'unavailable';
});

// Virtual for main image
productSchema.virtual('mainImage').get(function() {
    const defaultImage = this.images.find(img => img.isDefault);
    return defaultImage || this.images[0] || null;
});

// Virtual for image gallery
productSchema.virtual('gallery').get(function() {
    return this.images.filter(img => !img.isDefault);
});

// Pre-save middleware to generate slug
productSchema.pre('save', function(next) {
    if (this.isModified('name') || this.isNew) {
        this.slug = this.name
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
    next();
});

// Pre-save middleware to calculate discount percentage
productSchema.pre('save', function(next) {
    if (this.originalPrice && this.originalPrice > this.price) {
        this.discountPercentage = Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
        this.onSale = true;
    } else {
        this.discountPercentage = 0;
        this.onSale = false;
    }
    next();
});

// Pre-save middleware to set default image
productSchema.pre('save', function(next) {
    if (this.images && this.images.length > 0) {
        const hasDefault = this.images.some(img => img.isDefault);
        if (!hasDefault) {
            this.images[0].isDefault = true;
        }
    }
    next();
});

// Method to update ratings
productSchema.methods.updateRatings = async function(newRating, oldRating = null) {
    const Review = mongoose.model('Review');
    const reviews = await Review.find({ product: this._id, isApproved: true });
    
    if (reviews.length === 0) {
        this.ratings.average = 0;
        this.ratings.count = 0;
        this.ratings.distribution = { five: 0, four: 0, three: 0, two: 0, one: 0 };
        return this.save();
    }
    
    // Calculate new average
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    this.ratings.average = Math.round((totalRating / reviews.length) * 10) / 10;
    this.ratings.count = reviews.length;
    
    // Calculate distribution
    this.ratings.distribution = { five: 0, four: 0, three: 0, two: 0, one: 0 };
    reviews.forEach(review => {
        switch (review.rating) {
            case 5: this.ratings.distribution.five++; break;
            case 4: this.ratings.distribution.four++; break;
            case 3: this.ratings.distribution.three++; break;
            case 2: this.ratings.distribution.two++; break;
            case 1: this.ratings.distribution.one++; break;
        }
    });
    
    return this.save();
};

// Method to check if product is in stock
productSchema.methods.isInStock = function(quantity = 1) {
    if (!this.inventory.trackInventory) return true;
    return this.inventory.stock >= quantity;
};

// Method to reserve stock
productSchema.methods.reserveStock = function(quantity) {
    if (!this.inventory.trackInventory) return Promise.resolve(true);
    
    if (this.inventory.stock < quantity) {
        throw new Error('Insufficient stock');
    }
    
    this.inventory.stock -= quantity;
    return this.save();
};

// Method to release reserved stock
productSchema.methods.releaseStock = function(quantity) {
    if (!this.inventory.trackInventory) return Promise.resolve(true);
    
    this.inventory.stock += quantity;
    return this.save();
};

// Method to increment view count
productSchema.methods.incrementViews = function() {
    this.analytics.views += 1;
    return this.save();
};

// Method to increment cart additions
productSchema.methods.incrementCartAdditions = function() {
    this.analytics.cartAdditions += 1;
    this.updateConversionRate();
    return this.save();
};

// Method to increment purchases
productSchema.methods.incrementPurchases = function() {
    this.analytics.purchases += 1;
    this.updateConversionRate();
    return this.save();
};

// Method to increment wishlist count
productSchema.methods.incrementWishlisted = function() {
    this.analytics.wishlisted += 1;
    return this.save();
};

// Method to update conversion rate
productSchema.methods.updateConversionRate = function() {
    if (this.analytics.views > 0) {
        this.analytics.conversionRate = (this.analytics.purchases / this.analytics.views) * 100;
    }
};

// Static method to find by category
productSchema.statics.findByCategory = function(categoryId, options = {}) {
    const query = { 
        category: categoryId, 
        status: 'active',
        deletedAt: { $exists: false }
    };
    
    return this.find(query)
        .populate('category')
        .populate('reviews', 'rating comment user createdAt')
        .sort(options.sort || { createdAt: -1 })
        .limit(options.limit || 20);
};

// Static method to search products
productSchema.statics.searchProducts = function(searchTerm, options = {}) {
    const query = {
        $text: { $search: searchTerm },
        status: 'active',
        deletedAt: { $exists: false }
    };
    
    return this.find(query, { score: { $meta: 'textScore' } })
        .populate('category')
        .sort({ score: { $meta: 'textScore' } })
        .limit(options.limit || 20);
};

// Static method to find featured products
productSchema.statics.findFeatured = function(limit = 10) {
    return this.find({ 
        featured: true, 
        status: 'active',
        deletedAt: { $exists: false }
    })
    .populate('category')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to find trending products
productSchema.statics.findTrending = function(limit = 10) {
    return this.find({ 
        trending: true, 
        status: 'active',
        deletedAt: { $exists: false }
    })
    .populate('category')
    .sort({ 'analytics.views': -1 })
    .limit(limit);
};

// Static method to find best sellers
productSchema.statics.findBestSellers = function(limit = 10) {
    return this.find({ 
        bestSeller: true, 
        status: 'active',
        deletedAt: { $exists: false }
    })
    .populate('category')
    .sort({ 'analytics.purchases': -1 })
    .limit(limit);
};

// Static method to find products on sale
productSchema.statics.findOnSale = function(limit = 20) {
    return this.find({ 
        onSale: true, 
        status: 'active',
        deletedAt: { $exists: false }
    })
    .populate('category')
    .sort({ discountPercentage: -1 })
    .limit(limit);
};

module.exports = mongoose.model('Product', productSchema);