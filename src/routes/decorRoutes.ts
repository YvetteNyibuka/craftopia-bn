import { Router } from "express";
import {
  createDecor,
  getAllDecors,
  getActiveDecors,
  getFeaturedDecors,
  getDecorById,
  updateDecor,
  deleteDecor,
  updateStock,
  getDecorStats,
  searchDecors,
} from "../controllers/decorController";
import { authenticate, adminOnly, optionalAuth } from "../middlewares/auth";
import {
  validate,
  validateQuery,
  validateObjectId,
} from "../middlewares/validation";
import { decorSchemas, querySchemas } from "../middlewares/validation";
import { uploadImages } from "../middlewares/upload";
import Joi from "joi";
import { Request, Response, NextFunction } from "express";

const router = Router();

// Public routes
router.get("/", validateQuery(querySchemas.pagination), getActiveDecors);
router.get("/active", validateQuery(querySchemas.pagination), getActiveDecors);

router.get("/featured", getFeaturedDecors);

router.get(
  "/search",
  validateQuery(
    Joi.object({
      q: Joi.string().trim().optional(),
      category: Joi.string().hex().length(24).optional(),
      minPrice: Joi.number().min(0).optional(),
      maxPrice: Joi.number().min(0).optional(),
      materials: Joi.string().optional(),
      tags: Joi.string().optional(),
      sortBy: Joi.string()
        .valid("name", "price", "createdAt", "rating")
        .optional(),
      order: Joi.string().valid("asc", "desc").optional(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(12),
    })
  ),
  searchDecors
);

// Routes with optional authentication
router.get("/:id", optionalAuth, validateObjectId("id"), getDecorById);

// Protected routes (admin only)
router.use(authenticate);
router.use(adminOnly);

// Admin routes
router.get("/admin/stats", getDecorStats);

router.get("/admin/all", validateQuery(querySchemas.pagination), getAllDecors);

// Validation middleware for create decor
const validateCreateDecor = (req: Request, res: Response, next: NextFunction): void => {
  const {
    name,
    description,
    category,
    price,
    stock,
    materials
  } = req.body;

  // Basic validation
  if (!name || !description || !category || !price || !stock || !materials) {
    res.status(400).json({
      success: false,
      message: "Missing required fields: name, description, category, price, stock, materials"
    });
    return;
  }

  // Validate category ID format
  if (!/^[0-9a-fA-F]{24}$/.test(category)) {
    res.status(400).json({
      success: false,
      message: "Invalid category ID format"
    });
    return;
  }

  // Validate price and stock are numbers
  if (isNaN(Number(price)) || isNaN(Number(stock))) {
    res.status(400).json({
      success: false,
      message: "Price and stock must be valid numbers"
    });
    return;
  }

  next();
};

// Validation middleware for update decor
const validateUpdateDecor = (req: Request, res: Response, next: NextFunction): void => {
  const { category } = req.body;

  // Validate category ID format if provided
  if (category && !/^[0-9a-fA-F]{24}$/.test(category)) {
    res.status(400).json({
      success: false,
      message: "Invalid category ID format"
    });
    return;
  }

  next();
};

// Create new decor with image upload
router.post("/", uploadImages, validateCreateDecor, createDecor);

// Update decor with optional image upload
router.put("/:id", validateObjectId("id"), uploadImages, validateUpdateDecor, updateDecor);

// Update stock
router.patch(
  "/:id/stock",
  validateObjectId("id"),
  validate(
    Joi.object({
      stock: Joi.number().integer().min(0).required(),
    })
  ),
  updateStock
);

// Delete decor
router.delete("/:id", validateObjectId("id"), deleteDecor);

export default router;
