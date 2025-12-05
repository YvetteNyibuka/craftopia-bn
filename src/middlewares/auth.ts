import { Request, Response, NextFunction } from "express";
import { AuthRequest, UserRole } from "../types";
import { verifyToken, errorResponse } from "../utils";
import { User } from "../models";

/**
 * Authentication middleware - Verifies JWT token
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // Extract token from Authorization header or cookies
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      res.status(401).json(errorResponse("Access denied. No token provided."));
      return;
    }

    try {
      // Verify token
      const decoded = verifyToken(token);

      // Check if user still exists and is active
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) {
        res
          .status(401)
          .json(errorResponse("Access denied. User not found or inactive."));
        return;
      }

      // Attach user info to request
      req.user = {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
      };

      next();
    } catch (error) {
      res.status(401).json(errorResponse("Access denied. Invalid token."));
      return;
    }
  } catch (error) {
    console.error("Authentication error:", error);
    res
      .status(500)
      .json(errorResponse("Internal server error during authentication."));
    return;
  }
};

/**
 * Authorization middleware - Checks user roles
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res
        .status(401)
        .json(errorResponse("Access denied. Please authenticate first."));
      return;
    }

    if (!roles.includes(req.user.role)) {
      res
        .status(403)
        .json(
          errorResponse(
            "Access denied. You do not have permission to perform this action."
          )
        );
      return;
    }

    next();
  };
};

/**
 * Admin only middleware
 */
export const adminOnly = authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN);

/**
 * Super admin only middleware
 */
export const superAdminOnly = authorize(UserRole.SUPER_ADMIN);

/**
 * Optional authentication - Adds user info if token is present but doesn't require it
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (token) {
      try {
        const decoded = verifyToken(token);
        const user = await User.findById(decoded.id);

        if (user && user.isActive) {
          req.user = {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
          };
        }
      } catch (error) {
        // Silently ignore token errors for optional auth
      }
    }

    next();
  } catch (error) {
    next();
  }
};
