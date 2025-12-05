import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  deactivateUser,
  activateUser,
  getUserStats,
  promoteToAdmin,
  demoteFromAdmin,
} from "../controllers/userController";
import { authenticate, adminOnly, superAdminOnly } from "../middlewares/auth";
import {
  validate,
  validateQuery,
  validateObjectId,
} from "../middlewares/validation";
import Joi from "joi";

const router = Router();

// All routes require authentication
router.use(authenticate);

// User statistics (admin only)
router.get("/stats", adminOnly, getUserStats);

// Get all users with pagination and filtering (admin only)
router.get(
  "/",
  adminOnly,
  validateQuery(
    Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      sort: Joi.string()
        .valid(
          "firstName",
          "-firstName",
          "lastName",
          "-lastName",
          "email",
          "-email",
          "createdAt",
          "-createdAt",
          "role",
          "-role"
        )
        .optional(),
      search: Joi.string().trim().optional(),
      role: Joi.string().valid("user", "admin", "super_admin").optional(),
      isActive: Joi.boolean().optional(),
    })
  ),
  getAllUsers
);

// Get specific user by ID (admin only)
router.get("/:id", adminOnly, validateObjectId("id"), getUserById);

// Update user (admin only)
router.put(
  "/:id",
  adminOnly,
  validateObjectId("id"),
  validate(
    Joi.object({
      firstName: Joi.string().trim().min(1).max(50).optional(),
      lastName: Joi.string().trim().min(1).max(50).optional(),
      role: Joi.string().valid("user", "admin").optional(),
      isActive: Joi.boolean().optional(),
    })
  ),
  updateUser
);

// Delete user (admin only)
router.delete("/:id", adminOnly, validateObjectId("id"), deleteUser);

// Deactivate user (admin only)
router.patch(
  "/:id/deactivate",
  adminOnly,
  validateObjectId("id"),
  deactivateUser
);

// Activate user (admin only)
router.patch("/:id/activate", adminOnly, validateObjectId("id"), activateUser);

// Promote user to admin (super admin only)
router.patch(
  "/:id/promote",
  superAdminOnly,
  validateObjectId("id"),
  promoteToAdmin
);

// Demote admin to user (super admin only)
router.patch(
  "/:id/demote",
  superAdminOnly,
  validateObjectId("id"),
  demoteFromAdmin
);

export default router;
