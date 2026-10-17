import { Router } from "express";
import Project from "../models/Project.js";
import { publicContentCacheControl } from "../httpCache.js";

const router = Router();

router.get("/", async (_request, response) => {
  response.set("Cache-Control", publicContentCacheControl);
  const projects = await Project.find({ published: true })
    .sort({ order: 1, _id: 1 })
    .lean();
  response.json(projects);
});

router.get("/:slug", async (request, response) => {
  response.set("Cache-Control", publicContentCacheControl);
  const project = await Project.findOne({
    slug: request.params.slug,
    published: true,
  }).lean();

  if (!project) {
    return response.status(404).json({ error: "Project not found." });
  }

  return response.json(project);
});

export default router;
