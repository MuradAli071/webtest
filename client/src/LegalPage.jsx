import { useEffect, useState } from "react";
import { SiteLayout } from "./SiteLayout.jsx";
import { apiRequest } from "./api.js";
import { usePageMetadata } from "./PageMetadata.jsx";

export default function LegalPage({ type }) {
  const [documentContent, setDocumentContent] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const title = type === "privacy-policy" ? "Privacy policy" : "Terms";
  usePageMetadata(type === "privacy-policy" ? "privacy" : "terms", { noIndex: Boolean(error) });

  useEffect(() => {
    setLoading(true);
    setError("");
    setDocumentContent(null);
    apiRequest(`/site/legal/${type}`)
      .then(setDocumentContent)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [type]);

  return (
    <SiteLayout>
      <section className="section legal-page">
        <div className="page-shell">
          <p className="eyebrow"><span className="eyebrow-line" />SUPERX TECHNOLOGY</p>
          <h1>{title}</h1>
          {loading ? (
            <p aria-live="polite" className="legal-empty">Loading document…</p>
          ) : documentContent ? (
            <div className="legal-document">{documentContent.body}</div>
          ) : error ? (
            <p className="legal-empty" role="alert">
              {error.includes("has not been published")
                ? "This document has not been published yet. Please check back later."
                : "This document is temporarily unavailable. Please try again later."}
            </p>
          ) : (
            <p className="legal-empty">This document is not available.</p>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
