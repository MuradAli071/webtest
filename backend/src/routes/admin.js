import bcrypt from "bcryptjs";
import { Router } from "express";
import multer from "multer";
import { rateLimit } from "express-rate-limit";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Enquiry from "../models/Enquiry.js";
import Project from "../models/Project.js";
import Service from "../models/Service.js";
import { adminCookieName, requireAdmin } from "../middleware/adminAuth.js";
import { deleteServiceImage, isValidImageBuffer, uploadServiceImage } from "../services/imageStorage.js";

const router = Router();
const iconValues = new Set([
  "bot",
  "film",
  "globe",
  "smartphone",
  "palette",
  "megaphone",
]);
const editableFields = new Set([
  "title",
  "description",
  "slug",
  "icon",
  "imageUrl",
  "imagePublicId",
  "published",
  "cta",
]);
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Please try again later." },
});
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);
    if (!allowedTypes.has(file.mimetype)) {
      const error = new Error("Upload a JPEG, PNG, WebP, AVIF, or GIF image.");
      error.status = 415;
      return callback(error);
    }
    return callback(null, true);
  },
});

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function validateServiceInput(input, { partial = false } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "A service object is required." };
  }

  const unknownFields = Object.keys(input).filter(
    (field) => !editableFields.has(field),
  );
  if (unknownFields.length) {
    return { error: `Unsupported service field: ${unknownFields.join(", ")}.` };
  }

  const output = {};
  const requiredFields = ["title", "description", "cta"];
  if (!partial) requiredFields.push("icon");
  for (const field of requiredFields) {
    if (!(field in input)) return { error: `${field} is required.` };
  }

  if ("title" in input) {
    if (typeof input.title !== "string" || !input.title.trim()) {
      return { error: "title must be a non-empty string." };
    }
    if (input.title.trim().length > 120) {
      return { error: "title must be 120 characters or fewer." };
    }
    output.title = input.title.trim();
  }

  if ("description" in input) {
    if (typeof input.description !== "string" || !input.description.trim()) {
      return { error: "description must be a non-empty string." };
    }
    if (input.description.trim().length > 2400) {
      return { error: "description must be 2400 characters or fewer." };
    }
    output.description = input.description.trim();
  }

  if ("slug" in input || "title" in input) {
    if ("slug" in input && typeof input.slug !== "string") {
      return { error: "slug must be a string." };
    }
    const slugSource = input.slug?.trim() ? input.slug : input.title ?? "";
    const slug = slugify(slugSource);
    if (!slug || slug.length > 120) {
      return { error: "slug must contain between 1 and 120 URL-safe characters." };
    }
    output.slug = slug;
  } else if (!partial) {
    return { error: "slug or title is required." };
  }

  if ("icon" in input) {
    if (typeof input.icon !== "string" || !iconValues.has(input.icon)) {
      return { error: "icon must be one of the supported service icons." };
    }
    output.icon = input.icon;
  } else if (!partial) {
    return { error: "icon is required." };
  }

  if ("imageUrl" in input) {
    if (typeof input.imageUrl !== "string" || input.imageUrl.length > 1000) {
      return { error: "imageUrl must be a URL string of 1000 characters or fewer." };
    }
    if (input.imageUrl) {
      try {
        const imageUrl = new URL(input.imageUrl);
        if (!["https:", "http:"].includes(imageUrl.protocol)) throw new Error();
      } catch {
        return { error: "imageUrl must be a valid HTTP or HTTPS URL." };
      }
    }
    output.imageUrl = input.imageUrl.trim();
  }

  if ("imagePublicId" in input) {
    if (typeof input.imagePublicId !== "string" || input.imagePublicId.length > 255 ||
      (input.imagePublicId && !input.imagePublicId.startsWith("superx/services/"))) {
      return { error: "imagePublicId must reference an image uploaded to the service image folder." };
    }
    output.imagePublicId = input.imagePublicId.trim();
  }

  if ("published" in input) {
    if (typeof input.published !== "boolean") {
      return { error: "published must be true or false." };
    }
    output.published = input.published;
  }

  if ("cta" in input) {
    const { cta } = input;
    if (
      !cta ||
      typeof cta !== "object" ||
      typeof cta.label !== "string" ||
      !cta.label.trim() ||
      typeof cta.href !== "string" ||
      !cta.href.trim()
    ) {
      return { error: "cta requires a label and href." };
    }
    if (cta.label.trim().length > 80 || cta.href.trim().length > 1000) {
      return { error: "CTA label or link exceeds the allowed length." };
    }
    if (
      cta.href.trim().startsWith("//") ||
      !(
        cta.href.trim().startsWith("/") ||
        cta.href.trim().startsWith("#") ||
        /^https?:\/\//i.test(cta.href.trim()) ||
        /^mailto:/i.test(cta.href.trim())
      )
    ) {
      return { error: "CTA links must be an internal path, anchor, HTTP(S), or mailto URL." };
    }
    output.cta = { label: cta.label.trim(), href: cta.href.trim() };
  } else if (!partial) {
    return { error: "cta is required." };
  }

  return { value: output };
}

router.post("/login", loginLimiter, async (request, response) => {
  const { email, password } = request.body ?? {};
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !process.env.ADMIN_EMAIL ||
    !process.env.ADMIN_PASSWORD
  ) {
    return response.status(400).json({ error: "Email and password are required." });
  }

  const validPassword = await bcrypt.compare(
    password,
    request.app.locals.adminPasswordHash,
  );
  const validEmail =
    email.trim().toLowerCase() === process.env.ADMIN_EMAIL.trim().toLowerCase();

  if (!validEmail || !validPassword) {
    return response.status(401).json({ error: "Email or password is incorrect." });
  }

  const token = jwt.sign(
    { role: "admin", email: process.env.ADMIN_EMAIL },
    process.env.JWT_SECRET,
    { algorithm: "HS256", expiresIn: "12h" },
  );
  response.cookie(adminCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/admin",
    maxAge: 12 * 60 * 60 * 1000,
  });
  return response.json({ authenticated: true });
});

router.post("/logout", (_request, response) => {
  response.clearCookie(adminCookieName, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/admin",
  });
  return response.status(204).end();
});

router.get("/session", requireAdmin, (_request, response) => {
  response.json({ authenticated: true });
});

router.use(requireAdmin);

router.post("/services/upload", imageUpload.single("image"), async (request, response) => {
  if (!request.file) return response.status(400).json({ error: "Choose an image file to upload." });
  if (!isValidImageBuffer(request.file.buffer, request.file.mimetype)) {
    return response.status(415).json({ error: "The file contents do not match a supported image type." });
  }
  const image = await uploadServiceImage(request.file.buffer, request.file.originalname);
  return response.status(201).json(image);
});

router.delete("/services/upload", async (request, response) => {
  const { publicId } = request.body ?? {};
  if (typeof publicId !== "string" || !publicId.startsWith("superx/services/")) {
    return response.status(400).json({ error: "A valid service image public ID is required." });
  }
  if (await Service.exists({ imagePublicId: publicId })) {
    return response.status(409).json({ error: "This image is still in use by a service." });
  }
  await deleteServiceImage(publicId);
  return response.status(204).end();
});

router.get("/dashboard", async (_request, response) => {
  const [
    services,
    publishedServices,
    projects,
    publishedProjects,
    enquiries,
    newEnquiries,
  ] = await Promise.all([
    Service.countDocuments(),
    Service.countDocuments({ published: true }),
    Project.countDocuments(),
    Project.countDocuments({ published: true }),
    Enquiry.countDocuments(),
    Enquiry.countDocuments({ status: "new" }),
  ]);
  return response.json({
    services: { total: services, published: publishedServices },
    projects: { total: projects, published: publishedProjects },
    enquiries: { total: enquiries, new: newEnquiries },
  });
});

router.get("/services", async (_request, response) => {
  const services = await Service.find().sort({ order: 1, _id: 1 }).lean();
  response.json(services);
});

router.post("/services", async (request, response) => {
  const result = validateServiceInput(request.body);
  if (result.error) return response.status(400).json({ error: result.error });

  const lastService = await Service.findOne().sort({ order: -1 }).select("order").lean();
  const order = lastService ? lastService.order + 1 : 0;
  const service = await Service.create({ ...result.value, order });
  return response.status(201).json(service);
});

router.put("/services/reorder", async (request, response) => {
  const { ids } = request.body ?? {};
  if (!Array.isArray(ids) || ids.some((id) => !mongoose.isValidObjectId(id))) {
    return response.status(400).json({ error: "ids must be an array of service IDs." });
  }

  const services = await Service.find({ _id: { $in: ids } }).select("_id").lean();
  if (services.length !== ids.length || new Set(ids).size !== ids.length) {
    return response.status(400).json({ error: "Reorder must include each service exactly once." });
  }

  await Service.bulkWrite(
    ids.map((id, order) => ({
      updateOne: { filter: { _id: id }, update: { $set: { order } } },
    })),
  );
  const updatedServices = await Service.find().sort({ order: 1, _id: 1 }).lean();
  return response.json(updatedServices);
});

router.patch("/services/:id", async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(400).json({ error: "Invalid service ID." });
  }

  const result = validateServiceInput(request.body, { partial: true });
  if (result.error) return response.status(400).json({ error: result.error });

  const existing = await Service.findById(request.params.id).lean();
  const service = await Service.findByIdAndUpdate(request.params.id, result.value, {
    new: true,
    runValidators: true,
  });
  if (!service) return response.status(404).json({ error: "Service not found." });
  let storageWarning;
  if (existing?.imagePublicId && existing.imagePublicId !== service.imagePublicId) {
    try {
      await deleteServiceImage(existing.imagePublicId);
    } catch (error) {
      storageWarning = `Service saved, but the old image could not be removed: ${error.message}`;
    }
  }
  return response.json({ ...service.toObject(), ...(storageWarning ? { storageWarning } : {}) });
});

router.delete("/services/:id", async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(400).json({ error: "Invalid service ID." });
  }
  const service = await Service.findByIdAndDelete(request.params.id);
  if (!service) return response.status(404).json({ error: "Service not found." });
  let storageWarning;
  if (service.imagePublicId) {
    try {
      await deleteServiceImage(service.imagePublicId);
    } catch (error) {
      storageWarning = `Service deleted, but its image could not be removed: ${error.message}`;
    }
  }
  return response.json({ ...(storageWarning ? { storageWarning } : {}) });
});

export default router;
