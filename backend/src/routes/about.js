import { Router } from "express";
import AboutContent from "../models/AboutContent.js";
import { publicContentCacheControl } from "../httpCache.js";

const router = Router();

router.get("/", async (_request, response) => {
  response.set("Cache-Control", publicContentCacheControl);
  const about = await AboutContent.findOne({ key: "about" }).lean();
  response.json(
    (about?.sections ?? [])
      .filter((section) => section.visible)
      .sort((left, right) => left.order - right.order),
  );
});

export default router;
