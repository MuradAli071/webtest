import { Router } from "express";
import multer from "multer";
import AboutContent from "../models/AboutContent.js";
import { requireAdmin } from "../middleware/adminAuth.js";
import { deleteAboutImage, isValidImageBuffer, uploadAboutImage } from "../services/imageStorage.js";

const SECTION_KEYS = [
  "introduction",
  "missionVision",
  "approach",
  "team",
  "achievements",
  "cta",
];
const SECTION_FIELDS = new Set([
  "key", "visible", "order", "eyebrow", "title", "body", "image",
  "missionTitle", "missionBody", "visionTitle", "visionBody",
  "steps", "members", "achievements", "buttonLabel", "buttonHref",
]);
const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    const allowedTypes = new Set([
      "image/jpeg", "image/png", "image/webp", "image/avif", "image/gif",
    ]);
    if (!allowedTypes.has(file.mimetype)) {
      const error = new Error("Upload a JPEG, PNG, WebP, AVIF, or GIF image.");
      error.status = 415;
      return callback(error);
    }
    return callback(null, true);
  },
});

function cleanString(value, field, maxLength, { required = false } = {}) {
  if (typeof value !== "string" || (required && !value.trim())) {
    return { error: `${field} must be ${required ? "a non-empty " : "a "}string.` };
  }
  const clean = value.trim();
  if (clean.length > maxLength) return { error: `${field} must be ${maxLength} characters or fewer.` };
  return { value: clean };
}

function validateImage(image, field) {
  if (image === null) return { value: null };
  if (!image || typeof image !== "object" || Array.isArray(image)) {
    return { error: `${field} must be an uploaded image or null.` };
  }
  const url = cleanString(image.url, `${field}.url`, 1000, { required: true });
  const publicId = cleanString(image.publicId, `${field}.publicId`, 255, { required: true });
  const alt = cleanString(image.alt ?? "", `${field}.alt`, 240);
  if (url.error || publicId.error || alt.error) return { error: url.error ?? publicId.error ?? alt.error };
  try {
    if (new URL(url.value).protocol !== "https:") throw new Error();
  } catch {
    return { error: `${field}.url must be a valid HTTPS URL.` };
  }
  if (!publicId.value.startsWith("superx/about/")) {
    return { error: `${field} must reference an image uploaded to the About image folder.` };
  }
  return { value: { url: url.value, publicId: publicId.value, alt: alt.value } };
}

function validateList(value, field, maxCount, validateItem) {
  if (!Array.isArray(value) || value.length > maxCount) {
    return { error: `${field} must be an array with at most ${maxCount} items.` };
  }
  const result = [];
  for (const [index, item] of value.entries()) {
    const validated = validateItem(item, `${field}[${index}]`);
    if (validated.error) return validated;
    result.push(validated.value);
  }
  return { value: result };
}

function validateAboutInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input) || !Array.isArray(input.sections)) {
    return { error: "An About page object with sections is required." };
  }
  const unknownTopLevel = Object.keys(input).filter((field) => field !== "sections");
  if (unknownTopLevel.length) {
    return { error: `Unsupported About page field: ${unknownTopLevel.join(", ")}.` };
  }
  if (input.sections.length !== SECTION_KEYS.length) {
    return { error: "All About page sections must be included." };
  }
  const seen = new Set();
  const sections = [];
  for (const section of input.sections) {
    if (!section || typeof section !== "object" || Array.isArray(section)) {
      return { error: "Each About page section must be an object." };
    }
    const unknown = Object.keys(section).filter((field) => !SECTION_FIELDS.has(field));
    if (unknown.length) return { error: `Unsupported About section field: ${unknown.join(", ")}.` };
    if (!SECTION_KEYS.includes(section.key) || seen.has(section.key)) {
      return { error: "About page sections must have unique supported keys." };
    }
    seen.add(section.key);
    if (typeof section.visible !== "boolean" || !Number.isInteger(section.order) || section.order < 0) {
      return { error: `Section ${section.key} needs a visibility setting and valid order.` };
    }
    const output = { key: section.key, visible: section.visible, order: section.order };
    for (const [field, maxLength] of [
      ["eyebrow", 80], ["title", 180], ["body", 4000],
      ["missionTitle", 120], ["missionBody", 1600],
      ["visionTitle", 120], ["visionBody", 1600],
      ["buttonLabel", 80], ["buttonHref", 1000],
    ]) {
      if (!(field in section)) continue;
      const value = cleanString(section[field], `${section.key}.${field}`, maxLength);
      if (value.error) return value;
      output[field] = value.value;
    }
    if ("image" in section) {
      const image = validateImage(section.image, `${section.key}.image`);
      if (image.error) return image;
      output.image = image.value;
    }
    for (const field of ["steps", "members", "achievements"]) {
      if (!(field in section)) continue;
      const limits = { steps: 12, members: 40, achievements: 30 }[field];
      const list = validateList(section[field], `${section.key}.${field}`, limits, (item, name) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          return { error: `${name} must be an object.` };
        }
        if (field === "steps") {
          const title = cleanString(item.title ?? "", `${name}.title`, 120);
          const description = cleanString(item.description ?? "", `${name}.description`, 600);
          if (title.error || description.error) return { error: title.error ?? description.error };
          return { value: { title: title.value, description: description.value } };
        }
        if (field === "members") {
          const nameValue = cleanString(item.name, `${name}.name`, 120, { required: true });
          const role = cleanString(item.role ?? "", `${name}.role`, 120);
          const bio = cleanString(item.bio ?? "", `${name}.bio`, 1200);
          const image = validateImage(item.image ?? null, `${name}.image`);
          if (nameValue.error || role.error || bio.error || image.error) {
            return { error: nameValue.error ?? role.error ?? bio.error ?? image.error };
          }
          return { value: { name: nameValue.value, role: role.value, bio: bio.value, image: image.value } };
        }
        const label = cleanString(item.label, `${name}.label`, 120, { required: true });
        const value = cleanString(item.value ?? "", `${name}.value`, 80);
        const description = cleanString(item.description ?? "", `${name}.description`, 500);
        if (label.error || value.error || description.error) {
          return { error: label.error ?? value.error ?? description.error };
        }
        return { value: { label: label.value, value: value.value, description: description.value } };
      });
      if (list.error) return list;
      output[field] = list.value;
    }
    sections.push(output);
  }
  if (SECTION_KEYS.some((key) => !seen.has(key)) || new Set(sections.map((section) => section.order)).size !== SECTION_KEYS.length) {
    return { error: "Every About page section must have a unique order." };
  }
  for (const section of sections) {
    if (section.key === "cta" && section.buttonHref) {
      const href = section.buttonHref;
      try {
        if (href.startsWith("/") && !href.startsWith("//")) continue;
        const parsed = new URL(href);
        if (!["http:", "https:", "mailto:"].includes(parsed.protocol)) throw new Error();
      } catch {
        return { error: "cta.buttonHref must be a safe relative, HTTP(S), or mailto link." };
      }
    }
  }
  return { value: sections.sort((a, b) => a.order - b.order) };
}

function collectImages(sections) {
  return sections.flatMap((section) => [
    section.image,
    ...(section.members ?? []).map((member) => member.image),
  ].filter(Boolean));
}

router.use(requireAdmin);

router.get("/", async (_request, response) => {
  const content = await AboutContent.findOne({ key: "about" }).lean();
  response.json(content?.sections ?? SECTION_KEYS.map((key, order) => ({
    key, order, visible: false, steps: [], members: [], achievements: [],
  })));
});

router.post("/upload", upload.single("image"), async (request, response) => {
  if (!request.file) return response.status(400).json({ error: "Choose an image file to upload." });
  if (!isValidImageBuffer(request.file.buffer, request.file.mimetype)) {
    return response.status(415).json({ error: "The file contents do not match a supported image type." });
  }
  const image = await uploadAboutImage(request.file.buffer, request.file.originalname);
  return response.status(201).json(image);
});

router.delete("/upload", async (request, response) => {
  const { publicId } = request.body ?? {};
  if (typeof publicId !== "string" || !publicId.startsWith("superx/about/")) {
    return response.status(400).json({ error: "A valid About image public ID is required." });
  }
  await deleteAboutImage(publicId);
  return response.status(204).end();
});

router.put("/", async (request, response) => {
  const validated = validateAboutInput(request.body);
  if (validated.error) return response.status(400).json({ error: validated.error });

  const existing = await AboutContent.findOne({ key: "about" }).lean();
  const content = await AboutContent.findOneAndUpdate(
    { key: "about" },
    { $set: { sections: validated.value } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  ).lean();
  const retained = new Set(collectImages(content.sections).map((image) => image.publicId));
  const removed = collectImages(existing?.sections ?? []).filter((image) => !retained.has(image.publicId));
  const uniqueRemoved = [...new Map(removed.map((image) => [image.publicId, image])).values()];
  const cleanup = await Promise.allSettled(uniqueRemoved.map((image) => deleteAboutImage(image.publicId)));
  const storageWarnings = cleanup.flatMap((result, index) =>
    result.status === "rejected"
      ? [`Could not remove ${uniqueRemoved[index].publicId} from image storage: ${result.reason.message}`]
      : [],
  );
  return response.json({
    sections: content.sections,
    ...(storageWarnings.length ? { storageWarnings } : {}),
  });
});

export { validateAboutInput };
export default router;
