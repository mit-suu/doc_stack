import { Router } from 'express';
import {
  uploadMiddleware,
  uploadDocumentHandler,
  crawlDocumentHandler,
  getAllDocumentsHandler,
  getDocumentByIdHandler,
  deleteDocumentHandler,
  processDocumentHandler,
  getDocumentChunksHandler,
} from '../controllers/documentController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

// Tất cả các route tài liệu đều bắt buộc phải đăng nhập và phân quyền theo User Token
router.use(authenticateToken as any);

// POST /api/documents/upload - Upload file và trích xuất text
router.post('/upload', uploadMiddleware, uploadDocumentHandler as any);

// POST /api/documents/crawl - Crawl text từ URL
router.post('/crawl', crawlDocumentHandler as any);

// GET /api/documents - Lấy danh sách tất cả tài liệu của user
router.get('/', getAllDocumentsHandler as any);

// GET /api/documents/:id - Xem chi tiết tài liệu (kèm rawText)
router.get('/:id', getDocumentByIdHandler as any);

// DELETE /api/documents/:id - Xóa tài liệu và toàn bộ chunk liên quan
router.delete('/:id', deleteDocumentHandler as any);

// POST /api/documents/:id/process - Kích hoạt cắt chunk và tạo embedding
router.post('/:id/process', processDocumentHandler as any);

// GET /api/documents/:id/chunks - Xem danh sách các chunk đã tạo của tài liệu
router.get('/:id/chunks', getDocumentChunksHandler as any);

export default router;
