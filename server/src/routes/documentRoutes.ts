import { Router } from 'express';
import {
  uploadMiddleware,
  uploadDocumentHandler,
  crawlDocumentHandler,
  getAllDocumentsHandler,
  getDocumentByIdHandler,
  processDocumentHandler,
  getDocumentChunksHandler,
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

// POST /api/documents/:id/process - Kích hoạt cắt chunk và tạo embedding
router.post('/:id/process', processDocumentHandler);

// GET /api/documents/:id/chunks - Xem danh sách các chunk đã tạo của tài liệu
router.get('/:id/chunks', getDocumentChunksHandler);

export default router;
