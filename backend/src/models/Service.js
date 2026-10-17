import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 2400 },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      maxlength: 120,
    },
    icon: {
      type: String,
      enum: ["bot", "film", "globe", "smartphone", "palette", "megaphone"],
      default: "globe",
    },
    imageUrl: { type: String, trim: true, default: "", maxlength: 1000 },
    imagePublicId: { type: String, trim: true, default: "", maxlength: 255 },
    published: { type: Boolean, default: false },
    order: { type: Number, required: true, default: 0, min: 0 },
    cta: {
      label: { type: String, required: true, trim: true, maxlength: 80 },
      href: { type: String, required: true, trim: true, maxlength: 1000 },
    },
  },
  { timestamps: true },
);

serviceSchema.index({ published: 1, order: 1 });

export default mongoose.model("Service", serviceSchema);
