import { Router } from "express";
import {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
} from "../controllers/authController";
import { authenticate } from "../middlewares/auth";
import { validate } from "../middlewares/validation";
import { authSchemas } from "../middlewares/validation";
import Joi from "joi";

const router = Router();

// Public routes
router.post("/register", validate(authSchemas.register), register);
router.post("/login", validate(authSchemas.login), login);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);

// Protected routes
router.get("/profile", authenticate, getProfile);

router.put(
  "/profile",
  authenticate,
  validate(
    Joi.object({
      firstName: Joi.string().trim().min(1).max(50).optional(),
      lastName: Joi.string().trim().min(1).max(50).optional(),
    })
  ),
  updateProfile
);

router.put(
  "/change-password",
  authenticate,
  validate(
    Joi.object({
      currentPassword: Joi.string().required(),
      newPassword: Joi.string()
        .min(6)
        .max(128)
        .required()
        .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])"))
        .messages({
          "string.min": "Password must be at least 6 characters long",
          "string.max": "Password cannot exceed 128 characters",
          "string.pattern.base":
            "Password must contain at least one uppercase letter, one lowercase letter, and one number",
        }),
      confirmNewPassword: Joi.any()
        .valid(Joi.ref("newPassword"))
        .required()
        .messages({
          "any.only": "Confirm password must match new password",
        }),
    })
  ),
  changePassword
);

export default router;
