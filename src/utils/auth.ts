import bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import config from "../config";
import { IAuthUser } from "../types";

/**
 * Hash password using bcrypt
 */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

/**
 * Compare password with hashed password
 */
export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

/**
 * Generate JWT token
 */
export const generateToken = (
  payload: Omit<IAuthUser, "iat" | "exp">
): string => {
  if (!config.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  // Use proper type assertion for the options
  const options = { expiresIn: config.JWT_EXPIRE || "24h" };
  return jwt.sign(payload, config.JWT_SECRET, options as jwt.SignOptions);
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokens = (
  payload: Omit<IAuthUser, "iat" | "exp">
): { accessToken: string; refreshToken: string } => {
  if (!config.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  // Generate access token (short-lived)
  const accessToken = jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRE || "24h",
  } as jwt.SignOptions);

  // Generate refresh token (long-lived)
  const refreshToken = jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: "7d", // Refresh token lasts 7 days
  } as jwt.SignOptions);

  return {
    accessToken,
    refreshToken,
  };
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): IAuthUser => {
  if (!config.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.verify(token, config.JWT_SECRET) as IAuthUser;
};

/**
 * Generate random string
 */
export const generateRandomString = (length: number): string => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return result;
};
