import { Router } from "express";
import multer from "multer";
import mongoose from "mongoose";
import Project from "../models/Project.js";
import { requireAdmin } from "../middleware/adminAuth.js";
import { deleteProjectImage, isValidImageBuffer, uploadProjectImage } from "../services/imageStorage.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    const allowedTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
      "image/gif",
    ]);
    if (!allowedTypes.has(file.mimetype)) {
      const error = new Error("Upload a JPEG, PNG, WebP, AVIF, or GIF image.");
      error.status = 415;
      return callback(error);
    }
    return callback(null, true);
  },
});
const editableFields = new Set([
  "name",
  "slug",
  "summary",
  "description",
  "category",
  "technologies",
  "client",
  "industry",
  "objectives",
  "outcomes",
  "coverImage",
  "images",
  "links",
  "featured",
  "published",
]);

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function cleanText(value, field, maxLength, { required = false } = {}) {
  if (typeof value !== "string" || (required && !value.trim())) {
    return { error: `${field} must be ${required ? "a non-empty " : "a "}string.` };
  }
  if (value.trim().length > maxLength) {
    return { error: `${field} must be ${maxLength} characters or fewer.` };
  }
  return { value: value.trim() };
}

function validateUrl(value, field, { allowMailto = false } = {}) {
  const result = cleanText(value, field, 1000);
  if (result.error) return result;
  if (!result.value) return result;

  try {
    const url = new URL(result.value);
    const allowed = allowMailto ? ["https:", "http:", "mailto:"] : ["https:", "http:"];
    if (!allowed.includes(url.protocol) || result.value.startsWith("//")) throw new Error();
  } catch {
    return { error: `${field} must be a valid HTTP(S)${allowMailto ? " or mailto" : ""} URL.` };
  }
  return result;
}

function validateImage(image, field) {
  if (image === null && field === "coverImage") return { value: null };
  if (!image || typeof image !== "object" || Array.isArray(image)) {
    return { error: `${field} must be an uploaded image or null.` };
  }
  const url = validateUrl(image.url, `${field}.url`);
  if (url.error || !url.value) return { error: url.error ?? `${field}.url is required.` };
  const publicId = cleanText(image.publicId, `${field}.publicId`, 255, { required: true });
  if (publicId.error) return publicId;
  if (!publicId.value.startsWith("superx/portfolio/")) {
    return { error: `${field} must reference an image uploaded to the portfolio storage folder.` };
  }
  const alt = cleanText(image.alt ?? "", `${field}.alt`, 240);
  if (alt.error) return alt;
  return { value: { url: url.value, publicId: publicId.value, alt: alt.value } };
}

function validateStringArray(value, field, maxCount, maxLength) {
  if (!Array.isArray(value) || value.length > maxCount) {
    return { error: `${field} must be an array with at most ${maxCount} items.` };
  }
  const values = [];
  for (const [index, item] of value.entries()) {
    const result = cleanText(item, `${field}[${index}]`, maxLength, { required: true });
    if (result.error) return result;
    values.push(result.value);
  }
  return { value: [...new Set(values)] };
}

export function validateProjectInput(input, { partial = false } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "A project object is required." };
  }
  const unknown = Object.keys(input).filter((key) => !editableFields.has(key));
  if (unknown.length) return { error: `Unsupported project field: ${unknown.join(", ")}.` };

  const output = {};
  const required = ["name", "summary", "description", "category"];
  for (const field of required) {
    if (!partial && !(field in input)) return { error: `${field} is required.` };
  }

  for (const [field, maxLength] of [
    ["name", 140],
    ["summary", 300],
    ["description", 6000],
    ["category", 100],
    ["client", 140],
    ["industry", 100],
  ]) {
    if (!(field in input)) continue;
    const result = cleanText(input[field], field, maxLength, { required: required.includes(field) });
    if (result.error) return result;
    output[field] = result.value;
  }

  if ("slug" in input || "name" in input) {
    if ("slug" in input && typeof input.slug !== "string") {
      return { error: "slug must be a string." };
    }
    const source = input.slug?.trim() ? input.slug : input.name ?? "";
    const slug = slugify(source);
    if (!slug || slug.length > 140) return { error: "slug must contain 1–140 URL-safe characters." };
    output.slug = slug;
  } else if (!partial) {
    return { error: "slug or name is required." };
  }

  for (const [field, maxCount, maxLength] of [
    ["technologies", 30, 60],
    ["objectives", 20, 500],
    ["outcomes", 20, 500],
  ]) {
    if (!(field in input)) continue;
    const result = validateStringArray(input[field], field, maxCount, maxLength);
    if (result.error) return result;
    output[field] = result.value;
  }

  if ("coverImage" in input) {
    const result = validateImage(input.coverImage, "coverImage");
    if (result.error) return result;
    output.coverImage = result.value;
  }

  if ("images" in input) {
    if (!Array.isArray(input.images) || input.images.length > 12) {
      return { error: "images must contain at most 12 images." };
    }
    const images = [];
    for (const image of input.images) {
      const result = validateImage(image, "images");
      if (result.error) return result;
      images.push(result.value);
    }
    output.images = images;
  }

  if ("links" in input) {
    const links = input.links;
    if (!links || typeof links !== "object" || Array.isArray(links)) {
      return { error: "links must be an object." };
    }
    const unknownLinks = Object.keys(links).filter((key) => !["live", "additional"].includes(key));
    if (unknownLinks.length) return { error: `Unsupported link field: ${unknownLinks.join(", ")}.` };
    const safeLinks = {};
    if ("live" in links) {
      const result = validateUrl(links.live, "links.live");
      if (result.error) return result;
      safeLinks.live = result.value;
    }
    if ("additional" in links) {
      if (!Array.isArray(links.additional) || links.additional.length > 10) {
        return { error: "links.additional must contain at most 10 links." };
      }
      safeLinks.additional = [];
      for (const link of links.additional) {
        if (!link || typeof link !== "object" || Array.isArray(link)) {
          return { error: "Each additional link requires a label and URL." };
        }
        const label = cleanText(link.label, "link label", 80, { required: true });
        const url = validateUrl(link.url, "link URL", { allowMailto: true });
        if (label.error || url.error || !url.value) {
          return { error: label.error ?? url.error ?? "Each additional link requires a URL." };
        }
        safeLinks.additional.push({ label: label.value, url: url.value });
      }
    }
    output.links = safeLinks;
  }

  for (const field of ["featured", "published"]) {
    if (!(field in input)) continue;
    if (typeof input[field] !== "boolean") return { error: `${field} must be true or false.` };
    output[field] = input[field];
  }

  return { value: output };
}

router.use(requireAdmin);

router.get("/", async (_request, response) => {
  const projects = await Project.find().sort({ order: 1, _id: 1 }).lean();
  response.json(projects);
});

router.post("/upload", upload.single("image"), async (request, response) => {
  if (!request.file) {
    return response.status(400).json({ error: "Choose an image file to upload." });
  }
  if (!isValidImageBuffer(request.file.buffer, request.file.mimetype)) {
    return response.status(415).json({ error: "The file contents do not match a supported image type." });
  }
  const image = await uploadProjectImage(request.file.buffer, request.file.originalname);
  return response.status(201).json(image);
});

router.delete("/upload", async (request, response) => {
  const { publicId } = request.body ?? {};
  if (typeof publicId !== "string" || !publicId.startsWith("superx/portfolio/")) {
    return response.status(400).json({ error: "A valid portfolio image public ID is required." });
  }
  await deleteProjectImage(publicId);
  return response.status(204).end();
});

router.post("/", async (request, response) => {
  const result = validateProjectInput(request.body);
  if (result.error) return response.status(400).json({ error: result.error });

  const lastProject = await Project.findOne().sort({ order: -1 }).select("order").lean();
  const project = await Project.create({
    ...result.value,
    order: lastProject ? lastProject.order + 1 : 0,
  });
  return response.status(201).json(project);
});

router.put("/reorder", async (request, response) => {
  const { ids } = request.body ?? {};
  if (!Array.isArray(ids) || ids.some((id) => !mongoose.isValidObjectId(id))) {
    return response.status(400).json({ error: "ids must be an array of project IDs." });
  }
  const projects = await Project.find({ _id: { $in: ids } }).select("_id").lean();
  if (projects.length !== ids.length || new Set(ids).size !== ids.length) {
    return response.status(400).json({ error: "Reorder must include every project exactly once." });
  }

  await Project.bulkWrite(
    ids.map((id, order) => ({
      updateOne: { filter: { _id: id }, update: { $set: { order } } },
    })),
  );
  return response.json(
    await Project.find().sort({ order: 1, _id: 1 }).lean(),
  );
});

router.patch("/:id", async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(400).json({ error: "Invalid project ID." });
  }
  const result = validateProjectInput(request.body, { partial: true });
  if (result.error) return response.status(400).json({ error: result.error });

  const existing = await Project.findById(request.params.id).lean();
  if (!existing) return response.status(404).json({ error: "Project not found." });

  const project = await Project.findByIdAndUpdate(request.params.id, result.value, {
    new: true,
    runValidators: true,
  });
  const retained = new Set([
    project.coverImage?.publicId,
    ...project.images.map((image) => image.publicId),
  ]);
  const removedImages = [
    existing.coverImage,
    ...existing.images,
  ].filter((image) => image && !retained.has(image.publicId));
  const storageWarnings = await deleteRemovedImages(removedImages);

  return response.json({
    project,
    ...(storageWarnings.length ? { storageWarnings } : {}),
  });
});

router.delete("/:id", async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(400).json({ error: "Invalid project ID." });
  }
  const project = await Project.findByIdAndDelete(request.params.id).lean();
  if (!project) return response.status(404).json({ error: "Project not found." });

  const storageWarnings = await deleteRemovedImages([
    project.coverImage,
    ...project.images,
  ]);
  return response.json({
    deleted: true,
    ...(storageWarnings.length ? { storageWarnings } : {}),
  });
});

async function deleteRemovedImages(images) {
  const unique = [...new Map(images.filter(Boolean).map((image) => [image.publicId, image])).values()];
  const results = await Promise.allSettled(
    unique.map((image) => deleteProjectImage(image.publicId)),
  );
  return results.flatMap((result, index) =>
    result.status === "rejected"
      ? [`Could not remove ${unique[index].publicId} from image storage: ${result.reason.message}`]
      : [],
  );
}

export default router;
