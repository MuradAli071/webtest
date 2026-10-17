import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import express from "express";
import AboutContent from "./models/AboutContent.js";
import Project from "./models/Project.js";
import Service from "./models/Service.js";
import SiteContent from "./models/SiteContent.js";

const buildDirectory = fileURLToPath(new URL("../../client/dist/", import.meta.url));
const indexFile = fileURLToPath(new URL("../../client/dist/index.html", import.meta.url));
const defaultMetadata = {
  home: {
    title: "Digital solutions for ambitious ideas",
    description: "Explore SUPERX Technology's digital services, published work and ways to get in touch.",
  },
  about: {
    title: "About",
    description: "Learn about SUPERX Technology, our approach and the company information we have published.",
  },
  contact: {
    title: "Contact",
    description: "Contact SUPERX Technology or send a project enquiry to discuss your goals and requirements.",
  },
  services: {
    title: "Services",
    description: "Explore the digital services currently offered by SUPERX Technology.",
  },
  work: {
    title: "Selected work",
    description: "Explore project stories published by SUPERX Technology.",
  },
  privacy: {
    title: "Privacy Policy",
    description: "Read the SUPERX Technology privacy policy.",
  },
  terms: {
    title: "Terms",
    description: "Read the SUPERX Technology terms and conditions.",
  },
  notFound: {
    title: "Page not found",
    description: "The page you requested could not be found on the SUPERX Technology website.",
  },
  admin: {
    title: "Administrator",
    description: "SUPERX Technology administrator pages.",
  },
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function setMeta(html, attribute, key, content) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<meta\\b(?=[^>]*\\b${attribute}=["']${escapedKey}["'])[^>]*>`, "i");
  const tag = `<meta ${attribute}="${escapeHtml(key)}" content="${escapeHtml(content)}" />`;
  return pattern.test(html)
    ? html.replace(pattern, tag)
    : html.replace("</head>", `  ${tag}\n  </head>`);
}

export function applyFrontendMetadata(html, metadata) {
  let output = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(metadata.title)}</title>`);
  for (const [attribute, key, value] of [
    ["name", "description", metadata.description],
    ["name", "robots", metadata.noIndex ? "noindex, nofollow" : "index, follow"],
    ["property", "og:type", "website"],
    ["property", "og:site_name", metadata.siteName],
    ["property", "og:title", metadata.title],
    ["property", "og:description", metadata.description],
    ["property", "og:image", metadata.imageUrl],
    ["property", "og:url", metadata.canonicalUrl],
    ["name", "twitter:card", metadata.imageUrl ? "summary_large_image" : "summary"],
    ["name", "twitter:title", metadata.title],
    ["name", "twitter:description", metadata.description],
    ["name", "twitter:image", metadata.imageUrl],
  ]) {
    output = setMeta(output, attribute, key, value ?? "");
  }
  const canonicalTag = `<link rel="canonical" href="${escapeHtml(metadata.canonicalUrl)}" />`;
  const canonicalPattern = /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i;
  output = canonicalPattern.test(output)
    ? output.replace(canonicalPattern, canonicalTag)
    : output.replace("</head>", `  ${canonicalTag}\n  </head>`);
  return output;
}

function originForRequest(request) {
  const configured = process.env.SITE_URL?.trim();
  if (!configured && process.env.NODE_ENV === "production") {
    throw new Error("SITE_URL must be configured in production.");
  }
  const host = request.get("x-forwarded-host") || request.get("host");
  const protocol = request.get("x-forwarded-proto") || request.protocol;
  const origin = new URL(configured || `${protocol}://${host}`);
  if (
    !["http:", "https:"].includes(origin.protocol) ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash
  ) {
    throw new Error("SITE_URL must be an absolute HTTP or HTTPS origin without a path.");
  }
  return origin.origin;
}

function identifyPage(pathname) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (path === "/") return { key: "home" };
  if (path === "/admin" || path.startsWith("/admin/")) return { key: "admin", noIndex: true };
  if (path === "/about") return { key: "about" };
  if (path === "/contact") return { key: "contact" };
  if (path === "/services") return { key: "services" };
  if (path === "/work") return { key: "work" };
  if (path === "/privacy") return { key: "privacy", legalField: "privacyPolicy" };
  if (path === "/terms") return { key: "terms", legalField: "terms" };
  const service = path.match(/^\/services\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);
  if (service) return { key: "services", slug: service[1], detailType: "service" };
  const project = path.match(/^\/work\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);
  if (project) return { key: "work", slug: project[1], detailType: "project" };
  return { key: "notFound", noIndex: true, notFound: true };
}

async function getMetadata(request) {
  const page = identifyPage(request.path);
  const origin = originForRequest(request);
  const canonicalUrl = `${origin}${request.path.length > 1 ? request.path.replace(/\/+$/, "") : request.path}`;
  const brand = await SiteContent.findOne({ key: "site" }).select("brand seo legal").lean();
  const brandName = brand?.brand?.name || "SUPERX Technology";
  const siteName = brandName === "SUPERX" ? "SUPERX Technology" : brandName;
  let titleOverride = "";
  let descriptionOverride = "";
  let statusCode = page.notFound ? 404 : 200;
  let noIndex = Boolean(page.noIndex);

  if (page.detailType === "service") {
    const service = await Service.findOne({ slug: page.slug, published: true }).select("title description").lean();
    if (!service) {
      statusCode = 404;
      noIndex = true;
    } else {
      titleOverride = `${service.title} | ${siteName}`;
      descriptionOverride = service.description;
    }
  } else if (page.detailType === "project") {
    const project = await Project.findOne({ slug: page.slug, published: true }).select("name summary description").lean();
    if (!project) {
      statusCode = 404;
      noIndex = true;
    } else {
      titleOverride = `${project.name} | ${siteName}`;
      descriptionOverride = project.summary || project.description;
    }
  } else if (page.key === "about" && !brand?.seo?.pages?.about?.description) {
    const about = await AboutContent.findOne({ key: "about" }).select("sections").lean();
    descriptionOverride = about?.sections?.find((section) => section.key === "introduction" && section.visible)?.body ?? "";
  } else if (page.legalField && !brand?.legal?.[page.legalField]) {
    statusCode = 404;
    noIndex = true;
  }

  const defaults = defaultMetadata[page.key] ?? defaultMetadata.notFound;
  const pageSettings = brand?.seo?.pages?.[page.key];
  const configuredHomeTitle = page.key === "home" ? brand?.seo?.title : "";
  const configuredHomeDescription = page.key === "home" ? brand?.seo?.description : "";
  const title = titleOverride
    || pageSettings?.title
    || configuredHomeTitle
    || `${defaults.title} | ${siteName}`;
  const description = (
    pageSettings?.description
    || descriptionOverride
    || configuredHomeDescription
    || defaults.description
  ).slice(0, 320);

  return {
    title,
    description,
    siteName,
    imageUrl: brand?.seo?.imageUrl ?? "",
    canonicalUrl,
    noIndex,
    statusCode,
  };
}

export function registerFrontend(app) {
  app.use(express.static(buildDirectory, {
    index: false,
    maxAge: "1y",
    immutable: true,
    fallthrough: true,
  }));

  app.get(/.*/, async (request, response, next) => {
    if (!request.accepts("html")) return next();
    let template;
    try {
      template = await readFile(indexFile, "utf8");
    } catch (error) {
      if (error.code === "ENOENT") return next();
      throw error;
    }
    if (request.path.startsWith("/api/")) return next();
    if (request.path !== "/robots.txt" && request.path !== "/sitemap.xml") {
      const metadata = await getMetadata(request);
      response.status(metadata.statusCode)
        .set("Cache-Control", "no-cache")
        .type("html")
        .send(applyFrontendMetadata(template, metadata));
      return;
    }
    return next();
  });
}
