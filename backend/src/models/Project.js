import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, required: true, trim: true },
    alt: { type: String, trim: true, default: "", maxlength: 240 },
  },
  { _id: false },
);

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 140 },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      maxlength: 140,
    },
    summary: { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, required: true, trim: true, maxlength: 6000 },
    category: { type: String, required: true, trim: true, maxlength: 100 },
    technologies: {
      type: [{ type: String, trim: true, maxlength: 60 }],
      default: [],
      validate: [(values) => values.length <= 30, "At most 30 technologies are allowed."],
    },
    client: { type: String, trim: true, default: "", maxlength: 140 },
    industry: { type: String, trim: true, default: "", maxlength: 100 },
    objectives: {
      type: [{ type: String, trim: true, maxlength: 500 }],
      default: [],
      validate: [(values) => values.length <= 20, "At most 20 objectives are allowed."],
    },
    outcomes: {
      type: [{ type: String, trim: true, maxlength: 500 }],
      default: [],
      validate: [(values) => values.length <= 20, "At most 20 outcomes are allowed."],
    },
    coverImage: { type: imageSchema, default: null },
    images: {
      type: [imageSchema],
      default: [],
      validate: [(values) => values.length <= 12, "At most 12 project images are allowed."],
    },
    links: {
      live: { type: String, trim: true, default: "", maxlength: 1000 },
      additional: {
        type: [
          new mongoose.Schema(
            {
              label: { type: String, required: true, trim: true, maxlength: 80 },
              url: { type: String, required: true, trim: true, maxlength: 1000 },
            },
            { _id: false },
          ),
        ],
        default: [],
        validate: [(values) => values.length <= 10, "At most 10 additional links are allowed."],
      },
    },
    featured: { type: Boolean, default: false },
    published: { type: Boolean, default: false },
    order: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true },
);

projectSchema.index({ published: 1, featured: -1, order: 1 });

export default mongoose.model("Project", projectSchema);
