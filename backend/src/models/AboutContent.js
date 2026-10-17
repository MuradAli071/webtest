import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, required: true, trim: true },
    alt: { type: String, trim: true, default: "", maxlength: 240 },
  },
  { _id: false },
);

const stepSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "", maxlength: 120 },
    description: { type: String, trim: true, default: "", maxlength: 600 },
  },
  { _id: false },
);

const aboutSectionSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      enum: ["introduction", "missionVision", "approach", "team", "achievements", "cta"],
    },
    visible: { type: Boolean, default: false },
    order: { type: Number, required: true, min: 0 },
    eyebrow: { type: String, trim: true, default: "", maxlength: 80 },
    title: { type: String, trim: true, default: "", maxlength: 180 },
    body: { type: String, trim: true, default: "", maxlength: 4000 },
    image: { type: imageSchema, default: null },
    missionTitle: { type: String, trim: true, default: "", maxlength: 120 },
    missionBody: { type: String, trim: true, default: "", maxlength: 1600 },
    visionTitle: { type: String, trim: true, default: "", maxlength: 120 },
    visionBody: { type: String, trim: true, default: "", maxlength: 1600 },
    steps: { type: [stepSchema], default: [], validate: [(items) => items.length <= 12, "At most 12 process steps are allowed."] },
    members: {
      type: [
        new mongoose.Schema(
          {
            name: { type: String, trim: true, required: true, maxlength: 120 },
            role: { type: String, trim: true, default: "", maxlength: 120 },
            bio: { type: String, trim: true, default: "", maxlength: 1200 },
            image: { type: imageSchema, default: null },
          },
          { _id: false },
        ),
      ],
      default: [],
      validate: [(items) => items.length <= 40, "At most 40 team members are allowed."],
    },
    achievements: {
      type: [
        new mongoose.Schema(
          {
            label: { type: String, trim: true, required: true, maxlength: 120 },
            value: { type: String, trim: true, default: "", maxlength: 80 },
            description: { type: String, trim: true, default: "", maxlength: 500 },
          },
          { _id: false },
        ),
      ],
      default: [],
      validate: [(items) => items.length <= 30, "At most 30 achievements are allowed."],
    },
    buttonLabel: { type: String, trim: true, default: "", maxlength: 80 },
    buttonHref: { type: String, trim: true, default: "", maxlength: 1000 },
  },
  { _id: false },
);

const aboutContentSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "about" },
    sections: { type: [aboutSectionSchema], default: [] },
  },
  { timestamps: true },
);

export default mongoose.model("AboutContent", aboutContentSchema);
