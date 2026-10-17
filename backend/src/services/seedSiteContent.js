import ContentSetting from "../models/ContentSetting.js";
import SiteContent from "../models/SiteContent.js";
import { defaultSiteContent } from "./defaultSiteContent.js";

const seedMarker = "initial-site-content-v1";

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function siteContentPatch(content) {
  const patch = {};
  const setIfEmpty = (path, current, fallback) => {
    if (hasText(fallback) && !hasText(current)) patch[path] = fallback;
  };

  setIfEmpty("brand.name", content.brand?.name, defaultSiteContent.brand.name);
  setIfEmpty("brand.tagline", content.brand?.tagline, defaultSiteContent.brand.tagline);

  for (const [section, defaults] of Object.entries(defaultSiteContent.homepage)) {
    for (const [field, fallback] of Object.entries(defaults)) {
      if (typeof fallback === "string") {
        setIfEmpty(`homepage.${section}.${field}`, content.homepage?.[section]?.[field], fallback);
      }
    }
  }

  for (const [field, fallback] of Object.entries(defaultSiteContent.seo)) {
    if (field === "pages" || typeof fallback !== "string") continue;
    setIfEmpty(`seo.${field}`, content.seo?.[field], fallback);
  }
  for (const [page, defaults] of Object.entries(defaultSiteContent.seo.pages)) {
    for (const [field, fallback] of Object.entries(defaults)) {
      setIfEmpty(`seo.pages.${page}.${field}`, content.seo?.pages?.[page]?.[field], fallback);
    }
  }

  if (!content.navigation?.length) patch.navigation = defaultSiteContent.navigation;
  if (!content.faqs?.length) patch.faqs = defaultSiteContent.faqs;
  if (!content.testimonials?.length) patch.testimonials = defaultSiteContent.testimonials;
  return patch;
}

export async function seedSiteContentOnce() {
  if (await ContentSetting.exists({ key: seedMarker })) return;

  const content = await SiteContent.findOne({ key: "site" }).lean();
  if (!content) {
    await SiteContent.create(defaultSiteContent);
  } else {
    const patch = siteContentPatch(content);
    if (Object.keys(patch).length) {
      await SiteContent.updateOne({ key: "site" }, { $set: patch });
    }
  }

  await ContentSetting.create({ key: seedMarker, value: new Date().toISOString() });
}
