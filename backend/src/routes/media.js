import express from 'express';
import multer from 'multer';
import { uploadFile, getFileUrl, deleteFile } from '../config/minio.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Upload single file
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        const { originalname, buffer, mimetype } = req.file;
        const { url, objectName } = await uploadFile(originalname, buffer, mimetype);

        res.json({
            message: 'File uploaded successfully',
            file: {
                name: originalname,
                object_name: objectName,
                url,
                content_type: mimetype,
                size: buffer.length,
            },
        });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Upload failed', details: err.message });
    }
});

// Upload multiple files
router.post('/upload-multiple', authenticate, upload.array('files', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files provided' });
        }

        const uploadedFiles = [];

        for (const file of req.files) {
            const { url, objectName } = await uploadFile(file.originalname, file.buffer, file.mimetype);
            uploadedFiles.push({
                name: file.originalname,
                object_name: objectName,
                url,
                content_type: file.mimetype,
                size: file.buffer.length,
            });
        }

        res.json({
            message: 'Files uploaded successfully',
            files: uploadedFiles,
        });
    } catch (err) {
        console.error('Upload multiple error:', err);
        res.status(500).json({ error: 'Upload failed', details: err.message });
    }
});

// Get presigned URL for a file
router.get('/url/:objectName', authenticate, async (req, res) => {
    try {
        const { objectName } = req.params;
        const { expiry = 3600 } = req.query;

        const url = await getFileUrl(objectName, parseInt(expiry));

        res.json({ url });
    } catch (err) {
        console.error('Get URL error:', err);
        res.status(500).json({ error: 'Failed to get file URL', details: err.message });
    }
});

// Delete file
router.delete('/:objectName', authenticate, async (req, res) => {
    try {
        const { objectName } = req.params;

        await deleteFile(objectName);

        res.json({ message: 'File deleted successfully' });
    } catch (err) {
        console.error('Delete error:', err);
        res.status(500).json({ error: 'Failed to delete file', details: err.message });
    }
});

export default router;
