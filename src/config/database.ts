import mongoose from "mongoose";
import config from "./index";

class Database {
  private static instance: Database;

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    try {
      mongoose.set("strictQuery", false);

      const conn = await mongoose.connect(config.MONGODB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

      // Handle connection events
      mongoose.connection.on("error", (error) => {
        console.error("❌ MongoDB connection error:", error);
      });

      mongoose.connection.on("disconnected", () => {
        console.log("⚠️ MongoDB disconnected");
      });

      process.on("SIGINT", this.gracefulClose);
      process.on("SIGTERM", this.gracefulClose);
    } catch (error) {
      console.error("❌ Database connection error:", error);
      process.exit(1);
    }
  }

  private async gracefulClose(): Promise<void> {
    try {
      await mongoose.connection.close();
      console.log("✅ MongoDB connection closed through app termination");
      process.exit(0);
    } catch (error) {
      console.error("❌ Error closing MongoDB connection:", error);
      process.exit(1);
    }
  }

  public async disconnect(): Promise<void> {
    await mongoose.disconnect();
  }
}

export default Database;
