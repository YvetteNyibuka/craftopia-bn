import { Router } from "express";
import authRoutes from "./authRoutes";
import userRoutes from "./userRoutes";
import categoryRoutes from "./categoryRoutes";
import decorRoutes from "./decorRoutes";

const router = Router();

// API routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/categories", categoryRoutes);
router.use("/decors", decorRoutes);

// Health check route
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Craftopia API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// API documentation route
router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to Craftopia API",
    version: "1.0.0",
    documentation: "/api/docs",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      categories: "/api/categories",
      decors: "/api/decors",
    },
  });
});

export default router;
