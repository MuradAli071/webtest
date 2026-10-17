import { createContext, useContext, useEffect, useState } from "react";
import { apiRequest } from "./api.js";
import { emptySiteContent } from "./content.js";

const SiteContentContext = createContext(emptySiteContent);
export const siteContentUpdatedEvent = "superx:site-content-updated";

export function SiteContentProvider({ children }) {
  const [content, setContent] = useState(emptySiteContent);

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const value = await apiRequest("/site");
        const homepage = Object.fromEntries(Object.entries(emptySiteContent.homepage).map(([section, defaults]) => {
          const configured = value.homepage?.[section] ?? {};
          const merged = { ...defaults, ...configured };
          for (const [field, defaultValue] of Object.entries(defaults)) {
            if (typeof defaultValue === "string" && !configured[field]?.trim()) {
              merged[field] = defaultValue;
            }
          }
          return [section, merged];
        }));
        if (active) setContent({
          ...emptySiteContent,
          ...value,
          brand: {
            ...emptySiteContent.brand,
            ...value.brand,
            name: value.brand?.name || emptySiteContent.brand.name,
            tagline: value.brand?.tagline || emptySiteContent.brand.tagline,
          },
          navigation: value.navigation?.length ? value.navigation : emptySiteContent.navigation,
          homepage,
          contact: { ...emptySiteContent.contact, ...value.contact },
          seo: {
            ...emptySiteContent.seo,
            ...value.seo,
            pages: Object.fromEntries(Object.entries(emptySiteContent.seo.pages).map(([page, defaults]) => [
              page,
              {
                ...defaults,
                ...value.seo?.pages?.[page],
                title: value.seo?.pages?.[page]?.title || defaults.title,
                description: value.seo?.pages?.[page]?.description || defaults.description,
              },
            ])),
          },
          legalAvailable: { ...emptySiteContent.legalAvailable, ...value.legalAvailable },
        });
      } catch (error) {
        console.error("Could not load public website content:", error);
      }
    }
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener(siteContentUpdatedEvent, refresh);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
      window.removeEventListener(siteContentUpdatedEvent, refresh);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  useEffect(() => {
    const existingIcon = document.querySelector('link[rel="icon"]');
    if (content.brand.faviconUrl) {
      const icon = existingIcon ?? document.createElement("link");
      icon.rel = "icon";
      icon.href = content.brand.faviconUrl;
      icon.dataset.siteManaged = "true";
      if (!existingIcon) document.head.append(icon);
    } else if (existingIcon?.dataset.siteManaged === "true") {
      existingIcon.remove();
    }
  }, [content]);

  return (
    <SiteContentContext.Provider value={content}>
      {children}
    </SiteContentContext.Provider>
  );
}

export function useSiteContent() {
  return useContext(SiteContentContext);
}
