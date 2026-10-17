import { Router } from "express";
import multer from "multer";
import SiteContent from "../models/SiteContent.js";
import { requireAdmin } from "../middleware/adminAuth.js";
import { deleteSiteImage, isValidImageBuffer, uploadSiteImage } from "../services/imageStorage.js";

const router = Router();
const topFields = new Set(["brand", "navigation", "homepage", "testimonials", "faqs", "contact", "legal", "seo"]);
const seoPages = new Set(["home", "about", "contact", "services", "work", "privacy", "terms"]);
const navigationFields = new Set(["label", "href", "visible"]);
const siteImageFolders = new Set(["brand", "favicon", "homepage"]);
const upload = multer({
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
const homepageFields = {
  hero: ["eyebrow", "title", "titleAccent", "description", "primaryAction", "primaryHref", "secondaryAction", "secondaryHref", "footnote", "imageUrl", "imagePublicId", "imageAlt"],
  services: ["eyebrow", "title", "titleAccent", "description", "viewAllLabel"],
  work: ["eyebrow", "title", "titleAccent", "description", "viewAllLabel"],
  about: ["visible"],
  testimonials: ["eyebrow", "title", "titleAccent"],
  faqs: ["eyebrow", "title", "titleAccent", "description"],
  contact: ["eyebrow", "title", "titleAccent", "description", "buttonLabel"],
};
const routerFields = new Set(Object.keys(homepageFields));

function plainObject(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { error: `${field} must be an object.` };
  }
  return { value };
}

function cleanText(value, field, maxLength, { required = false } = {}) {
  if (typeof value !== "string" || (required && !value.trim())) {
    return { error: `${field} must be ${required ? "a non-empty " : "a "}string.` };
  }
  const clean = value.trim();
  if (clean.length > maxLength) return { error: `${field} must be ${maxLength} characters or fewer.` };
  return { value: clean };
}

function safeHref(value, field, { externalOnly = false } = {}) {
  const text = cleanText(value, field, 1000, { required: true });
  if (text.error) return text;
  try {
    const url = new URL(text.value, "https://superx.invalid");
    const isExternal = /^https?:\/\//i.test(text.value);
    if (
      text.value.startsWith("//") ||
      (externalOnly && !isExternal) ||
      (isExternal && !["https:", "http:"].includes(url.protocol)) ||
      (!isExternal && !text.value.startsWith("/") && !text.value.startsWith("#"))
    ) throw new Error();
  } catch {
    return { error: `${field} must be a safe internal path or HTTP(S) URL.` };
  }
  return text;
}

function validateImageFields(input, field, folder, { altField } = {}) {
  const output = {};
  for (const key of ["imageUrl", "imagePublicId", ...(altField ? [altField] : [])]) {
    if (!(key in input)) continue;
    if (key === "imageUrl") {
      const result = input[key] ? safeHref(input[key], `${field}.${key}`, { externalOnly: true }) : { value: "" };
      if (result.error) return result;
      output[key] = result.value;
    } else if (key === "imagePublicId") {
      const result = cleanText(input[key], `${field}.${key}`, 255);
      if (result.error) return result;
      const prefix = `superx/site/${folder}/`;
      if (result.value && !result.value.startsWith(prefix)) {
        return { error: `${field}.${key} must reference an image uploaded for this setting.` };
      }
      output[key] = result.value;
    } else {
      const result = cleanText(input[key], `${field}.${key}`, 240);
      if (result.error) return result;
      output[key] = result.value;
    }
  }
  return { value: output };
}

function validateObjectArray(value, field, maxItems, validateItem) {
  if (!Array.isArray(value) || value.length > maxItems) {
    return { error: `${field} must be an array with at most ${maxItems} items.` };
  }
  const items = [];
  for (const [index, item] of value.entries()) {
    const validated = validateItem(item, `${field}[${index}]`);
    if (validated.error) return validated;
    items.push(validated.value);
  }
  return { value: items };
}

function validateHomepage(homepage) {
  const object = plainObject(homepage, "homepage");
  if (object.error) return object;
  const unknown = Object.keys(homepage).filter((key) => !routerFields.has(key));
  if (unknown.length) return { error: `Unsupported homepage section: ${unknown.join(", ")}.` };
  const result = {};
  for (const [sectionName, section] of Object.entries(homepage)) {
    const checked = plainObject(section, `homepage.${sectionName}`);
    if (checked.error) return checked;
    const allowedFields = new Set(homepageFields[sectionName]);
    allowedFields.add("visible");
    const unknownFields = Object.keys(section).filter((key) => !allowedFields.has(key));
    if (unknownFields.length) return { error: `Unsupported homepage field: ${sectionName}.${unknownFields.join(", ")}.` };
    result[sectionName] = {};
    if ("visible" in section) {
      if (typeof section.visible !== "boolean") return { error: `homepage.${sectionName}.visible must be true or false.` };
      result[sectionName].visible = section.visible;
    }
    for (const field of Object.keys(section)) {
      if (field === "visible") continue;
      if (["imageUrl", "imagePublicId", "imageAlt"].includes(field)) continue;
      const maxLength = field.toLowerCase().includes("href")
        ? 1000
        : field === "description"
          ? sectionName === "hero" ? 1500 : 1000
          : field === "eyebrow"
            ? 100
            : field === "footnote"
              ? 200
              : ["primaryAction", "secondaryAction", "viewAllLabel", "buttonLabel"].includes(field)
                ? 80
                : 180;
      const checkedValue = field.toLowerCase().includes("href")
        ? safeHref(section[field], `homepage.${sectionName}.${field}`)
        : cleanText(section[field], `homepage.${sectionName}.${field}`, maxLength);
      if (checkedValue.error) return checkedValue;
      result[sectionName][field] = checkedValue.value;
    }
    if (sectionName === "hero") {
      const imageFields = validateImageFields(section, "homepage.hero", "homepage", { altField: "imageAlt" });
      if (imageFields.error) return imageFields;
      Object.assign(result[sectionName], imageFields.value);
    }
  }
  return { value: result };
}

function validateSiteContent(input) {
  const object = plainObject(input, "Site content");
  if (object.error) return object;
  const unknown = Object.keys(input).filter((key) => !topFields.has(key));
  if (unknown.length) return { error: `Unsupported site content field: ${unknown.join(", ")}.` };
  const output = {};

  if ("brand" in input) {
    const checked = plainObject(input.brand, "brand");
    if (checked.error) return checked;
    const allowed = new Set(["name", "tagline", "logoUrl", "logoPublicId", "faviconUrl", "faviconPublicId"]);
    if (Object.keys(input.brand).some((key) => !allowed.has(key))) return { error: "brand contains an unsupported field." };
    output.brand = {};
    for (const [field, maxLength] of [["name", 80], ["tagline", 240]]) {
      if (!(field in input.brand)) continue;
      const checkedValue = cleanText(input.brand[field], `brand.${field}`, maxLength, { required: field === "name" });
      if (checkedValue.error) return checkedValue;
      output.brand[field] = checkedValue.value;
    }
    for (const [urlField, idField, folder] of [
      ["logoUrl", "logoPublicId", "brand"],
      ["faviconUrl", "faviconPublicId", "favicon"],
    ]) {
      if (urlField in input.brand) {
        const url = input.brand[urlField]
          ? safeHref(input.brand[urlField], `brand.${urlField}`, { externalOnly: true })
          : { value: "" };
        if (url.error) return url;
        output.brand[urlField] = url.value;
      }
      if (idField in input.brand) {
        const id = cleanText(input.brand[idField], `brand.${idField}`, 255);
        if (id.error) return id;
        if (id.value && !id.value.startsWith(`superx/site/${folder}/`)) {
          return { error: `brand.${idField} must reference an image uploaded for this setting.` };
        }
        output.brand[idField] = id.value;
      }
    }
  }

  if ("navigation" in input) {
    const checked = validateObjectArray(input.navigation, "navigation", 12, (item, field) => {
      const checkedObject = plainObject(item, field);
      if (checkedObject.error) return checkedObject;
      const unknownFields = Object.keys(item).filter((key) => !navigationFields.has(key));
      if (unknownFields.length) return { error: `${field} contains unsupported fields.` };
      const label = cleanText(item.label, `${field}.label`, 60, { required: true });
      const href = safeHref(item.href, `${field}.href`);
      if (label.error || href.error || typeof item.visible !== "boolean") {
        return { error: label.error ?? href.error ?? `${field}.visible must be true or false.` };
      }
      return { value: { label: label.value, href: href.value, visible: item.visible } };
    });
    if (checked.error) return checked;
    output.navigation = checked.value;
  }

  if ("homepage" in input) {
    const checked = validateHomepage(input.homepage);
    if (checked.error) return checked;
    output.homepage = checked.value;
  }

  for (const [field, max, properties] of [
    ["faqs", 60, [["question", 240], ["answer", 2400]]],
    ["testimonials", 60, [["quote", 2000], ["name", 120], ["role", 120], ["company", 140]]],
  ]) {
    if (!(field in input)) continue;
    const checked = validateObjectArray(input[field], field, max, (item, name) => {
      const checkedObject = plainObject(item, name);
      if (checkedObject.error) return checkedObject;
      const allowed = new Set([...properties.map(([key]) => key), "published", "order"]);
      if (Object.keys(item).some((key) => !allowed.has(key))) return { error: `${name} contains an unsupported field.` };
      if (typeof item.published !== "boolean" || !Number.isInteger(item.order) || item.order < 0) {
        return { error: `${name} needs a publication status and non-negative integer order.` };
      }
      const result = {};
      for (const [key, limit] of properties) {
        const value = cleanText(item[key] ?? "", `${name}.${key}`, limit, { required: key === "question" || key === "answer" || key === "quote" || key === "name" });
        if (value.error) return value;
        result[key] = value.value;
      }
      return { value: { ...result, published: item.published, order: item.order } };
    });
    if (checked.error) return checked;
    if (new Set(checked.value.map((item) => item.order)).size !== checked.value.length) {
      return { error: `${field} order values must be unique.` };
    }
    output[field] = checked.value;
  }

  if ("contact" in input) {
    const checked = plainObject(input.contact, "contact");
    if (checked.error) return checked;
    const allowed = new Set(["email", "phone", "whatsapp", "address", "socialLinks"]);
    if (Object.keys(input.contact).some((key) => !allowed.has(key))) return { error: "contact contains an unsupported field." };
    output.contact = {};
    for (const [field, maxLength] of [["email", 254], ["phone", 40], ["whatsapp", 24], ["address", 500]]) {
      if (!(field in input.contact)) continue;
      const value = cleanText(input.contact[field], `contact.${field}`, maxLength);
      if (value.error) return value;
      if (field === "email" && value.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.value)) {
        return { error: "contact.email must be a valid email address." };
      }
      if (field === "whatsapp" && value.value && !/^\+?[0-9 ()-]{7,24}$/.test(value.value)) {
        return { error: "contact.whatsapp must be a phone number with an optional leading +." };
      }
      output.contact[field] = value.value;
    }
    if ("socialLinks" in input.contact) {
      const links = validateObjectArray(input.contact.socialLinks, "contact.socialLinks", 20, (link, field) => {
        const label = cleanText(link?.label, `${field}.label`, 60, { required: true });
        const url = safeHref(link?.url, `${field}.url`, { externalOnly: true });
        if (label.error || url.error) return { error: label.error ?? url.error };
        return { value: { label: label.value, url: url.value } };
      });
      if (links.error) return links;
      output.contact.socialLinks = links.value;
    }
  }

  if ("legal" in input) {
    const checked = plainObject(input.legal, "legal");
    if (checked.error) return checked;
    const allowed = new Set(["privacyPolicy", "terms"]);
    if (Object.keys(input.legal).some((key) => !allowed.has(key))) return { error: "legal contains an unsupported field." };
    output.legal = {};
    for (const field of allowed) {
      if (!(field in input.legal)) continue;
      const value = cleanText(input.legal[field], `legal.${field}`, 30000);
      if (value.error) return value;
      output.legal[field] = value.value;
    }
  }

  if ("seo" in input) {
    const checked = plainObject(input.seo, "seo");
    if (checked.error) return checked;
    const allowed = new Set(["title", "description", "imageUrl", "imagePublicId", "pages"]);
    if (Object.keys(input.seo).some((key) => !allowed.has(key))) return { error: "seo contains an unsupported field." };
    output.seo = {};
    for (const [field, maxLength] of [["title", 180], ["description", 320]]) {
      if (!(field in input.seo)) continue;
      const value = cleanText(input.seo[field], `seo.${field}`, maxLength);
      if (value.error) return value;
      output.seo[field] = value.value;
    }
    if ("pages" in input.seo) {
      const pages = plainObject(input.seo.pages, "seo.pages");
      if (pages.error) return pages;
      if (Object.keys(input.seo.pages).some((page) => !seoPages.has(page))) {
        return { error: "seo.pages contains an unsupported page." };
      }
      output.seo.pages = {};
      for (const [page, metadata] of Object.entries(input.seo.pages)) {
        const checkedMetadata = plainObject(metadata, `seo.pages.${page}`);
        if (checkedMetadata.error) return checkedMetadata;
        if (Object.keys(metadata).some((field) => !["title", "description"].includes(field))) {
          return { error: `seo.pages.${page} contains an unsupported field.` };
        }
        output.seo.pages[page] = {};
        for (const [field, limit] of [["title", 180], ["description", 320]]) {
          if (!(field in metadata)) continue;
          const value = cleanText(metadata[field], `seo.pages.${page}.${field}`, limit);
          if (value.error) return value;
          output.seo.pages[page][field] = value.value;
        }
      }
    }
    const imageFields = validateImageFields(input.seo, "seo", "homepage");
    if (imageFields.error) return imageFields;
    for (const field of ["imageUrl", "imagePublicId"]) {
      if (field in imageFields.value) output.seo[field] = imageFields.value[field];
    }
  }

  return { value: output };
}

router.use(requireAdmin);

router.post("/upload", upload.single("image"), async (request, response) => {
  if (!request.file) return response.status(400).json({ error: "Choose an image file to upload." });
  const assetFolders = { logo: "brand", favicon: "favicon", hero: "homepage", seo: "homepage" };
  const folder = assetFolders[request.body?.asset];
  if (!folder || !siteImageFolders.has(folder)) {
    return response.status(400).json({ error: "Choose a valid site image type." });
  }
  if (!isValidImageBuffer(request.file.buffer, request.file.mimetype)) {
    return response.status(415).json({ error: "The file contents do not match a supported image type." });
  }
  const image = await uploadSiteImage(request.file.buffer, request.file.originalname, folder);
  return response.status(201).json(image);
});

router.delete("/upload", async (request, response) => {
  const { publicId } = request.body ?? {};
  if (typeof publicId !== "string" || !publicId.startsWith("superx/site/")) {
    return response.status(400).json({ error: "A valid site image public ID is required." });
  }
  const content = await SiteContent.findOne({ key: "site" }).lean();
  const referencedIds = collectSiteImageIds(content);
  if (referencedIds.has(publicId)) {
    return response.status(409).json({ error: "This image is still in use by published site settings." });
  }
  await deleteSiteImage(publicId);
  return response.status(204).end();
});

router.get("/", async (_request, response) => {
  const content = await SiteContent.findOne({ key: "site" }).lean();
  response.json(content ?? {
    brand: { name: "SUPERX", tagline: "", logoUrl: "", logoPublicId: "", faviconUrl: "", faviconPublicId: "" },
    navigation: [],
    homepage: {},
    testimonials: [],
    faqs: [],
    contact: { email: "", phone: "", address: "", socialLinks: [] },
    legal: { privacyPolicy: "", terms: "" },
    seo: { title: "", description: "", imageUrl: "", imagePublicId: "" },
  });
});

function collectSiteImageIds(content) {
  return new Set([
    content?.brand?.logoPublicId,
    content?.brand?.faviconPublicId,
    content?.homepage?.hero?.imagePublicId,
    content?.seo?.imagePublicId,
  ].filter(Boolean));
}

router.put("/", async (request, response) => {
  const result = validateSiteContent(request.body);
  if (result.error) return response.status(400).json({ error: result.error });
  const previous = await SiteContent.findOne({ key: "site" }).lean();
  const content = await SiteContent.findOneAndUpdate(
    { key: "site" },
    { $set: result.value },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  ).lean();
  const retained = collectSiteImageIds(content);
  const removed = [...collectSiteImageIds(previous)].filter((publicId) => !retained.has(publicId));
  const cleanup = await Promise.allSettled(removed.map((publicId) => deleteSiteImage(publicId)));
  const storageWarnings = cleanup.flatMap((result, index) =>
    result.status === "rejected"
      ? [`Could not remove an unused image from storage: ${result.reason.message}`]
      : [],
  );
  return response.json({ ...content, ...(storageWarnings.length ? { storageWarnings } : {}) });
});

export { validateSiteContent };
export default router;
