import mongoose from "mongoose";
import Category from "../models/Category.js";
import Decor from "../models/Decor.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/craftopia";

const seedData = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ MongoDB connected for seeding");

    // Clear existing data
    await Category.deleteMany({});
    await Decor.deleteMany({});
    await User.deleteMany({});

    console.log("🗑️ Cleared existing data");

    // Create sample categories
    const categories = await Category.insertMany([
      {
        name: "Wall Art & Decor",
        slug: "wall-art-decor",
        description: "Beautiful handcrafted wall decorations and art pieces",
        isActive: true,
      },
      {
        name: "Home Accessories",
        slug: "home-accessories",
        description: "Elegant accessories for your home",
        isActive: true,
      },
      {
        name: "Handmade Jewelry",
        slug: "handmade-jewelry",
        description: "Unique jewelry pieces crafted by artisans",
        isActive: true,
      },
      {
        name: "Furniture & Storage",
        slug: "furniture-storage",
        description: "Functional and beautiful furniture pieces",
        isActive: true,
      },
      {
        name: "Textiles & Fabrics",
        slug: "textiles-fabrics",
        description: "Soft furnishings and textile art",
        isActive: true,
      },
    ]);

    console.log("📂 Categories created");

    // Create sample user
    const hashedPassword = await bcrypt.hash("password123", 12);
    const user = await User.create({
      firstName: "John",
      lastName: "Artisan",
      email: "john@craftopia.com",
      password: hashedPassword,
      role: "admin",
      isActive: true,
    });

    console.log("👤 Sample user created");

    // Create sample decor items
    const decors = await Decor.insertMany([
      {
        name: "Artisan Diamond Halo Collection",
        slug: "artisan-diamond-halo-collection",
        description:
          "Handcrafted with precision and featuring elegant diamond-inspired patterns. This stunning piece combines traditional craftsmanship with contemporary design.",
        category: categories[0]._id,
        price: 299,
        discountPrice: 269,
        images: [
          "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400",
          "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400",
        ],
        status: "active",
        stockQuantity: 15,
        tags: ["handmade", "diamond pattern", "wall art", "modern"],
        featured: true,
        createdBy: user._id,
      },
      {
        name: "Elegant Halo Stud Earrings",
        slug: "elegant-halo-stud-earrings",
        description:
          "Sophisticated jewelry pieces perfect for special occasions. Crafted with attention to detail and timeless elegance.",
        category: categories[2]._id,
        price: 472,
        images: [
          "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400",
          "https://images.unsplash.com/photo-1543294001-f7cd5d7fb379?w=400",
        ],
        status: "active",
        stockQuantity: 8,
        tags: ["jewelry", "earrings", "elegant", "handmade"],
        featured: true,
        createdBy: user._id,
      },
      {
        name: "Rustic Wooden Accent Piece",
        slug: "rustic-wooden-accent-piece",
        description:
          "Unique reclaimed wood creation with natural finish. Each piece tells a story of sustainable craftsmanship.",
        category: categories[3]._id,
        price: 459,
        images: [
          "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400",
          "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400",
        ],
        status: "active",
        stockQuantity: 5,
        tags: ["wood", "rustic", "furniture", "sustainable"],
        featured: true,
        createdBy: user._id,
      },
      {
        name: "Custom Ceramic Vase Set",
        slug: "custom-ceramic-vase-set",
        description:
          "Hand-thrown ceramics with glazed finish in earth tones. Perfect for adding a natural touch to any space.",
        category: categories[1]._id,
        price: 399,
        discountPrice: 359,
        images: [
          "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=400",
          "https://images.unsplash.com/photo-1587829979247-e8bc80d0ceb8?w=400",
        ],
        status: "active",
        stockQuantity: 12,
        tags: ["ceramic", "vase", "handmade", "earth tones"],
        featured: false,
        createdBy: user._id,
      },
      {
        name: "Woven Textile Wall Hanging",
        slug: "woven-textile-wall-hanging",
        description:
          "Traditional weaving techniques meet modern design. A stunning focal point for any room.",
        category: categories[4]._id,
        price: 189,
        images: [
          "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400",
          "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
        ],
        status: "active",
        stockQuantity: 0, // Out of stock
        tags: ["textile", "weaving", "wall hanging", "traditional"],
        featured: false,
        createdBy: user._id,
      },
      {
        name: "Carved Wooden Sculpture",
        slug: "carved-wooden-sculpture",
        description:
          "Intricate hand-carved piece featuring traditional motifs. A true masterpiece of woodworking artistry.",
        category: categories[1]._id,
        price: 625,
        images: [
          "https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=400",
        ],
        status: "active",
        stockQuantity: 3,
        tags: ["sculpture", "carved", "wood", "traditional", "art"],
        featured: true,
        createdBy: user._id,
      },
    ]);

    console.log("🎨 Decor items created");

    console.log(`
    ✅ Seeding completed successfully!
    
    📊 Summary:
    - ${categories.length} categories created
    - ${decors.length} decor items created  
    - 1 admin user created
    
    🔐 Test Account:
    Email: john@craftopia.com
    Password: password123
    Role: admin
    `);

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

seedData();
