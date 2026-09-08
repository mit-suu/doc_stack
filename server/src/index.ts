import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import './config/ai.js';

import documentRoutes from './routes/documentRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'DocStack Server is running',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/documents', documentRoutes);

async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`[Server] 🚀 Server đang chạy tại: http://localhost:${PORT}`);
    console.log(`[Server] 🔗 CORS cho phép client: ${CLIENT_URL}`);
  });
}

startServer();
