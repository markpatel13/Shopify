const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        unique: true,
        trim: true,
        maxlength: [100, 'Category name cannot exceed 100 characters']
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true
    },
    description: {
        type: String,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    image: {
        public_id: String,
        url: String,
        alt: String
    },
    icon: {
        type: String, // Font Awesome class or SVG path
        trim: true
    },
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    },
    children: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    }],
    level: {
        type: Number,
        default: 0
    },
    path: {
        type: String, // Full path like '/electronics/computers/laptops'
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    sortOrder: {
        type: Number,
        default: 0
    },
    seo: {
        metaTitle: String,
        metaDescription: String,
        keywords: [String]
    },
    productCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
categorySchema.index({ slug: 1 });
categorySchema.index({ parent: 1 });
categorySchema.index({ isActive: 1, isFeatured: 1 });
categorySchema.index({ level: 1, sortOrder: 1 });

// Virtual for full name with parent
categorySchema.virtual('fullName').get(function() {
    if (this.parent && this.populated('parent')) {
        return `${this.parent.name} > ${this.name}`;
    }
    return this.name;
});

// Pre-save middleware to generate slug
categorySchema.pre('save', function(next) {
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

// Pre-save middleware to update path
categorySchema.pre('save', async function(next) {
    if (this.isModified('parent') || this.isNew) {
        if (this.parent) {
            const parentCategory = await this.constructor.findById(this.parent);
            if (parentCategory) {
                this.level = parentCategory.level + 1;
                this.path = `${parentCategory.path}/${this.slug}`;
            }
        } else {
            this.level = 0;
            this.path = `/${this.slug}`;
        }
    }
    next();
});

// Method to get all subcategories
categorySchema.methods.getSubcategories = function() {
    return this.constructor.find({ parent: this._id, isActive: true })
        .sort({ sortOrder: 1, name: 1 });
};

// Method to get category tree
categorySchema.statics.getCategoryTree = function() {
    return this.aggregate([
        { $match: { isActive: true } },
        {
            $graphLookup: {
                from: 'categories',
                startWith: '$_id',
                connectFromField: '_id',
                connectToField: 'parent',
                as: 'subcategories'
            }
        },
        { $match: { parent: null } },
        { $sort: { sortOrder: 1, name: 1 } }
    ]);
};

module.exports = mongoose.model('Category', categorySchema);