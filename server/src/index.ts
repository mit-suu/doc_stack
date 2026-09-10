import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import './config/ai.js';

import documentRoutes from './routes/documentRoutes.js';
import retrievalRoutes from './routes/retrievalRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import authRoutes from './routes/authRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import { healthCheckHandler } from './controllers/healthController.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Danh sách các domain được phép gọi API (CORS)
const defaultAllowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://doc-stack.vercel.app',
];

const envOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((url) => url.trim().replace(/\/$/, ''))
  : [];

const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...envOrigins]));

app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép request không có origin (cURL, Postman, health check)
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/$/, '');
      const isAllowed =
        allowedOrigins.includes(normalizedOrigin) ||
        normalizedOrigin.endsWith('doc-stack.vercel.app') ||
        normalizedOrigin.includes('vercel.app');

      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`[CORS] ⚠️ Origin bị từ chối: ${origin}`);
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check endpoints (Hỗ trợ /health, /heath, /api/health, /api/heath)
app.get(['/health', '/heath', '/api/health', '/api/heath'], healthCheckHandler);

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/retrieve', retrievalRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/sessions', sessionRoutes);

// Global Error Handler Middleware
app.use((err: any, _req: Request, res: Response, _next: any) => {
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: 'Cú pháp JSON trong request body không hợp lệ' });
    return;
  }
  res.status(err.status || err.statusCode || 500).json({
    error: err.message || 'Lỗi hệ thống máy chủ',
  });
});

async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`[Server] 🚀 Server đang chạy tại: http://localhost:${PORT}`);
    console.log(`[Server] 🔗 CORS cho phép client: ${allowedOrigins.join(', ')}`);
  });
}

startServer();
