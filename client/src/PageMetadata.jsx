import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSiteContent } from "./SiteContentContext.jsx";

const pageDefaults = {
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

function setMeta(selector, attribute, key, value) {
  let element = document.head.querySelector(selector);
  if (!value) {
    element?.remove();
    return;
  }
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.append(element);
  }
  element.setAttribute("content", value);
}

export function usePageMetadata(pageKey, {
  title: titleOverride,
  description: descriptionOverride,
  noIndex = false,
  preferOverrides = false,
} = {}) {
  const site = useSiteContent();
  const location = useLocation();
  const brandName = site.brand.name || "SUPERX Technology";
  const seoBrandName = brandName === "SUPERX" ? "SUPERX Technology" : brandName;
  const fallback = pageDefaults[pageKey] ?? pageDefaults.notFound;
  const pageSettings = site.seo.pages?.[pageKey] ?? {};
  const title = (preferOverrides && titleOverride)
    || pageSettings.title
    || titleOverride
    || (pageKey === "home" && site.seo.title)
    || `${fallback.title} | ${seoBrandName}`;
  const description = (preferOverrides && descriptionOverride)
    || pageSettings.description
    || descriptionOverride
    || (pageKey === "home" && site.seo.description)
    || fallback.description;
  const metaDescription = description.slice(0, 320);

  useEffect(() => {
    document.title = title;
    setMeta('meta[name="description"]', "name", "description", metaDescription);
    setMeta('meta[property="og:type"]', "property", "og:type", "website");
    setMeta('meta[property="og:site_name"]', "property", "og:site_name", seoBrandName);
    setMeta('meta[property="og:title"]', "property", "og:title", title);
    setMeta('meta[property="og:description"]', "property", "og:description", metaDescription);
    setMeta('meta[property="og:image"]', "property", "og:image", site.seo.imageUrl);
    setMeta('meta[name="twitter:image"]', "name", "twitter:image", site.seo.imageUrl);
    setMeta('meta[name="twitter:card"]', "name", "twitter:card", site.seo.imageUrl ? "summary_large_image" : "summary");
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", metaDescription);
    setMeta('meta[name="robots"]', "name", "robots", noIndex ? "noindex, nofollow" : "");

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.append(canonical);
    }
    canonical.href = `${window.location.origin}${location.pathname}`;
    setMeta('meta[property="og:url"]', "property", "og:url", canonical.href);
  }, [location.pathname, metaDescription, noIndex, seoBrandName, site.seo.imageUrl, title]);
}
