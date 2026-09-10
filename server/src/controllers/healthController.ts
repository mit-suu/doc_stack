import { Request, Response } from 'express';
import { db, connectDB } from '../config/db.js';
import { generateText } from 'ai';
import { google } from '../config/ai.js';

/**
 * Health Check Controller
 * Kiểm tra trạng thái hệ thống: Server, MongoDB Atlas Connection, Google Gemini API Key
 * Hỗ trợ các routes: /health, /heath, /api/health, /api/heath
 * Hỗ trợ query ?testAi=true để kiểm tra trực tiếp khả năng sinh câu trả lời của Gemini API Key
 */
export async function healthCheckHandler(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();

  // Kiểm tra API Key nếu cấu hình HEALTH_API_KEY (hoặc nhận diện từ x-api-key header / ?apiKey=)
  const configuredHealthKey = process.env.HEALTH_API_KEY;
  const providedKey = (req.headers['x-api-key'] as string) || (req.query.apiKey as string);

  if (configuredHealthKey && providedKey !== configuredHealthKey) {
    res.status(401).json({
      status: 'unauthorized',
      error: 'API Key không hợp lệ. Cần header x-api-key hoặc query ?apiKey=<key>',
    });
    return;
  }

  // 1. Kiểm tra Server & Memory
  const uptimeSeconds = Math.floor(process.uptime());
  const memoryUsage = process.memoryUsage();

  // 2. Kiểm tra kết nối MongoDB
  let dbStatus: {
    status: 'connected' | 'disconnected' | 'error';
    database: string;
    pingMs?: number;
    error?: string;
    suggestion?: string;
  } = {
    status: 'disconnected',
    database: process.env.MONGODB_DB_NAME || 'docstack',
  };

  try {
    let activeDb = db;
    if (!activeDb) {
      activeDb = await connectDB();
    }

    if (activeDb) {
      const pingStart = Date.now();
      await activeDb.command({ ping: 1 });
      dbStatus = {
        status: 'connected',
        database: process.env.MONGODB_DB_NAME || 'docstack',
        pingMs: Date.now() - pingStart,
      };
    } else {
      dbStatus.status = 'disconnected';
      dbStatus.error = 'Chưa thể kết nối tới MongoDB Atlas';
      dbStatus.suggestion = 'Kiểm tra chuỗi MONGODB_URI và Whitelist IP trên MongoDB Atlas Network Access.';
    }
  } catch (dbErr: any) {
    dbStatus.status = 'error';
    dbStatus.error = dbErr.message;
    if (
      dbErr.message.includes('alert') ||
      dbErr.message.includes('SSL') ||
      dbErr.message.includes('ENOTFOUND')
    ) {
      dbStatus.suggestion =
        'Lỗi SSL/Network (alert 80): Hãy thêm IP của bạn (hoặc 0.0.0.0/0) vào Network Access trên MongoDB Atlas Console.';
    }
  }

  // 3. Kiểm tra cấu hình Google Gemini API Key
  const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  let aiStatus: {
    status: 'configured' | 'missing' | 'valid' | 'invalid';
    keyPreview: string;
    model: string;
    message?: string;
  } = {
    status: 'missing',
    keyPreview: 'None',
    model: process.env.GEMINI_CHAT_MODEL || 'gemini-3.6-flash',
  };

  if (geminiKey && geminiKey !== 'your_gemini_api_key_here') {
    const masked =
      geminiKey.length > 8
        ? `${geminiKey.slice(0, 4)}...${geminiKey.slice(-4)}`
        : '****';
    aiStatus.keyPreview = masked;
    aiStatus.status = 'configured';
    aiStatus.message = 'Google Gemini API Key đã được cấu hình.';

    // Nếu người dùng yêu cầu test thử trực tiếp (?testAi=true hoặc ?checkAi=true)
    if (req.query.testAi === 'true' || req.query.checkAi === 'true') {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout 10s khi kết nối Google Gemini API')), 10000)
        );

        const testPromise = generateText({
          model: google(aiStatus.model || 'gemini-3.6-flash'),
          prompt: 'ping',
        });

        await Promise.race([testPromise, timeoutPromise]);
        aiStatus.status = 'valid';
        aiStatus.message = 'Gemini API Key hợp lệ và phản hồi tốt.';
      } catch (aiErr: any) {
        aiStatus.status = 'invalid';
        aiStatus.message = `Lỗi kiểm tra Gemini API Key: ${aiErr.message}`;
      }
    }
  } else {
    aiStatus.message = 'Chưa cấu hình GOOGLE_GENERATIVE_AI_API_KEY trong server/.env';
  }

  // 4. Tổng hợp trạng thái
  const isHealthy = dbStatus.status === 'connected' && aiStatus.status !== 'missing';
  const overallStatus = isHealthy
    ? 'healthy'
    : dbStatus.status === 'connected' || aiStatus.status !== 'missing'
    ? 'degraded'
    : 'unhealthy';

  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

  res.status(statusCode).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    latencyMs: Date.now() - startTime,
    server: {
      uptimeSeconds,
      uptimeFormatted: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor(
        (uptimeSeconds % 3600) / 60
      )}m ${uptimeSeconds % 60}s`,
      nodeVersion: process.version,
      memoryRss: `${(memoryUsage.rss / 1024 / 1024).toFixed(1)} MB`,
      memoryHeapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(1)} MB`,
    },
    database: dbStatus,
    aiKey: aiStatus,
  });
}
