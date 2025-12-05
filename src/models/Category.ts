import mongoose, { Schema } from "mongoose";
import { generateSlug } from "../utils";

const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      maxlength: [100, "Category name cannot exceed 100 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    icon: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    decorCount: {
      type: Number,
      default: 0,
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
categorySchema.index({ name: 1 });
categorySchema.index({ slug: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ createdBy: 1 });

// Generate slug from name before saving
categorySchema.pre("save", function () {
  if (this.isModified("name")) {
    this.slug = generateSlug(this.name);
  }
});

// Virtual for id
categorySchema.virtual("id").get(function () {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
categorySchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    delete (ret as any)._id;
    delete (ret as any).__v;
    return ret;
  },
});

const Category = mongoose.model("Category", categorySchema);

export default Category;
