import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "./api.js";
import { usePageMetadata } from "./PageMetadata.jsx";
import { SiteLayout } from "./SiteLayout.jsx";
import { ServiceCard, ServiceIcon } from "./ServiceCard.jsx";

function ServicesLoadState({ error }) {
  return (
    <div className="empty-state service-empty-state" role={error ? "alert" : undefined}>
      <p className="empty-title">
        {error ? "Services are temporarily unavailable." : "No services are published yet."}
      </p>
      <p className="empty-description">
        {error
          ? "Please try again later."
          : "Published service information will appear here when configured."}
      </p>
    </div>
  );
}

export function ServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  usePageMetadata("services");

  useEffect(() => {
    apiRequest("/services")
      .then(setServices)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SiteLayout>
      <section className="services-page section">
        <div className="page-shell">
          <p className="eyebrow"><span className="eyebrow-line" />Our services</p>
          <h1 className="services-page-title">
            Thoughtful solutions for{" "}
            <span className="text-gradient">what’s next.</span>
          </h1>
          <p className="services-page-intro">
            Explore the service areas currently published by SUPERX Technology.
            Each engagement can be shaped around your goals and requirements.
          </p>
          {loading ? (
            <p aria-live="polite" className="content-loading">Loading services…</p>
          ) : error || services.length === 0 ? (
            <ServicesLoadState error={error} />
          ) : (
            <div className="services-page-grid">
              {services.map((service, index) => (
                <ServiceCard
                  key={service._id}
                  service={service}
                  number={String(index + 1).padStart(2, "0")}
                />
              ))}
            </div>
          )}
          <a className="text-link services-back-link" href="/contact">
            Start a conversation <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
      </section>
    </SiteLayout>
  );
}

export function ServiceDetailPage() {
  const { slug } = useParams();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const contactHref = service?.cta.href === "/#contact"
    ? `/contact?service=${encodeURIComponent(service.title)}`
    : service?.cta.href;
  usePageMetadata(error ? "notFound" : "services", {
    title: service ? `${service.title} | SUPERX Technology` : undefined,
    description: service?.description,
    noIndex: Boolean(error),
    preferOverrides: true,
  });

  useEffect(() => {
    setLoading(true);
    setError("");
    setService(null);
    apiRequest(`/services/${encodeURIComponent(slug)}`)
      .then(setService)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <SiteLayout>
      <section className="service-detail-section">
        <div className="page-shell">
          <Link className="back-link" to="/services">
            <ArrowLeft size={15} aria-hidden="true" />
            All services
          </Link>
          {loading ? (
            <p aria-live="polite" className="content-loading">Loading service…</p>
          ) : error || !service ? (
            <div className="empty-state service-detail-empty" role="alert">
              <p className="empty-title">This service could not be found.</p>
              <p className="empty-description">
                It may be unpublished or no longer available.
              </p>
            </div>
          ) : (
            <article className="service-detail">
              <div className="service-detail-copy">
                <p className="eyebrow">
                  <span className="eyebrow-line" />SUPERX service
                </p>
                <h1>{service.title}</h1>
                <p className="service-detail-description">{service.description}</p>
                <a className="button button-primary" href={contactHref}>
                  {service.cta.label}
                  <ArrowUpRight size={17} aria-hidden="true" />
                </a>
              </div>
              <div className="service-detail-visual" aria-hidden="true">
                {service.imageUrl ? (
                  <img alt="" src={service.imageUrl} loading="lazy" decoding="async" />
                ) : (
                  <div className="service-detail-icon">
                    <ServiceIcon name={service.icon} size={58} />
                  </div>
                )}
                <span className="detail-visual-label">IDEAS INTO ACTION</span>
              </div>
            </article>
          )}
          {!loading && service && (
            <Link className="text-link next-service-link" to="/services">
              Explore all services <ArrowRight size={15} aria-hidden="true" />
            </Link>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
