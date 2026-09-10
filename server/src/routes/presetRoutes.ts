import { Router } from 'express';
import { getPresetsHandler, importPresetHandler } from '../controllers/presetController.js';

const router = Router();

router.get('/', getPresetsHandler);
router.post('/:id/import', importPresetHandler);

export default router;
