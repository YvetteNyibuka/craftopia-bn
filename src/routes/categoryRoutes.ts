import { Router } from "express";
import {
  createCategory,
  getAllCategories,
  getActiveCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getCategoryStats,
  getCategoryDecors,
} from "../controllers/categoryController";
import { authenticate, adminOnly, optionalAuth } from "../middlewares/auth";
import {
  validate,
  validateQuery,
  validateObjectId,
} from "../middlewares/validation";
import { categorySchemas, querySchemas } from "../middlewares/validation";

const router = Router();

// Public routes
router.get("/active", getActiveCategories);

// Routes with optional authentication
router.get(
  "/",
  optionalAuth,
  validateQuery(querySchemas.pagination),
  getAllCategories
);

router.get("/:id", optionalAuth, validateObjectId("id"), getCategoryById);

router.get(
  "/:id/decors",
  optionalAuth,
  validateObjectId("id"),
  validateQuery(querySchemas.pagination),
  getCategoryDecors
);

// Protected routes (admin only)
router.use(authenticate);
router.use(adminOnly);

// Category statistics
router.get("/admin/stats", getCategoryStats);

// Create new category
router.post("/", validate(categorySchemas.create), createCategory);

// Update category
router.put(
  "/:id",
  validateObjectId("id"),
  validate(categorySchemas.update),
  updateCategory
);

// Delete category
router.delete("/:id", validateObjectId("id"), deleteCategory);

export default router;
