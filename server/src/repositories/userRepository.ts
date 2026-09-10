import { ObjectId } from 'mongodb';
import { getDb } from '../config/db.js';
import { User } from '../models/user.js';

const COLLECTION_NAME = 'users';

/**
 * Tìm người dùng theo googleId
 */
export async function findUserByGoogleId(googleId: string): Promise<User | null> {
  const db = getDb();
  return await db.collection<User>(COLLECTION_NAME).findOne({ googleId });
}

/**
 * Tìm người dùng theo email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const db = getDb();
  return await db.collection<User>(COLLECTION_NAME).findOne({ email: email.toLowerCase() });
}

/**
 * Tìm người dùng theo ObjectId
 */
export async function findUserById(id: string | ObjectId): Promise<User | null> {
  const db = getDb();
  const objId = typeof id === 'string' ? new ObjectId(id) : id;
  return await db.collection<User>(COLLECTION_NAME).findOne({ _id: objId });
}

/**
 * Đăng ký mới hoặc cập nhật đăng nhập cho người dùng Google
 */
export async function upsertGoogleUser(data: {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}): Promise<User> {
  const db = getDb();
  const now = new Date();
  const normalizedEmail = data.email.toLowerCase();

  // Kiểm tra xem đã có user với googleId hoặc email này chưa
  const existingUser = await db.collection<User>(COLLECTION_NAME).findOne({
    $or: [{ googleId: data.googleId }, { email: normalizedEmail }],
  });

  if (existingUser) {
    // Cập nhật thông tin và lastLoginAt
    await db.collection<User>(COLLECTION_NAME).updateOne(
      { _id: existingUser._id },
      {
        $set: {
          googleId: data.googleId,
          name: data.name,
          ...(data.picture ? { picture: data.picture } : {}),
          lastLoginAt: now,
          updatedAt: now,
        },
      }
    );

    return {
      ...existingUser,
      googleId: data.googleId,
      name: data.name,
      picture: data.picture || existingUser.picture,
      lastLoginAt: now,
      updatedAt: now,
    };
  }

  // Tạo người dùng mới
  const newUser: User = {
    googleId: data.googleId,
    email: normalizedEmail,
    name: data.name,
    picture: data.picture,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  };

  const result = await db.collection<User>(COLLECTION_NAME).insertOne(newUser as any);

  return {
    ...newUser,
    _id: result.insertedId,
  };
}
