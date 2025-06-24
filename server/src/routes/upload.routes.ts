import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response } from 'express';

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const userId = req.body.userId;
    const extension = path.extname(file.originalname);
    const filename = `${userId}-${Date.now()}${extension}`;
    cb(null, filename);
  }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: any) => {
  // Check file type
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Avatar upload endpoint
router.post('/avatar', upload.single('avatar'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!req.body.userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Clean up old avatar files for this user (optional)
    const userId = req.body.userId;
    try {
      const files = fs.readdirSync(uploadsDir);
      const userFiles = files.filter(file => file.startsWith(`${userId}-`));
      
      // Keep only the most recent file, delete older ones
      if (userFiles.length > 1) {
        userFiles
          .filter(file => file !== req.file!.filename)
          .forEach(file => {
            try {
              fs.unlinkSync(path.join(uploadsDir, file));
            } catch (err) {
              console.warn('Failed to delete old avatar file:', file);
            }
          });
      }
    } catch (err) {
      console.warn('Failed to clean up old avatar files:', err);
    }

    // Return the URL for the uploaded avatar (accessible via our static route)
    const avatarUrl = `http://localhost:4000/uploads/avatars/${req.file.filename}`;
    
    res.json({ 
      success: true, 
      avatarUrl: avatarUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// Serve uploaded avatars statically
router.use('/avatars', express.static(uploadsDir));

export default router; 