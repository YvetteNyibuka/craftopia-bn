import { Request } from "express";
import { JwtPayload } from "jsonwebtoken";

// User related types
export interface IUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  USER = "user",
  ADMIN = "admin",
  SUPER_ADMIN = "super_admin",
}

// Auth related types
export interface IAuthUser extends JwtPayload {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: IAuthUser;
}

// Category related types
export interface ICategory {
  _id: string;
  name: string;
  description?: string;
  slug: string;
  icon?: string;
  isActive: boolean;
  decorCount?: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// Decor related types
export interface IDecor {
  _id: string;
  name: string;
  description: string;
  category: string | ICategory;
  price: number;
  originalPrice?: number;
  images: string[];
  image: string; // Main image
  stock: number;
  sku: string;
  featured: boolean;
  status: DecorStatus;
  rating: number;
  reviews: number;
  tags: string[];
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
  };
  materials: string[];
  careInstructions?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export enum DecorStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  OUT_OF_STOCK = "out_of_stock",
  DISCONTINUED = "discontinued",
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Query parameters
export interface QueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
  category?: string;
  status?: string;
  featured?: boolean;
  minPrice?: number;
  maxPrice?: number;
}

// Validation schemas
export interface LoginSchema {
  email: string;
  password: string;
}

export interface RegisterSchema {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface DecorCreateSchema {
  name: string;
  description: string;
  category: string;
  price: number;
  originalPrice?: number;
  stock: number;
  sku: string;
  featured?: boolean;
  status?: DecorStatus;
  tags?: string[];
  materials: string[];
  careInstructions?: string;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
  };
}

export interface CategoryCreateSchema {
  name: string;
  description?: string;
  icon?: string;
}
