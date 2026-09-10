import { Router } from 'express';
import { retrieveHandler } from '../controllers/retrievalController.js';

const router = Router();

// POST /api/retrieve - Tìm kiếm các chunk liên quan nhất với vector search
router.post('/', retrieveHandler);

export default router;
