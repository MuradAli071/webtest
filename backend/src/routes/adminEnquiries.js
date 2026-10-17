import { Router } from "express";
import mongoose from "mongoose";
import Enquiry from "../models/Enquiry.js";
import { requireAdmin } from "../middleware/adminAuth.js";

const router = Router();
const statuses = new Set(["new", "read", "responded", "archived"]);

router.use(requireAdmin);

router.get("/", async (request, response) => {
  const page = Number(request.query.page ?? "1");
  const limit = Number(request.query.limit ?? "20");
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    return response.status(400).json({ error: "page must be positive and limit must be between 1 and 100." });
  }
  const filter = {};
  if (request.query.status) {
    if (!statuses.has(request.query.status)) return response.status(400).json({ error: "Unknown enquiry status." });
    filter.status = request.query.status;
  }
  const [items, total] = await Promise.all([
    Enquiry.find(filter)
      .select("type name email company phone service message status createdAt updatedAt")
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Enquiry.countDocuments(filter),
  ]);
  return response.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
});

router.patch("/:id", async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) return response.status(400).json({ error: "Invalid enquiry ID." });
  const { status } = request.body ?? {};
  if (Object.keys(request.body ?? {}).some((key) => key !== "status") || !statuses.has(status)) {
    return response.status(400).json({ error: "A valid enquiry status is required." });
  }
  const enquiry = await Enquiry.findByIdAndUpdate(
    request.params.id,
    { $set: { status } },
    { new: true, runValidators: true },
  ).select("type name email company phone service message status createdAt updatedAt").lean();
  if (!enquiry) return response.status(404).json({ error: "Enquiry not found." });
  return response.json(enquiry);
});

export default router;
