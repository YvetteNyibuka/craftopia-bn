import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { successResponse, errorResponse, generateTokens } from "../utils";
import { AuthRequest } from "../types";

/**
 * Register a new user
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, email, phoneNumber, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res
        .status(400)
        .json(errorResponse("User already exists with this email"));
      return;
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const user = new User({
      firstName,
      lastName,
      email,
      phoneNumber,
      password: hashedPassword,
    });

    await user.save();

    // Generate tokens
    const tokens = generateTokens({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Set refresh token as httpOnly cookie
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return user data (without password) and access token
    const userResponse = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.status(201).json(
      successResponse("User registered successfully", {
        user: userResponse,
        accessToken: tokens.accessToken,
      })
    );
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json(errorResponse("Internal server error"));
  }
};

/**
 * Login user
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      res.status(401).json(errorResponse("Invalid credentials"));
      return;
    }

    // Check if user is active
    if (!user.isActive) {
      res
        .status(403)
        .json(errorResponse("Account is deactivated. Please contact support."));
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json(errorResponse("Invalid credentials"));
      return;
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const tokens = generateTokens({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Set refresh token as httpOnly cookie
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return user data (without password) and access token
    const userResponse = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.status(200).json(
      successResponse("Login successful", {
        user: userResponse,
        accessToken: tokens.accessToken,
      })
    );
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json(errorResponse("Internal server error"));
  }
};

/**
 * Refresh access token
 */
export const refreshToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      res.status(401).json(errorResponse("Refresh token not provided"));
      return;
    }

    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET!
    ) as jwt.JwtPayload;

    // Find user
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      res.status(401).json(errorResponse("Invalid refresh token"));
      return;
    }

    // Generate new tokens
    const tokens = generateTokens({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Set new refresh token as httpOnly cookie
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json(
      successResponse("Token refreshed successfully", {
        accessToken: tokens.accessToken,
      })
    );
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(401).json(errorResponse("Invalid refresh token"));
  }
};

/**
 * Logout user
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    // Clear refresh token cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.status(200).json(successResponse("Logged out successfully"));
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json(errorResponse("Internal server error"));
  }
};

/**
 * Get current user profile
 */
export const getProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user) {
      res.status(404).json(errorResponse("User not found"));
      return;
    }

    const userResponse = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res
      .status(200)
      .json(successResponse("Profile retrieved successfully", userResponse));
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json(errorResponse("Internal server error"));
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { firstName, lastName } = req.body;
    const userId = req.user?.id;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json(errorResponse("User not found"));
      return;
    }

    // Update fields
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;

    await user.save();

    const userResponse = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res
      .status(200)
      .json(successResponse("Profile updated successfully", userResponse));
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json(errorResponse("Internal server error"));
  }
};

/**
 * Change password
 */
export const changePassword = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    const user = await User.findById(userId).select("+password");
    if (!user) {
      res.status(404).json(errorResponse("User not found"));
      return;
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isCurrentPasswordValid) {
      res.status(400).json(errorResponse("Current password is incorrect"));
      return;
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    user.password = hashedNewPassword;
    await user.save();

    res.status(200).json(successResponse("Password changed successfully"));
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json(errorResponse("Internal server error"));
  }
};
