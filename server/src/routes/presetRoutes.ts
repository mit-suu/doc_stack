import { Router } from 'express';
import { getPresetsHandler, importPresetHandler } from '../controllers/presetController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', getPresetsHandler);
router.post('/:id/import', authenticateToken as any, importPresetHandler as any);

export default router;
