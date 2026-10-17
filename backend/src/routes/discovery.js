import { Router } from "express";
import AboutContent from "../models/AboutContent.js";
import Project from "../models/Project.js";
import Service from "../models/Service.js";
import SiteContent from "../models/SiteContent.js";

const router = Router();

function siteOrigin(request) {
  const configured = process.env.SITE_URL?.trim();
  if (!configured && process.env.NODE_ENV === "production") {
    throw new Error("SITE_URL must be configured in production.");
  }
  const host = request.get("x-forwarded-host") || request.get("host");
  const protocol = request.get("x-forwarded-proto") || request.protocol;
  const url = new URL(configured || `${protocol}://${host}`);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("SITE_URL must be an absolute HTTP or HTTPS origin without a path.");
  }
  return url.origin;
}

function escapeXml(value) {
  return value.replace(/[<>&'"]/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    '"': "&quot;",
  })[character]);
}

export function createRobotsText(origin) {
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");
}

export function createSitemapXml(origin, { services, projects, site, about }) {
  const paths = new Map([
    ["/", site?.updatedAt],
    ["/contact", site?.updatedAt],
    ["/about", about?.updatedAt],
    ["/services", services[0]?.updatedAt],
    ["/work", projects[0]?.updatedAt],
  ]);
  if (site?.legal?.privacyPolicy) paths.set("/privacy", site.updatedAt);
  if (site?.legal?.terms) paths.set("/terms", site.updatedAt);
  for (const service of services) paths.set(`/services/${service.slug}`, service.updatedAt);
  for (const project of projects) paths.set(`/work/${project.slug}`, project.updatedAt);

  const entries = [...paths].map(([path, updatedAt]) => {
    const lastmod = updatedAt ? `<lastmod>${new Date(updatedAt).toISOString()}</lastmod>` : "";
    return `<url><loc>${escapeXml(`${origin}${path}`)}</loc>${lastmod}</url>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`;
}

router.get("/robots.txt", (request, response) => {
  const origin = siteOrigin(request);
  response.type("text/plain")
    .set("Cache-Control", "public, max-age=3600")
    .send(createRobotsText(origin));
});

router.get("/sitemap.xml", async (request, response) => {
  const origin = siteOrigin(request);
  const [services, projects, site, about] = await Promise.all([
    Service.find({ published: true }).select("slug updatedAt").lean(),
    Project.find({ published: true }).select("slug updatedAt").lean(),
    SiteContent.findOne({ key: "site" }).select("legal").lean(),
    AboutContent.findOne({ key: "about" }).select("updatedAt").lean(),
  ]);
  response.type("application/xml")
    .set("Cache-Control", "public, max-age=300, stale-while-revalidate=600")
    .send(createSitemapXml(origin, { services, projects, site, about }));
});

export default router;
