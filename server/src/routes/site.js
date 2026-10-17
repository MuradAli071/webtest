import { Router } from "express";
import SiteContent from "../models/SiteContent.js";
import { publicContentCacheControl } from "../httpCache.js";

const router = Router();
const homepageFields = {
  hero: ["visible", "eyebrow", "title", "titleAccent", "description", "primaryAction", "primaryHref", "secondaryAction", "secondaryHref", "footnote", "imageUrl", "imageAlt"],
  services: ["visible", "eyebrow", "title", "titleAccent", "description", "viewAllLabel"],
  work: ["visible", "eyebrow", "title", "titleAccent", "description", "viewAllLabel"],
  about: ["visible"],
  testimonials: ["visible", "eyebrow", "title", "titleAccent"],
  faqs: ["visible", "eyebrow", "title", "titleAccent", "description"],
  contact: ["visible", "eyebrow", "title", "titleAccent", "description", "buttonLabel"],
};

function pickFields(value, fields) {
  return Object.fromEntries(fields.filter((field) => field in (value ?? {})).map((field) => [field, value[field]]));
}

export function toPublicSiteContent(content) {
  const value = content ?? {};
  return {
    brand: pickFields(value.brand ?? { name: "SUPERX", tagline: "", logoUrl: "", faviconUrl: "" }, ["name", "tagline", "logoUrl", "faviconUrl"]),
    navigation: (value.navigation ?? []).filter((item) => item.visible)
      .map((item) => pickFields(item, ["label", "href"])),
    homepage: Object.fromEntries(Object.entries(homepageFields)
      .filter(([section]) => value.homepage?.[section])
      .map(([section, fields]) => [section, pickFields(value.homepage[section], fields)])),
    testimonials: (value.testimonials ?? [])
      .filter((item) => item.published)
      .sort((a, b) => a.order - b.order)
      .map((item) => pickFields(item, ["quote", "name", "role", "company", "order"])),
    faqs: (value.faqs ?? [])
      .filter((item) => item.published)
      .sort((a, b) => a.order - b.order)
      .map((item) => pickFields(item, ["question", "answer", "order"])),
    contact: {
      ...pickFields(value.contact ?? { email: "", phone: "", whatsapp: "", address: "" }, ["email", "phone", "whatsapp", "address"]),
      socialLinks: (value.contact?.socialLinks ?? []).map((item) => pickFields(item, ["label", "url"])),
    },
    seo: {
      ...pickFields(value.seo ?? {}, ["title", "description", "imageUrl"]),
      pages: Object.fromEntries(
        ["home", "about", "contact", "services", "work", "privacy", "terms"]
          .map((page) => [page, pickFields(value.seo?.pages?.[page] ?? {}, ["title", "description"])]),
      ),
    },
    legalAvailable: {
      privacyPolicy: Boolean(value.legal?.privacyPolicy),
      terms: Boolean(value.legal?.terms),
    },
  };
}

router.get("/", async (_request, response) => {
  response.set("Cache-Control", publicContentCacheControl);
  const content = await SiteContent.findOne({ key: "site" }).lean();
  response.json(toPublicSiteContent(content));
});

router.get("/legal/:type", async (request, response) => {
  if (!["privacy-policy", "terms"].includes(request.params.type)) {
    return response.status(404).json({ error: "Legal document not found." });
  }
  response.set("Cache-Control", publicContentCacheControl);
  const content = await SiteContent.findOne({ key: "site" }).select("legal").lean();
  const field = request.params.type === "privacy-policy" ? "privacyPolicy" : "terms";
  const body = content?.legal?.[field] ?? "";
  if (!body) return response.status(404).json({ error: "This legal document has not been published." });
  return response.json({ type: request.params.type, body });
});

export default router;
