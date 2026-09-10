import { ObjectId } from 'mongodb';

export interface User {
  _id?: ObjectId;
  googleId: string;
  email: string;
  name: string;
  picture?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
}

export interface UserDTO {
  id: string;
  googleId: string;
  email: string;
  name: string;
  picture?: string;
  createdAt: string;
  lastLoginAt: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  picture?: string;
}
