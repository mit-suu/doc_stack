import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDB(): Promise<Db | null> {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'docstack';

  if (!uri || uri === 'your_mongodb_atlas_uri_here') {
    console.warn(
      '[MongoDB] ⚠️  MONGODB_URI chưa được cấu hình hoặc vẫn là placeholder. Hãy cập nhật server/.env để kết nối database thật.'
    );
    return null;
  }

  try {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(dbName);
    console.log(`[MongoDB] ✅ Kết nối thành công đến database: ${dbName}`);
    return db;
  } catch (error) {
    console.error('[MongoDB] ❌ Lỗi kết nối:', (error as Error).message);
    return null;
  }
}

export function getDb(): Db {
  if (!db) {
    throw new Error('Database chưa được khởi tạo. Vui lòng gọi connectDB() trước.');
  }
  return db;
}

export { client, db };
