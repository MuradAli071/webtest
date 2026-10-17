import { Router } from "express";
import Service from "../models/Service.js";
import { publicContentCacheControl } from "../httpCache.js";

const router = Router();

router.get("/", async (_request, response) => {
  response.set("Cache-Control", publicContentCacheControl);
  const services = await Service.find({ published: true })
    .select("-imagePublicId")
    .sort({ order: 1, _id: 1 })
    .lean();
  response.json(services);
});

router.get("/:slug", async (request, response) => {
  response.set("Cache-Control", publicContentCacheControl);
  const service = await Service.findOne({
    slug: request.params.slug,
    published: true,
  }).select("-imagePublicId").lean();

  if (!service) {
    return response.status(404).json({ error: "Service not found." });
  }

  return response.json(service);
});

export default router;
