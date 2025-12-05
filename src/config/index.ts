import dotenv from "dotenv";

dotenv.config();

interface Config {
  NODE_ENV: string;
  PORT: number;
  MONGODB_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRE: string;
  JWT_COOKIE_EXPIRE: number;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  cloudinary: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
  };
}

const config: Config = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "5000", 10),
  MONGODB_URI:
    process.env.MONGODB_URI ||
    "mongodb+srv://craftopiaarts86_db_user:lKieBgop7E334hH5@cluster0.gymfwnp.mongodb.net/craftopia_db?retryWrites=true&w=majority",
  JWT_SECRET: process.env.JWT_SECRET || "your-super-secret-jwt-key",
  JWT_EXPIRE: process.env.JWT_EXPIRE || "7d",
  JWT_COOKIE_EXPIRE: parseInt(process.env.JWT_COOKIE_EXPIRE || "7", 10),
  RATE_LIMIT_WINDOW_MS: parseInt(
    process.env.RATE_LIMIT_WINDOW_MS || "900000",
    10
  ), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseInt(
    process.env.RATE_LIMIT_MAX_REQUESTS || "100",
    10
  ),
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
  },
};

export default config;
