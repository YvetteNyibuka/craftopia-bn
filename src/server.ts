import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import compression from "compression";
import Database from "./config/database";
import routes from "./routes";
import { errorResponse } from "./utils";

// Load environment variables
import dotenv from "dotenv";
dotenv.config();

class Server {
  private app: Application;
  private PORT: number;

  constructor() {
    this.app = express();
    this.PORT = parseInt(process.env.PORT || "5000");
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(
      helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
      })
    );

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.NODE_ENV === "production" ? 100 : 1000, // limit each IP to 100 requests per windowMs in production
      message: {
        success: false,
        message: "Too many requests from this IP, please try again later.",
        data: null,
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(limiter);

    // CORS configuration
    const allowedOrigins = process.env.FRONTEND_URL?.split(",") || [];

    // Add localhost origins for development when working with deployed backend
    const developmentOrigins = [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5173",
    ];

    this.app.use(
      cors({
        origin:
          process.env.NODE_ENV === "production"
            ? [...allowedOrigins, ...developmentOrigins]
            : developmentOrigins,
        credentials: true,
        optionsSuccessStatus: 200,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      })
    );

    // Body parsing middleware
    this.app.use(
      express.json({
        limit: "10mb",
        verify: (req: any, res, buf) => {
          req.rawBody = buf;
        },
      })
    );
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // Cookie parser
    this.app.use(cookieParser());

    // Compression
    this.app.use(compression());

    // Logging
    if (process.env.NODE_ENV === "development") {
      this.app.use(morgan("dev"));
    } else {
      this.app.use(morgan("combined"));
    }

    // Trust proxy (important for rate limiting behind reverse proxy)
    this.app.set("trust proxy", 1);
  }

  private initializeRoutes(): void {
    // API routes
    this.app.use("/api", routes);

    // Root route
    this.app.get("/", (req: Request, res: Response) => {
      res.status(200).json({
        success: true,
        message: "Welcome to Craftopia Backend API",
        version: "1.0.0",
        documentation: "/api",
        environment: process.env.NODE_ENV || "development",
      });
    });

    // Handle 404 for undefined routes
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      res
        .status(404)
        .json(
          errorResponse(
            `Route ${req.originalUrl} not found`,
            "The requested route does not exist on this server"
          )
        );
    });
  }

  private initializeErrorHandling(): void {
    // Global error handler
    this.app.use(
      (error: any, req: Request, res: Response, next: NextFunction): void => {
        console.error("Global Error Handler:", error);

        // Mongoose validation error
        if (error.name === "ValidationError") {
          const errors = Object.values(error.errors).map(
            (err: any) => err.message
          );
          res
            .status(400)
            .json(errorResponse("Validation Error", errors.join(", ")));
          return;
        }

        // Mongoose duplicate key error
        if (error.code === 11000) {
          const field = Object.keys(error.keyValue)[0];
          res.status(400).json(errorResponse(`${field} already exists`));
          return;
        }

        // Mongoose cast error
        if (error.name === "CastError") {
          res.status(400).json(errorResponse("Invalid ID format"));
          return;
        }

        // JWT errors
        if (error.name === "JsonWebTokenError") {
          res.status(401).json(errorResponse("Invalid token"));
          return;
        }

        if (error.name === "TokenExpiredError") {
          res.status(401).json(errorResponse("Token expired"));
          return;
        }

        // Multer errors (for future file upload implementation)
        if (error.code === "LIMIT_FILE_SIZE") {
          res.status(400).json(errorResponse("File too large"));
          return;
        }

        // Default error
        const statusCode = error.statusCode || 500;
        const message = error.message || "Internal Server Error";

        res
          .status(statusCode)
          .json(
            errorResponse(
              message,
              process.env.NODE_ENV === "development" ? error.stack : undefined
            )
          );
      }
    );

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (err: Error) => {
      console.error("Unhandled Promise Rejection:", err);
      if (process.env.NODE_ENV === "production") {
        process.exit(1);
      }
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (err: Error) => {
      console.error("Uncaught Exception:", err);
      process.exit(1);
    });
  }

  public async start(): Promise<void> {
    try {
      // Connect to database
      await Database.getInstance().connect();

      // Start server
      this.app.listen(this.PORT, () => {
        console.log(`
🚀 Craftopia Backend Server Started Successfully!

Environment: ${process.env.NODE_ENV || "development"}
Port: ${this.PORT}
Database: ${process.env.MONGODB_URI ? "Connected" : "Not configured"}
API Base URL: http://localhost:${this.PORT}/api

Available Endpoints:
📊 Health Check: GET /api/health
👤 Authentication: /api/auth
👥 Users: /api/users
📂 Categories: /api/categories
🎨 Decors: /api/decors

Documentation: http://localhost:${this.PORT}/api
        `);
      });
    } catch (error) {
      console.error("Failed to start server:", error);
      process.exit(1);
    }
  }

  public getApp(): Application {
    return this.app;
  }
}

// Create and start server
const server = new Server();
server.start();

export default server.getApp();
