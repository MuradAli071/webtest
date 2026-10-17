import mongoose from "mongoose";

const enquirySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["contact", "project"], default: "contact" },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    company: { type: String, trim: true, default: "", maxlength: 160 },
    phone: { type: String, trim: true, default: "", maxlength: 40 },
    service: { type: String, trim: true, default: "", maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 6000 },
    status: {
      type: String,
      enum: ["new", "read", "responded", "archived"],
      default: "new",
    },
  },
  { timestamps: true },
);

enquirySchema.index({ createdAt: -1 });
enquirySchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("Enquiry", enquirySchema);
