const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { auth } = require('../middleware/auth');
const { adminAuth } = require('../middleware/adminAuth');
const logger = require('../utils/logger');
const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
const createUploadsDir = async () => {
    try {
        await fs.access(uploadsDir);
    } catch (error) {
        await fs.mkdir(uploadsDir, { recursive: true });
    }
};
createUploadsDir();

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Check file type
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'));
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: fileFilter
});

// @route   POST /api/upload/image
// @desc    Upload single image
// @access  Private
router.post('/image', [auth, upload.single('image')], async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                status: 'error',
                message: 'No image file provided'
            });
        }
        
        const imageUrl = `/uploads/${req.file.filename}`;
        
        logger.info(`Image uploaded: ${req.file.filename} by ${req.user.email}`);
        
        res.json({
            status: 'success',
            message: 'Image uploaded successfully',
            data: {
                imageUrl,
                originalName: req.file.originalname,
                size: req.file.size
            }
        });
        
    } catch (error) {
        logger.error('Upload image error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to upload image'
        });
    }
});

// @route   POST /api/upload/images
// @desc    Upload multiple images
// @access  Private
router.post('/images', [auth, upload.array('images', 10)], async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'No image files provided'
            });
        }
        
        const images = req.files.map(file => ({
            url: `/uploads/${file.filename}`,
            originalName: file.originalname,
            size: file.size
        }));
        
        logger.info(`${req.files.length} images uploaded by ${req.user.email}`);
        
        res.json({
            status: 'success',
            message: `${req.files.length} images uploaded successfully`,
            data: {
                images
            }
        });
        
    } catch (error) {
        logger.error('Upload images error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to upload images'
        });
    }
});

// @route   DELETE /api/upload/:filename
// @desc    Delete uploaded file (Admin only)
// @access  Private/Admin
router.delete('/:filename', [auth, adminAuth], async (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(uploadsDir, filename);
        
        // Check if file exists
        try {
            await fs.access(filePath);
        } catch (error) {
            return res.status(404).json({
                status: 'error',
                message: 'File not found'
            });
        }
        
        // Delete the file
        await fs.unlink(filePath);
        
        logger.info(`File deleted: ${filename} by ${req.user.email}`);
        
        res.json({
            status: 'success',
            message: 'File deleted successfully'
        });
        
    } catch (error) {
        logger.error('Delete file error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete file'
        });
    }
});

// @route   GET /api/upload/files
// @desc    Get list of uploaded files (Admin only)
// @access  Private/Admin
router.get('/files', [auth, adminAuth], async (req, res) => {
    try {
        const files = await fs.readdir(uploadsDir);
        
        const fileDetails = await Promise.all(
            files.map(async (filename) => {
                const filePath = path.join(uploadsDir, filename);
                const stats = await fs.stat(filePath);
                
                return {
                    filename,
                    url: `/uploads/${filename}`,
                    size: stats.size,
                    uploadedAt: stats.birthtime,
                    modifiedAt: stats.mtime
                };
            })
        );
        
        res.json({
            status: 'success',
            data: {
                files: fileDetails.sort((a, b) => b.uploadedAt - a.uploadedAt)
            }
        });
        
    } catch (error) {
        logger.error('Get files list error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch files list'
        });
    }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                status: 'error',
                message: 'File size too large. Maximum size is 5MB'
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                status: 'error',
                message: 'Too many files. Maximum is 10 files'
            });
        }
    }
    
    if (error.message.includes('Only image files')) {
        return res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
    
    logger.error('Upload middleware error:', error);
    res.status(500).json({
        status: 'error',
        message: 'Upload failed'
    });
});

module.exports = router;