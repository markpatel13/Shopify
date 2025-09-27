const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        trim: true,
        maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
            'Please provide a valid email'
        ]
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false // Don't include password in queries by default
    },
    role: {
        type: String,
        enum: ['customer', 'admin', 'moderator'],
        default: 'customer'
    },
    avatar: {
        public_id: String,
        url: {
            type: String,
            default: 'https://res.cloudinary.com/shopit/image/upload/v1606305757/avatars/default_avatar_o8wbcc.png'
        }
    },
    phone: {
        type: String,
        trim: true,
        match: [/^\+?[\d\s-()]+$/, 'Please provide a valid phone number']
    },
    dateOfBirth: {
        type: Date
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other', 'prefer_not_to_say']
    },
    addresses: [{
        type: {
            type: String,
            enum: ['home', 'work', 'other'],
            default: 'home'
        },
        street: {
            type: String,
            required: true,
            trim: true
        },
        city: {
            type: String,
            required: true,
            trim: true
        },
        state: {
            type: String,
            required: true,
            trim: true
        },
        country: {
            type: String,
            required: true,
            trim: true,
            default: 'United States'
        },
        zipCode: {
            type: String,
            required: true,
            trim: true
        },
        isDefault: {
            type: Boolean,
            default: false
        }
    }],
    preferences: {
        newsletter: {
            type: Boolean,
            default: true
        },
        notifications: {
            email: {
                type: Boolean,
                default: true
            },
            sms: {
                type: Boolean,
                default: false
            },
            push: {
                type: Boolean,
                default: true
            }
        },
        currency: {
            type: String,
            default: 'USD'
        },
        language: {
            type: String,
            default: 'en'
        },
        theme: {
            type: String,
            enum: ['light', 'dark', 'auto'],
            default: 'light'
        }
    },
    socialMedia: {
        google: {
            id: String,
            email: String
        },
        facebook: {
            id: String,
            email: String
        },
        twitter: {
            id: String,
            username: String
        }
    },
    verification: {
        email: {
            verified: {
                type: Boolean,
                default: false
            },
            token: String,
            expires: Date
        },
        phone: {
            verified: {
                type: Boolean,
                default: false
            },
            token: String,
            expires: Date
        }
    },
    security: {
        twoFactorAuth: {
            enabled: {
                type: Boolean,
                default: false
            },
            secret: String,
            backupCodes: [String]
        },
        loginAttempts: {
            count: {
                type: Number,
                default: 0
            },
            lastAttempt: Date,
            lockedUntil: Date
        },
        sessions: [{
            token: String,
            device: String,
            ip: String,
            userAgent: String,
            lastActive: Date,
            createdAt: {
                type: Date,
                default: Date.now
            }
        }]
    },
    activity: {
        lastLogin: Date,
        lastActive: Date,
        loginCount: {
            type: Number,
            default: 0
        },
        ipAddresses: [{
            ip: String,
            lastUsed: Date
        }]
    },
    stats: {
        totalOrders: {
            type: Number,
            default: 0
        },
        totalSpent: {
            type: Number,
            default: 0
        },
        averageOrderValue: {
            type: Number,
            default: 0
        },
        favoriteCategories: [String],
        loyaltyPoints: {
            type: Number,
            default: 0
        }
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    refreshTokens: [{
        token: String,
        createdAt: {
            type: Date,
            default: Date.now,
            expires: '7d'
        }
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    deletedAt: Date
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ 'addresses.zipCode': 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ 'stats.totalSpent': -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
    return this.name;
});

// Virtual for age
userSchema.virtual('age').get(function() {
    if (!this.dateOfBirth) return null;
    return Math.floor((Date.now() - this.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
});

// Virtual for account status
userSchema.virtual('accountStatus').get(function() {
    if (!this.isActive) return 'inactive';
    if (this.security.loginAttempts.lockedUntil && this.security.loginAttempts.lockedUntil > Date.now()) {
        return 'locked';
    }
    if (!this.verification.email.verified) return 'pending_verification';
    return 'active';
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    
    try {
        const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Pre-save middleware to update activity
userSchema.pre('save', function(next) {
    if (this.isNew) {
        this.activity.lastActive = new Date();
    }
    next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate JWT token
userSchema.methods.generateAuthToken = function() {
    const payload = {
        id: this._id,
        email: this.email,
        role: this.role
    };
    
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '30d'
    });
};

// Method to generate refresh token
userSchema.methods.generateRefreshToken = function() {
    const payload = {
        id: this._id,
        type: 'refresh'
    };
    
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d'
    });
};

// Method to generate reset password token
userSchema.methods.generateResetPasswordToken = function() {
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    
    this.resetPasswordToken = require('crypto')
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
    
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    return resetToken;
};

// Method to check if account is locked
userSchema.methods.isAccountLocked = function() {
    return this.security.loginAttempts.lockedUntil && this.security.loginAttempts.lockedUntil > Date.now();
};

// Method to handle failed login attempts
userSchema.methods.handleFailedLogin = async function() {
    // Increment login attempts
    this.security.loginAttempts.count += 1;
    this.security.loginAttempts.lastAttempt = new Date();
    
    // Lock account after 5 failed attempts
    if (this.security.loginAttempts.count >= 5) {
        this.security.loginAttempts.lockedUntil = Date.now() + 30 * 60 * 1000; // 30 minutes
    }
    
    await this.save();
};

// Method to handle successful login
userSchema.methods.handleSuccessfulLogin = async function(req) {
    // Reset login attempts
    this.security.loginAttempts.count = 0;
    this.security.loginAttempts.lockedUntil = undefined;
    
    // Update activity
    this.activity.lastLogin = new Date();
    this.activity.lastActive = new Date();
    this.activity.loginCount += 1;
    
    // Track IP address
    const ip = req.ip || req.connection.remoteAddress;
    const existingIp = this.activity.ipAddresses.find(item => item.ip === ip);
    
    if (existingIp) {
        existingIp.lastUsed = new Date();
    } else {
        this.activity.ipAddresses.push({ ip, lastUsed: new Date() });
    }
    
    // Keep only last 10 IP addresses
    if (this.activity.ipAddresses.length > 10) {
        this.activity.ipAddresses.sort((a, b) => b.lastUsed - a.lastUsed);
        this.activity.ipAddresses = this.activity.ipAddresses.slice(0, 10);
    }
    
    await this.save();
};

// Method to add address
userSchema.methods.addAddress = function(addressData) {
    // If this is set as default, remove default from others
    if (addressData.isDefault) {
        this.addresses.forEach(addr => {
            addr.isDefault = false;
        });
    }
    
    // If this is the first address, make it default
    if (this.addresses.length === 0) {
        addressData.isDefault = true;
    }
    
    this.addresses.push(addressData);
    return this.save();
};

// Method to update stats
userSchema.methods.updateStats = function(orderData) {
    this.stats.totalOrders += 1;
    this.stats.totalSpent += orderData.total;
    this.stats.averageOrderValue = this.stats.totalSpent / this.stats.totalOrders;
    
    // Update favorite categories
    orderData.items.forEach(item => {
        if (item.category && !this.stats.favoriteCategories.includes(item.category)) {
            this.stats.favoriteCategories.push(item.category);
        }
    });
    
    // Award loyalty points (1 point per dollar spent)
    this.stats.loyaltyPoints += Math.floor(orderData.total);
    
    return this.save();
};

// Static method to find by email
userSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase(), isActive: true });
};

// Static method to find active users
userSchema.statics.findActive = function() {
    return this.find({ isActive: true, deletedAt: { $exists: false } });
};

module.exports = mongoose.model('User', userSchema);