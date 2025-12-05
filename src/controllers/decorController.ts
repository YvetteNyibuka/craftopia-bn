import { Request, Response } from "express";
import Decor from "../models/Decor";
import Category from "../models/Category";
import { successResponse, errorResponse } from "../utils";
import { AuthRequest, DecorStatus } from "../types";
import { uploadMultipleToCloudinary, deleteMultipleFromCloudinary, extractPublicIdFromUrl } from "../utils/cloudinary";

/**
 * Create a new decor with image upload
 */
export const createDecor = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      name,
      description,
      category,
      price,
      originalPrice,
      stock,
      featured,
      tags,
      materials,
      careInstructions,
      dimensions,
    } = req.body;
    
    const createdBy = req.user?.id;
    const files = req.files as Express.Multer.File[];

    // Verify category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      res.status(400).json(errorResponse("Invalid category"));
      return;
    }

    let imageUrls: string[] = [];
    
    // Upload images to Cloudinary if files are provided
    if (files && files.length > 0) {
      try {
        const uploadResults = await uploadMultipleToCloudinary(files);
        imageUrls = uploadResults.map(result => result.url);
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        res.status(500).json(errorResponse("Failed to upload images"));
        return;
      }
    }

    // Parse JSON fields if they're strings (from FormData)
    let parsedTags = tags;
    let parsedMaterials = materials;
    let parsedDimensions = dimensions;

    try {
      if (typeof tags === 'string') {
        parsedTags = JSON.parse(tags);
      }
      if (typeof materials === 'string') {
        parsedMaterials = JSON.parse(materials);
      }
      if (typeof dimensions === 'string') {
        parsedDimensions = JSON.parse(dimensions);
      }
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
    }

    const decor = new Decor({
      name,
      description,
      category,
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      stock: Number(stock),
      featured: featured === 'true' || featured === true,
      tags: parsedTags,
      materials: parsedMaterials,
      careInstructions,
      dimensions: parsedDimensions,
      images: imageUrls,
      createdBy,
    });

    await decor.save();

    // Populate the created decor
    const populatedDecor = await Decor.findById(decor._id)
      .populate("category", "name description")
      .populate("createdBy", "firstName lastName email");

    res
      .status(201)
      .json(successResponse("Decor created successfully", populatedDecor));
  } catch (error) {
    console.error("Create decor error:", error);
    res.status(500).json(errorResponse("Internal server error"));
  }
};

/**
 * Update decor with image handling
 */
export const updateDecor = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const files = req.files as Express.Multer.File[];

    const decor = await Decor.findById(id);
    if (!decor) {
      res.status(404).json(errorResponse("Decor not found"));
      return;
    }

    // Verify category if being updated
    if (updateData.category) {
      const categoryExists = await Category.findById(updateData.category);
      if (!categoryExists) {
        res.status(400).json(errorResponse("Invalid category"));
        return;
      }
    }

    // Handle image updates
    if (files && files.length > 0) {
      try {
        // Upload new images
        const uploadResults = await uploadMultipleToCloudinary(files);
        const newImageUrls = uploadResults.map(result => result.url);
        
        // If replacing images, delete old ones from Cloudinary
        if (updateData.replaceImages === 'true' && decor.images.length > 0) {
          const publicIds = decor.images.map(extractPublicIdFromUrl);
          await deleteMultipleFromCloudinary(publicIds);
          updateData.images = newImageUrls;
        } else {
          // Append new images to existing ones
          updateData.images = [...(decor.images || []), ...newImageUrls];
        }
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        res.status(500).json(errorResponse("Failed to upload images"));
        return;
      }
    }

    // Parse JSON fields if they're strings (from FormData)
    if (typeof updateData.tags === 'string') {
      try {
        updateData.tags = JSON.parse(updateData.tags);
      } catch (e) {
        // Keep as string if parsing fails
      }
    }
    if (typeof updateData.materials === 'string') {
      try {
        updateData.materials = JSON.parse(updateData.materials);
      } catch (e) {
        // Keep as string if parsing fails
      }
    }
    if (typeof updateData.dimensions === 'string') {
      try {
        updateData.dimensions = JSON.parse(updateData.dimensions);
      } catch (e) {
        // Keep as string if parsing fails
      }
    }

    // Update fields
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] !== undefined && key !== 'replaceImages') {
        (decor as any)[key] = updateData[key];
      }
    });

    await decor.save();

    const updatedDecor = await Decor.findById(id)
      .populate("category", "name description")
      .populate("createdBy", "firstName lastName email");

    res
      .status(200)
      .json(successResponse("Decor updated successfully", updatedDecor));
  } catch (error) {
    console.error("Update decor error:", error);
    res.status(500).json(errorResponse("Internal server error"));
  }
};

/**
 * Delete decor (including Cloudinary images)
 */
export const deleteDecor = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const decor = await Decor.findById(id);
    if (!decor) {
      res.status(404).json(errorResponse("Decor not found"));
      return;
    }

    // Delete images from Cloudinary
    if (decor.images && decor.images.length > 0) {
      const publicIds = decor.images.map(extractPublicIdFromUrl);
      await deleteMultipleFromCloudinary(publicIds);
    }

    await Decor.findByIdAndDelete(id);

    res.status(200).json(successResponse("Decor deleted successfully"));
  } catch (error) {
    console.error("Delete decor error:", error);
    res.status(500).json(errorResponse("Internal server error"));
  }
};

// Keep all the existing controller functions...

/**
 * Get all decors with filtering and pagination
 */
export const getAllDecors = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sort = (req.query.sort as string) || "-createdAt";
    const search = req.query.search as string;
    const category = req.query.category as string;
    const status = req.query.status as string;
    const featured = req.query.featured as string;
    const minPrice = parseFloat(req.query.minPrice as string);
    const maxPrice = parseFloat(req.query.maxPrice as string);

    const skip = (page - 1) * limit;

    // Build filter object
    const filter: any = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
        { materials: { $in: [new RegExp(search, "i")] } },
      ];
    }

    if (category) {
      filter.category = category;
    }

    if (status) {
      filter.status = status;
    }

    if (featured !== undefined) {
      filter.featured = featured === "true";
    }

    if (!isNaN(minPrice) || !isNaN(maxPrice)) {
      filter.price = {};
      if (!isNaN(minPrice)) filter.price.$gte = minPrice;
      if (!isNaN(maxPrice)) filter.price.$lte = maxPrice;
    }

    // Get decors with pagination
    const [decors, totalDecors] = await Promise.all([
      Decor.find(filter)
        .populate("category", "name description")
        .populate("createdBy", "firstName lastName email")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Decor.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalDecors / limit);

    res.status(200).json(
      successResponse("Decors retrieved successfully", {
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
    console.error("Get all decors error:", error);
    res.status(500).json(errorResponse("Internal server error"));
  }
};

/**
 * Get active decors (public)
 */
export const getActiveDecors = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const sort = (req.query.sort as string) || "-createdAt";
    const search = req.query.search as string;
    const category = req.query.category as string;
    const featured = req.query.featured as string;
    const minPrice = parseFloat(req.query.minPrice as string);
    const maxPrice = parseFloat(req.query.maxPrice as string);

    const skip = (page - 1) * limit;

    // Build filter object
    const filter: any = { status: DecorStatus.ACTIVE };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    if (category) {
      filter.category = category;
    }

    if (featured !== undefined) {
      filter.featured = featured === "true";
    }

    if (!isNaN(minPrice) || !isNaN(maxPrice)) {
      filter.price = {};
      if (!isNaN(minPrice)) filter.price.$gte = minPrice;
      if (!isNaN(maxPrice)) filter.price.$lte = maxPrice;
    }

    // Get decors with pagination
    const [decors, totalDecors] = await Promise.all([
      Decor.find(filter)
        .populate("category", "name description")
        .select("-createdBy")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Decor.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalDecors / limit);

    res.status(200).json(
      successResponse("Active decors retrieved successfully", {
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
    console.error("Get active decors error:", error);
    res.status(500).json(errorResponse("Internal server error"));
  }
};

/**
 * Get featured decors (public)
 */
export const getFeaturedDecors = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 8;

    const decors = await Decor.find({
      status: DecorStatus.ACTIVE,
      featured: true,
    })
      .populate("category", "name")
      .select("-createdBy")
      .sort("-createdAt")
      .limit(limit)
      .lean();

    res
      .status(200)
      .json(successResponse("Featured decors retrieved successfully", decors));
  } catch (error) {
    console.error("Get featured decors error:", error);
    res.status(500).json(errorResponse("Internal server error"));
  }
};

/**
 * Get decor by ID
 */
export const getDecorById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const includeInactive = req.query.includeInactive === "true";

    const filter: any = { _id: id };
    if (!includeInactive) {
      filter.status = DecorStatus.ACTIVE;
    }

    const decor = await Decor.findOne(filter)
      .populate("category", "name description")
      .populate("createdBy", "firstName lastName email");

    if (!decor) {
      res.status(404).json(errorResponse("Decor not found"));
      return;
    }

    res
      .status(200)
      .json(successResponse("Decor retrieved successfully", decor));
  } catch (error) {
    console.error("Get decor by ID error:", error);
    res.status(500).json(errorResponse("Internal server error"));
  }
};

/**
 * Update decor stock
 */
export const updateStock = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { stock } = req.body;

    const decor = await Decor.findById(id);
    if (!decor) {
      res.status(404).json(errorResponse("Decor not found"));
      return;
    }

    decor.stock = stock;

    // Automatically update status based on stock
    if (stock === 0) {
      decor.status = DecorStatus.OUT_OF_STOCK;
    } else if (decor.status === DecorStatus.OUT_OF_STOCK) {
      decor.status = DecorStatus.ACTIVE;
    }

    await decor.save();

    res.status(200).json(
      successResponse("Stock updated successfully", {
        id: decor._id,
        stock: decor.stock,
        status: decor.status,
      })
    );
  } catch (error) {
    console.error("Update stock error:", error);
    res.status(500).json(errorResponse("Internal server error"));
  }
};

/**
 * Get decor statistics
 */
export const getDecorStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const [
      totalDecors,
      activeDecors,
      inactiveDecors,
      outOfStockDecors,
      featuredDecors,
    ] = await Promise.all([
      Decor.countDocuments(),
      Decor.countDocuments({ status: DecorStatus.ACTIVE }),
      Decor.countDocuments({ status: DecorStatus.INACTIVE }),
      Decor.countDocuments({ status: DecorStatus.OUT_OF_STOCK }),
      Decor.countDocuments({ featured: true, status: DecorStatus.ACTIVE }),
    ]);

    // Get price statistics
    const priceStats = await Decor.aggregate([
      { $match: { status: DecorStatus.ACTIVE } },
      {
        $group: {
          _id: null,
          averagePrice: { $avg: "$price" },
          minPrice: { $min: "$price" },
          maxPrice: { $max: "$price" },
          totalValue: { $sum: { $multiply: ["$price", "$stock"] } },
        },
      },
    ]);

    // Get recent decors
    const recentDecors = await Decor.find()
      .populate("category", "name")
      .select("name price stock status createdAt")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.status(200).json(
      successResponse("Decor statistics retrieved successfully", {
        stats: {
          totalDecors,
          activeDecors,
          inactiveDecors,
          outOfStockDecors,
          featuredDecors,
          priceStats: priceStats[0] || {
            averagePrice: 0,
            minPrice: 0,
            maxPrice: 0,
            totalValue: 0,
          },
        },
        recentDecors,
      })
    );
  } catch (error) {
    console.error("Get decor stats error:", error);
    res.status(500).json(errorResponse("Internal server error"));
  }
};

/**
 * Search decors with advanced filters
 */
export const searchDecors = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      q,
      category,
      minPrice,
      maxPrice,
      materials,
      tags,
      sortBy,
      order,
      page,
      limit,
    } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 12;
    const skip = (pageNum - 1) * limitNum;

    // Build aggregation pipeline
    const pipeline: any[] = [{ $match: { status: DecorStatus.ACTIVE } }];

    // Text search
    if (q) {
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: q, $options: "i" } },
            { description: { $regex: q, $options: "i" } },
            { tags: { $in: [new RegExp(q as string, "i")] } },
            { materials: { $in: [new RegExp(q as string, "i")] } },
          ],
        },
      });
    }

    // Category filter
    if (category) {
      pipeline.push({ $match: { category: category } });
    }

    // Price range filter
    if (minPrice || maxPrice) {
      const priceFilter: any = {};
      if (minPrice) priceFilter.$gte = parseFloat(minPrice as string);
      if (maxPrice) priceFilter.$lte = parseFloat(maxPrice as string);
      pipeline.push({ $match: { price: priceFilter } });
    }

    // Materials filter
    if (materials) {
      const materialArray = (materials as string).split(",");
      pipeline.push({
        $match: {
          materials: { $in: materialArray },
        },
      });
    }

    // Tags filter
    if (tags) {
      const tagArray = (tags as string).split(",");
      pipeline.push({
        $match: {
          tags: { $in: tagArray },
        },
      });
    }

    // Add category population
    pipeline.push({
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "category",
      },
    });

    pipeline.push({
      $unwind: "$category",
    });

    // Sorting
    const sortField = sortBy || "createdAt";
    const sortOrder = order === "asc" ? 1 : -1;
    pipeline.push({ $sort: { [sortField as string]: sortOrder } });

    // Get total count
    const countPipeline = [...pipeline, { $count: "total" }];
    const [countResult] = await Decor.aggregate(countPipeline);
    const totalDecors = countResult?.total || 0;

    // Add pagination
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limitNum });

    // Execute search
    const decors = await Decor.aggregate(pipeline);

    const totalPages = Math.ceil(totalDecors / limitNum);

    res.status(200).json(
      successResponse("Search completed successfully", {
        decors,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalDecors,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
        searchParams: {
          query: q,
          category,
          minPrice,
          maxPrice,
          materials,
          tags,
          sortBy,
          order,
        },
      })
    );
  } catch (error) {
    console.error("Search decors error:", error);
    res.status(500).json(errorResponse("Internal server error"));
  }
};
