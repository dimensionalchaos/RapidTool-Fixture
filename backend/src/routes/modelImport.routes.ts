import { Router } from 'express';
import multer from 'multer';
import {
  uploadModel,
  getImportStatus,
  getUserImports,
  getModelUsage,
  updateImportProgress,
} from '../controllers/modelImport.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { checkModelLimit } from '../middleware/license.middleware';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit (prevents DB timeout on large files)
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.stl', '.obj', '.gltf', '.glb', '.step', '.stp', '.iges', '.igs'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`));
    }
  },
});

// All routes require authentication
router.use(authenticateToken);

// Upload model (with license check)
router.post('/upload', checkModelLimit, upload.single('model'), uploadModel);

// Get import status
router.get('/:importId', getImportStatus);

// Update import progress (for processing status updates)
router.patch('/:importId', updateImportProgress);

// Get user's imports
router.get('/', getUserImports);

// Get user's model usage
router.get('/usage/stats', getModelUsage);

export default router;
