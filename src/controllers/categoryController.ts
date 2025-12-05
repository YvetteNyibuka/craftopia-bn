import { Request, Response } from "express";
import Category from "../models/Category";
import Decor from "../models/Decor";
import { successResponse, errorResponse } from "../utils";
import { AuthRequest, DecorStatus } from "../types";

/**
 * Create a new category
 */
export const createCategory = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, description, icon } = req.body;
    const createdBy = req.user?.id;

    // Check if category with same name already exists
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (existingCategory) {
      res
        .status(400)
        .json(errorResponse("Category with this name already exists"));
      return;
    }

    const category = new Category({
      name,
      description,
      icon,
      createdBy,
    });

    await category.save();

    res
      .status(201)
      .json(successResponse("Category created successfully", category));
  } catch (error) {
    console.error("Create category error:", error);
    res.status(500).json(errorResponse("Internal server error"));
  }
};

/**
 * Get all categories
 */
export const getAllCategories = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sort = (req.query.sort as string) || "name";
    const search = req.query.search as string;
    const isActive = req.query.isActive as string;

    const skip = (page - 1) * limit;

    // Build filter object
    const filter: any = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    // Get categories with pagination
    const [categories, totalCategories] = await Promise.all([
      Category.find(filter)
        .populate("createdBy", "firstName lastName email")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Category.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCategories / limit);

    res.status(200).json(
      successResponse("Categories retrieved successfully", {
        categories,
        pagination: {
          currentPage: page,
          totalPages,
          totalCategories,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      })
    );
  } catch (error) {
    console.error("Get all categories error:", error);
    res.status(500).json(errorResponse("Internal server error"));
  }
};

/**
 * Get active categories (public)
 */
export const getActiveCategories = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const categories = await Category.find({ isActive: true })
      .select("name description icon decorCount")
      .sort("name")
      .lean();

    res
      .status(200)
      .json(
        successResponse("Active categories retrieved successfully", categories)
      );
  } catch (error) {
    console.error("Get active categories error:", error);
    res.status(500).json(errorResponse("Internal server error"));
  }
};

/**
 * Get category by ID
 */
export const getCategoryById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id).populate(
      "createdBy",
      "firstName lastName email"
    );

    if (!category) {
      res.status(404).json(errorResponse("Category not found"));
      return;
    }

    res
      .status(200)
      .json(successResponse("Category retrieved successfully", category));
  } catch (error) {
    console.error("Get category by ID error:", error);
    res.status(500).json(errorResponse("Internal server error"));
  }
};

/**
 * Update category
 */
export const updateCategory = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, icon, isActive } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      res.status(404).json(errorResponse("Category not found"));
      return;
    }

    // Check if name is being changed and if new name already exists
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({
        name: { $regex: new RegExp(`^${name}$`, "i") },
        _id: { $ne: id },
      });

      if (existingCategory) {
        res
          .status(400)
          .json(errorResponse("Category with this name already exists"));
        return;
      }
    }

    // Update fields
    if (name !== undefined) category.name = name;
    if (description !== undefined) category.description = description;
    if (icon !== undefined) category.icon = icon;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    const updatedCategory = await Category.findById(id).populate(
      "createdBy",
      "firstName lastName email"
    );

    res
      .status(200)
      .json(successResponse("Category updated successfully", updatedCategory));
  } catch (error) {
    console.error("Update category error:", error);
    res.status(500).json(errorResponse("Internal server error"));
  }
};

/**
 * Delete category
 */
export const deleteCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      res.status(404).json(errorResponse("Category not found"));
      return;
    }

    // Check if category has associated decors
    const decorCount = await Decor.countDocuments({ category: id });
    if (decorCount > 0) {
      res
        .status(400)
        .json(
          errorResponse(
            "Cannot delete category that has associated decors. Please move or delete the decors first."
          )
        );
      return;
    }

    await Category.findByIdAndDelete(id);

    res.status(200).json(successResponse("Category deleted successfully"));
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json(errorResponse("Internal server error"));
  }
};

/**
 * Get category statistics
 */
export const getCategoryStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const [totalCategories, activeCategories, inactiveCategories] =
      await Promise.all([
        Category.countDocuments(),
        Category.countDocuments({ isActive: true }),
        Category.countDocuments({ isActive: false }),
      ]);

    // Get categories with decor counts
    const categoriesWithCounts = await Category.aggregate([
      {
        $lookup: {
          from: "decors",
          localField: "_id",
          foreignField: "category",
          as: "decors",
        },
      },
      {
        $project: {
          name: 1,
          isActive: 1,
          decorCount: { $size: "$decors" },
        },
      },
      {
        $sort: { decorCount: -1 },
      },
      {
        $limit: 5,
      },
    ]);

    res.status(200).json(
      successResponse("Category statistics retrieved successfully", {
        stats: {
          totalCategories,
          activeCategories,
          inactiveCategories,
        },
        topCategories: categoriesWithCounts,
      })
    );
  } catch (error) {
    console.error("Get category stats error:", error);
    res.status(500).json(errorResponse("Internal server error"));
  }
};

/**
 * Get decors in a category
 */
export const getCategoryDecors = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sort = (req.query.sort as string) || "-createdAt";

    const skip = (page - 1) * limit;

    // Check if category exists
    const category = await Category.findById(id);
    if (!category) {
      res.status(404).json(errorResponse("Category not found"));
      return;
    }

    // Get decors in category
    const [decors, totalDecors] = await Promise.all([
      Decor.find({ category: id, status: DecorStatus.ACTIVE })
        .populate("category", "name")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Decor.countDocuments({ category: id, status: DecorStatus.ACTIVE }),
    ]);

    const totalPages = Math.ceil(totalDecors / limit);

    res.status(200).json(
      successResponse("Category decors retrieved successfully", {
        category: {
          id: category._id,
          name: category.name,
          description: category.description,
        },
        decors,
        pagination: {
          currentPage: page,
          totalPages,
          totalDecors,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      })
    );
  } catch (error) {
    console.error("Get category decors error:", error);
    res.status(500).json(errorResponse("Internal server error"));
  }
};
