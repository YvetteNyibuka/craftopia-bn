import { Request, Response } from "express";
import User from "../models/User";
import { successResponse, errorResponse } from "../utils";
import { AuthRequest, UserRole } from "../types";

/**
 * Get all users (Admin only)
 */
export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sort = (req.query.sort as string) || "-createdAt";
    const search = req.query.search as string;
    const role = req.query.role as string;
    const isActive = req.query.isActive as string;

    const skip = (page - 1) * limit;

    // Build filter object
    const filter: any = {};

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (role) {
      filter.role = role;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    // Get users with pagination
    const [users, totalUsers] = await Promise.all([
      User.find(filter)
        .select("-password")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalUsers / limit);

    res.status(200).json(
      successResponse("Users retrieved successfully", {
        users,
        pagination: {
          currentPage: page,
          totalPages,
          totalUsers,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      })
    );
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json(errorResponse("Internal server error"));
  }
};

/**
 * Get user by ID (Admin only)
 */
export const getUserById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select("-password");
    if (!user) {
      res.status(404).json(errorResponse("User not found"));
      return;
    }

    res.status(200).json(successResponse("User retrieved successfully", user));
  } catch (error) {
    console.error("Get user by ID error:", error);
    res.status(500).json(errorResponse("Internal server error"));
  }
};

/**
 * Update user (Admin only)
 */
export const updateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { firstName, lastName, role, isActive } = req.body;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json(errorResponse("User not found"));
      return;
    }

    // Update fields
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    const userResponse = await User.findById(id).select("-password");

    res
      .status(200)
      .json(successResponse("User updated successfully", userResponse));
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json(errorResponse("Internal server error"));
  }
};

/**
 * Delete user (Admin only)
 */
export const deleteUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json(errorResponse("User not found"));
      return;
    }

    // Prevent deletion of super admin
    if (user.role === "super_admin") {
      res.status(403).json(errorResponse("Cannot delete super admin"));
      return;
    }

    await User.findByIdAndDelete(id);

    res.status(200).json(successResponse("User deleted successfully"));
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json(errorResponse("Internal server error"));
  }
};

/**
 * Deactivate user (Admin only)
 */
export const deactivateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json(errorResponse("User not found"));
      return;
    }

    // Prevent deactivation of super admin
    if (user.role === "super_admin") {
      res.status(403).json(errorResponse("Cannot deactivate super admin"));
      return;
    }

    user.isActive = false;
    await user.save();

    const userResponse = await User.findById(id).select("-password");

    res
      .status(200)
      .json(successResponse("User deactivated successfully", userResponse));
  } catch (error) {
    console.error("Deactivate user error:", error);
    res.status(500).json(errorResponse("Internal server error"));
  }
};

/**
 * Activate user (Admin only)
 */
export const activateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json(errorResponse("User not found"));
      return;
    }

    user.isActive = true;
    await user.save();

    const userResponse = await User.findById(id).select("-password");

    res
      .status(200)
      .json(successResponse("User activated successfully", userResponse));
  } catch (error) {
    console.error("Activate user error:", error);
    res.status(500).json(errorResponse("Internal server error"));
  }
};

/**
 * Get user stats (Admin only)
 */
export const getUserStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const [totalUsers, activeUsers, inactiveUsers, adminUsers] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ isActive: true }),
        User.countDocuments({ isActive: false }),
        User.countDocuments({ role: { $in: ["admin", "super_admin"] } }),
      ]);

    const recentUsers = await User.find()
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.status(200).json(
      successResponse("User stats retrieved successfully", {
        stats: {
          totalUsers,
          activeUsers,
          inactiveUsers,
          adminUsers,
          regularUsers: totalUsers - adminUsers,
        },
        recentUsers,
      })
    );
  } catch (error) {
    console.error("Get user stats error:", error);
    res.status(500).json(errorResponse("Internal server error"));
  }
};

/**
 * Promote user to admin (Super Admin only)
 */
export const promoteToAdmin = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json(errorResponse("User not found"));
      return;
    }

    if (user.role === "admin" || user.role === "super_admin") {
      res.status(400).json(errorResponse("User is already an admin"));
      return;
    }

    user.role = UserRole.ADMIN;
    await user.save();

    const userResponse = await User.findById(id).select("-password");

    res
      .status(200)
      .json(
        successResponse("User promoted to admin successfully", userResponse)
      );
  } catch (error) {
    console.error("Promote to admin error:", error);
    res.status(500).json(errorResponse("Internal server error"));
  }
};

/**
 * Demote admin to user (Super Admin only)
 */
export const demoteFromAdmin = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json(errorResponse("User not found"));
      return;
    }

    if (user.role === "super_admin") {
      res.status(403).json(errorResponse("Cannot demote super admin"));
      return;
    }

    if (user.role === "user") {
      res.status(400).json(errorResponse("User is not an admin"));
      return;
    }

    user.role = UserRole.USER;
    await user.save();

    const userResponse = await User.findById(id).select("-password");

    res
      .status(200)
      .json(
        successResponse("Admin demoted to user successfully", userResponse)
      );
  } catch (error) {
    console.error("Demote from admin error:", error);
    res.status(500).json(errorResponse("Internal server error"));
  }
};
