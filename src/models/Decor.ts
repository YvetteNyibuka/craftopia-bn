import mongoose, { Schema } from "mongoose";
import { generateSlug } from "../utils";

const decorSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Decor name is required"],
      trim: true,
      maxlength: [200, "Decor name cannot exceed 200 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price must be positive"],
      set: (val: number) => Math.round(val * 100) / 100,
    },
    originalPrice: {
      type: Number,
      min: [0, "Original price must be positive"],
      set: (val: number) => (val ? Math.round(val * 100) / 100 : val),
    },
    stock: {
      type: Number,
      required: [true, "Stock is required"],
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "out_of_stock", "discontinued"],
      default: "active",
    },
    featured: {
      type: Boolean,
      default: false,
    },
    images: {
      type: [String],
      default: [],
      validate: [
        {
          validator: function (val: string[]) {
            return val.length <= 10;
          },
          message: "Maximum 10 images allowed",
        },
      ],
    },
    tags: {
      type: [String],
      default: [],
      validate: [
        {
          validator: function (val: string[]) {
            return val.length <= 20;
          },
          message: "Maximum 20 tags allowed",
        },
      ],
    },
    materials: {
      type: [String],
      required: [true, "At least one material is required"],
      validate: [
        {
          validator: function (val: string[]) {
            return val.length > 0 && val.length <= 15;
          },
          message: "Between 1 and 15 materials required",
        },
      ],
    },
    dimensions: {
      length: {
        type: Number,
        min: [0, "Length must be positive"],
      },
      width: {
        type: Number,
        min: [0, "Width must be positive"],
      },
      height: {
        type: Number,
        min: [0, "Height must be positive"],
      },
      weight: {
        type: Number,
        min: [0, "Weight must be positive"],
      },
    },
    careInstructions: {
      type: String,
      trim: true,
      maxlength: [1000, "Care instructions cannot exceed 1000 characters"],
    },
    rating: {
      average: {
        type: Number,
        default: 0,
        min: [0, "Rating cannot be negative"],
        max: [5, "Rating cannot exceed 5"],
      },
      count: {
        type: Number,
        default: 0,
        min: [0, "Rating count cannot be negative"],
      },
    },
    views: {
      type: Number,
      default: 0,
      min: [0, "Views cannot be negative"],
    },
    salesCount: {
      type: Number,
      default: 0,
      min: [0, "Sales count cannot be negative"],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
decorSchema.index({ name: 1 });
decorSchema.index({ slug: 1 });
decorSchema.index({ category: 1 });
decorSchema.index({ status: 1 });
decorSchema.index({ featured: 1 });
decorSchema.index({ price: 1 });
decorSchema.index({ "rating.average": -1 });
decorSchema.index({ salesCount: -1 });
decorSchema.index({ createdAt: -1 });
decorSchema.index({ tags: 1 });
decorSchema.index({ materials: 1 });

// Text index for search
decorSchema.index({
  name: "text",
  description: "text",
  tags: "text",
  materials: "text",
});

// Compound indexes
decorSchema.index({ category: 1, status: 1, featured: 1 });
decorSchema.index({ status: 1, price: 1 });

// Virtuals
decorSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

decorSchema.virtual("isOnSale").get(function () {
  return this.originalPrice && this.originalPrice > this.price;
});

decorSchema.virtual("discountPercentage").get(function () {
  if (this.originalPrice && this.originalPrice > this.price) {
    return Math.round(
      ((this.originalPrice - this.price) / this.originalPrice) * 100
    );
  }
  return 0;
});

decorSchema.virtual("isInStock").get(function () {
  return this.stock > 0;
});

// Pre-save middleware
decorSchema.pre("save", function () {
  // Generate slug from name
  if (this.isModified("name")) {
    this.slug = generateSlug(this.name);
  }

  // Auto-update status based on stock
  if (this.isModified("stock")) {
    if (this.stock === 0 && this.status !== "discontinued") {
      this.status = "out_of_stock";
    } else if (this.stock > 0 && this.status === "out_of_stock") {
      this.status = "active";
    }
  }

  // Ensure price is always lower than originalPrice if set
  if (this.originalPrice && this.price >= this.originalPrice) {
    this.originalPrice = undefined;
  }
});

// Post-save middleware to update category decor count
decorSchema.post("save", async function () {
  if (this.isModified("category") || this.isNew) {
    const Category = mongoose.model("Category");
    await Category.findByIdAndUpdate(this.category, {
      $inc: { decorCount: 1 },
    });
  }
});

// Post-remove middleware to update category decor count
decorSchema.post(
  "deleteOne",
  { document: true, query: false },
  async function () {
    const Category = mongoose.model("Category");
    await Category.findByIdAndUpdate(this.category, {
      $inc: { decorCount: -1 },
    });
  }
);

// Transform output
decorSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    delete (ret as any)._id;
    delete (ret as any).__v;
    return ret;
  },
});

const Decor = mongoose.model("Decor", decorSchema);

export default Decor;
