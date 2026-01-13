import { Router } from 'express';
import multer from 'multer';
import {
  requestExport,
  trackExport,
  checkExportLimit,
  getExportStatus,
  downloadExport,
  getUserExportsList,
  getProjectExportsList,
  saveExport,
} from '../controllers/export.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Configure multer for file uploads (for saving export data)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
});

// All routes require authentication
router.use(authenticateToken);

// Request new export
router.post('/request', requestExport);

// Track export count (NEW)
router.post('/track', trackExport);

// Check export limit (NEW)
router.get('/check-limit', checkExportLimit);

// Get export status
router.get('/:exportId', getExportStatus);

// Download export file
router.get('/:exportId/download', downloadExport);

// Save export data (for backend processing to store result)
router.post('/:exportId/save', upload.single('file'), saveExport);

// Get user's exports
router.get('/', getUserExportsList);

// Get project's exports
router.get('/project/:projectId', getProjectExportsList);

export default router;
