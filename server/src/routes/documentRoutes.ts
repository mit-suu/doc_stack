import { Router } from 'express';
import {
  uploadMiddleware,
  uploadDocumentHandler,
  crawlDocumentHandler,
  getAllDocumentsHandler,
  getDocumentByIdHandler,
} from '../controllers/documentController.js';

const router = Router();

// POST /api/documents/upload - Upload file và trích xuất text
router.post('/upload', uploadMiddleware, uploadDocumentHandler);

// POST /api/documents/crawl - Crawl text từ URL
router.post('/crawl', crawlDocumentHandler);

// GET /api/documents - Lấy danh sách tất cả tài liệu (rút gọn)
router.get('/', getAllDocumentsHandler);

// GET /api/documents/:id - Xem chi tiết tài liệu (kèm rawText)
router.get('/:id', getDocumentByIdHandler);

export default router;
