import { Request, Response, NextFunction } from 'express';
import path from 'path';
import multer from 'multer';
import { ObjectId } from 'mongodb';
import {
  createDocument,
  updateDocument,
  getDocumentById,
  getAllDocuments,
} from '../repositories/documentRepository.js';
import { parseByFileType } from '../services/documentParser.js';
import { crawlUrl, isPrivateOrBlockedHost } from '../services/urlCrawler.js';
import { processDocument } from '../services/documentProcessor.js';
import { getChunkSummariesByDocumentId } from '../repositories/chunkRepository.js';
import { FileType } from '../models/document.js';

const ALLOWED_EXTENSIONS: Record<string, FileType> = {
  pdf: 'pdf',
  docx: 'docx',
  md: 'md',
  txt: 'txt',
};

// Cấu hình multer lưu file vào memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // Giới hạn tối đa 20MB
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (!ALLOWED_EXTENSIONS[ext]) {
      return cb(
        new Error(
          `Định dạng file .${ext} không được hỗ trợ. Chỉ chấp nhận các định dạng: .pdf, .docx, .md, .txt`
        )
      );
    }
    cb(null, true);
  },
});

/**
 * Middleware nhận 1 file và xử lý các lỗi multer (kích thước, định dạng)
 */
export const uploadMiddleware = (req: Request, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res
          .status(400)
          .json({ error: 'Dung lượng file vượt quá giới hạn tối đa cho phép (20MB)' });
      }
      return res.status(400).json({ error: err.message || 'Lỗi khi tải file lên' });
    }
    next();
  });
};

/**
 * POST /api/documents/upload
 * Nhận file upload, tạo document pending, trích xuất text và lưu DB
 */
export async function uploadDocumentHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Vui lòng cung cấp file cần upload trong trường "file"' });
      return;
    }

    const originalName = req.file.originalname;
    const ext = path.extname(originalName).toLowerCase().replace('.', '');
    const fileType = ALLOWED_EXTENSIONS[ext];

    if (!fileType) {
      res.status(400).json({
        error: `Định dạng file .${ext} không được hỗ trợ. Chỉ chấp nhận: .pdf, .docx, .md, .txt`,
      });
      return;
    }

    // 1. Tạo document với status: "pending" trước
    const createdDoc = await createDocument({
      title: originalName,
      sourceType: 'file',
      originalName,
      fileType,
      rawText: '',
      status: 'pending',
    });

    // 2. Parse text theo định dạng
    try {
      const rawText = await parseByFileType(req.file.buffer, fileType);
      await updateDocument(createdDoc._id!, {
        rawText,
        status: 'ready',
      });

      // Tự động kích hoạt chunking & embedding
      try {
        const embeddedDoc = await processDocument(createdDoc._id!.toString());
        res.status(201).json(embeddedDoc);
      } catch {
        const currentDoc = await getDocumentById(createdDoc._id!);
        res.status(201).json(currentDoc);
      }
    } catch (parseErr: any) {
      const failedDoc = await updateDocument(createdDoc._id!, {
        status: 'failed',
        errorMessage: parseErr.message || 'Lỗi khi trích xuất text từ file',
      });
      res.status(201).json(failedDoc);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi server khi upload tài liệu' });
  }
}

/**
 * POST /api/documents/crawl
 * Nhận URL, tạo document pending, crawl HTML lấy text và lưu DB
 */
export async function crawlDocumentHandler(req: Request, res: Response): Promise<void> {
  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string' || !url.trim()) {
      res.status(400).json({ error: 'URL không được để trống và phải là chuỗi hợp lệ' });
      return;
    }

    const trimmedUrl = url.trim();
    let parsed: URL;
    try {
      parsed = new URL(trimmedUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        res.status(400).json({ error: 'URL phải bắt đầu bằng http:// hoặc https://' });
        return;
      }
    } catch {
      res.status(400).json({ error: 'URL không đúng định dạng hợp lệ' });
      return;
    }

    // Chặn SSRF: Kiểm tra hostname nội bộ/private
    if (isPrivateOrBlockedHost(parsed.hostname)) {
      res.status(400).json({ error: 'URL không được phép truy cập' });
      return;
    }

    // 1. Tạo document với status: "pending", sourceType: "url"
    const createdDoc = await createDocument({
      title: trimmedUrl,
      sourceType: 'url',
      sourceUrl: trimmedUrl,
      rawText: '',
      status: 'pending',
    });

    // 2. Crawl nội dung trang web
    try {
      const { title, content } = await crawlUrl(trimmedUrl);
      await updateDocument(createdDoc._id!, {
        title: title || trimmedUrl,
        rawText: content,
        status: 'ready',
      });

      // Tự động kích hoạt chunking & embedding
      try {
        const embeddedDoc = await processDocument(createdDoc._id!.toString());
        res.status(201).json(embeddedDoc);
      } catch {
        const currentDoc = await getDocumentById(createdDoc._id!);
        res.status(201).json(currentDoc);
      }
    } catch (crawlErr: any) {
      if (crawlErr.message === 'URL không được phép truy cập') {
        res.status(400).json({ error: 'URL không được phép truy cập' });
        return;
      }
      const failedDoc = await updateDocument(createdDoc._id!, {
        status: 'failed',
        errorMessage: crawlErr.message || 'Lỗi khi crawl nội dung từ URL',
      });
      res.status(201).json(failedDoc);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi server khi crawl URL' });
  }
}

/**
 * GET /api/documents
 * Lấy danh sách tất cả document (rút gọn, không có rawText)
 */
export async function getAllDocumentsHandler(_req: Request, res: Response): Promise<void> {
  try {
    const documents = await getAllDocuments();
    res.status(200).json(documents);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi server khi lấy danh sách tài liệu' });
  }
}

/**
 * GET /api/documents/:id
 * Lấy đầy đủ chi tiết 1 document bao gồm rawText
 */
export async function getDocumentByIdHandler(req: Request, res: Response): Promise<void> {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({ error: 'ID tài liệu không hợp lệ (phải là 24 ký tự hex)' });
      return;
    }

    const document = await getDocumentById(id);
    if (!document) {
      res.status(404).json({ error: 'Không tìm thấy tài liệu với ID đã cung cấp' });
      return;
    }

    res.status(200).json(document);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi server khi truy xuất tài liệu' });
  }
}

/**
 * POST /api/documents/:id/process
 * Kích hoạt cắt chunk và tạo embedding cho document
 */
export async function processDocumentHandler(req: Request, res: Response): Promise<void> {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({ error: 'ID tài liệu không hợp lệ (phải là 24 ký tự hex)' });
      return;
    }

    const updatedDoc = await processDocument(id);
    res.status(200).json(updatedDoc);
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({
      error: error.message || 'Lỗi server khi xử lý embedding tài liệu',
    });
  }
}

/**
 * GET /api/documents/:id/chunks
 * Lấy danh sách các chunk đã tạo của 1 document (kèm độ dài vector embedding để kiểm tra)
 */
export async function getDocumentChunksHandler(req: Request, res: Response): Promise<void> {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({ error: 'ID tài liệu không hợp lệ (phải là 24 ký tự hex)' });
      return;
    }

    const doc = await getDocumentById(id);
    if (!doc) {
      res.status(404).json({ error: 'Không tìm thấy tài liệu với ID đã cung cấp' });
      return;
    }

    const chunks = await getChunkSummariesByDocumentId(id);
    res.status(200).json(chunks);
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Lỗi server khi lấy danh sách chunks của tài liệu',
    });
  }
}

