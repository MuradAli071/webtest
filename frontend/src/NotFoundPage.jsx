import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { usePageMetadata } from "./PageMetadata.jsx";
import { SiteLayout } from "./SiteLayout.jsx";

export default function NotFoundPage() {
  usePageMetadata("notFound", { noIndex: true });

  return (
    <SiteLayout>
      <section className="not-found-page">
        <div className="page-shell">
          <p className="eyebrow"><span className="eyebrow-line" />ERROR 404</p>
          <h1>This page isn’t here.</h1>
          <p>The link may be outdated, or the page may have moved.</p>
          <div className="not-found-actions">
            <Link className="button button-primary" to="/">
              <ArrowLeft size={16} aria-hidden="true" /> Back to home
            </Link>
            <Link className="text-link" to="/contact">
              Contact SUPERX <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
