import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Layers3,
  MoveUpRight,
} from "lucide-react";
import { apiRequest } from "./api.js";
import ContactForm from "./ContactForm.jsx";
import { emailHref } from "./contactLinks.js";
import { Footer, Header } from "./SiteLayout.jsx";
import { usePageMetadata } from "./PageMetadata.jsx";
import { ServiceCard } from "./ServiceCard.jsx";
import { useSiteContent } from "./SiteContentContext.jsx";

function EmptyState({ title, description, icon: Icon }) {
  return (
    <div className="empty-state">
      {Icon && (
        <span className="empty-icon" aria-hidden="true">
          <Icon size={20} />
        </span>
      )}
      <p className="empty-title">{title}</p>
      <p className="empty-description">{description}</p>
    </div>
  );
}

function Hero() {
  const site = useSiteContent();
  const { homepage } = site;
  const { hero } = homepage;
  if (hero.visible === false) return null;

  return (
    <section aria-labelledby="hero-title" className="hero-section" id="home">
      <div className="hero-grid page-shell">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="eyebrow-line" />
            {hero.eyebrow}
          </p>
          {(hero.title || hero.titleAccent) ? (
            <h1 id="hero-title">
              {hero.title}
              {hero.title && hero.titleAccent && <br />}
              {hero.titleAccent && <span className="text-gradient">{hero.titleAccent}</span>}
            </h1>
          ) : <h1 id="hero-title">{site.brand.name || "SUPERX Technology"}</h1>}
          {hero.description && <p className="hero-description">{hero.description}</p>}
          {(hero.primaryAction || hero.secondaryAction) && (
            <div className="hero-actions">
              {hero.primaryAction && <a className="button button-primary" href={hero.primaryHref || "#contact"}>
                {hero.primaryAction}<ArrowUpRight size={17} aria-hidden="true" />
              </a>}
              {hero.secondaryAction && <a className="text-link" href={hero.secondaryHref || "#services"}>
                {hero.secondaryAction}<ArrowDown size={15} aria-hidden="true" />
              </a>}
            </div>
          )}
          {hero.footnote && <div className="hero-footnote"><span className="status-dot" />{hero.footnote}</div>}
        </div>

        <div
          aria-hidden={!hero.imageUrl}
          aria-label={hero.imageUrl ? hero.imageAlt || "Company hero image" : undefined}
          className={`hero-art${hero.imageUrl ? " hero-art-with-image" : ""}`}
          role={hero.imageUrl ? "img" : undefined}
        >
          {hero.imageUrl ? (
            <img className="hero-image" src={hero.imageUrl} alt="" fetchPriority="high" decoding="async" />
          ) : (
            <>
              <div className="art-grid" />
              <div className="art-orbit orbit-one" />
              <div className="art-orbit orbit-two" />
              <div className="art-orbit orbit-three" />
              <div className="art-core">
                <span className="core-mark">S<span>.</span></span>
              </div>
              <div className="art-node node-one" />
              <div className="art-node node-two" />
              <div className="art-node node-three" />
              <div className="art-scanline" />
            </>
          )}
          {hero.imageUrl && <span className="hero-image-shade" aria-hidden="true" />}
        </div>
      </div>
      <div className="hero-bottom page-shell">
        <span />
        <a aria-label="Scroll to services" href="#services"><ArrowDown size={15} aria-hidden="true" /></a>
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, accent, description, id }) {
  return (
    <div className="section-heading">
      <p className="eyebrow">
        <span className="eyebrow-line" />
        {eyebrow}
      </p>
      <h2 id={id}>
        {title} {accent && <span className="text-gradient">{accent}</span>}
      </h2>
      {description && <p className="section-description">{description}</p>}
    </div>
  );
}

function Services() {
  const { services: content } = useSiteContent().homepage;
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("/services")
      .then(setServices)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  if (content.visible === false) return null;

  return (
    <section
      aria-labelledby="services-title"
      className="section services-section"
      id="services"
    >
      <div className="page-shell">
        <SectionHeading
          accent={content.titleAccent}
          description={content.description}
          eyebrow={content.eyebrow || "Services"}
          id="services-title"
          title={content.title || "What we do"}
        />
        {loading ? (
          <p aria-live="polite" className="content-loading">Loading services…</p>
        ) : error ? (
          <EmptyState
            description="Please try again later."
            title="Services are temporarily unavailable."
          />
        ) : services.length ? (
          <div className="services-grid">
            {services.slice(0, 4).map((service, index) => (
              <ServiceCard
                key={service._id}
                service={service}
                number={String(index + 1).padStart(2, "0")}
                compact
              />
            ))}
          </div>
        ) : (
          <EmptyState
            description="Published services will appear here when configured."
            title="Services are being prepared."
          />
        )}
        {content.viewAllLabel && <a className="text-link all-services-link" href="/services">
          {content.viewAllLabel} <ArrowRight size={15} aria-hidden="true" />
        </a>}
      </div>
    </section>
  );
}

function Projects() {
  const { work: content } = useSiteContent().homepage;
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("/projects")
      .then(setProjects)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  const featuredProjects = projects.filter((project) => project.featured);
  const shownProjects = (featuredProjects.length ? featuredProjects : projects).slice(0, 2);
  if (content.visible === false) return null;

  return (
    <section
      aria-labelledby="work-title"
      className="section work-section"
      id="work"
    >
      <div className="page-shell">
        <div className="section-heading-row">
          <SectionHeading
            description={content.description}
            eyebrow={content.eyebrow || "Portfolio"}
            id="work-title"
            title={content.title || "Selected work"}
            accent={content.titleAccent}
          />
          {shownProjects.length > 0 && (
            <a className="text-link work-link" href="/work">
              {content.viewAllLabel || "View all projects"} <ArrowRight size={15} aria-hidden="true" />
            </a>
          )}
        </div>
        {loading ? (
          <p aria-live="polite" className="content-loading">Loading projects…</p>
        ) : error ? (
          <EmptyState
            description="Please try again later."
            title="Project stories are temporarily unavailable."
          />
        ) : shownProjects.length > 0 ? (
          <div className="projects-grid">
            {shownProjects.map((project) => (
              <a className="project-card" href={`/work/${project.slug}`} key={project._id}>
                {project.coverImage?.url ? (
                  <img
                    alt={project.coverImage.alt ?? ""}
                    className="project-image"
                    loading="lazy"
                    decoding="async"
                    src={project.coverImage.url}
                  />
                ) : (
                  <div className="project-image-placeholder" aria-hidden="true">
                    <Layers3 size={32} />
                  </div>
                )}
                <div className="project-details">
                  <div>
                    <p className="project-category">{project.category}</p>
                    <h3>{project.name}</h3>
                  </div>
                  <MoveUpRight size={19} aria-hidden="true" />
                  <p>{project.summary}</p>
                </div>
              </a>
            ))}
          </div>
        ) : projects.length > 0 ? (
          <EmptyState
            description="Published project stories will appear on the portfolio page."
            title="No projects are featured right now."
          />
        ) : (
          <EmptyState
            description="Project stories will appear here when they are ready and approved for publication."
            icon={Layers3}
            title="The next story is still being written."
          />
        )}
        {projects.length > 0 && (
          <a className="text-link all-services-link" href="/work">
            Explore our work <ArrowRight size={15} aria-hidden="true" />
          </a>
        )}
      </div>
    </section>
  );
}

function Company() {
  const site = useSiteContent();
  const [company, setCompany] = useState(null);

  useEffect(() => {
    apiRequest("/about")
      .then((sections) => {
        const introduction = sections.find(
          (section) => section.key === "introduction" && section.visible,
        );
        setCompany(introduction ?? null);
      })
      .catch(() => setCompany(null));
  }, []);

  if (site.homepage.about.visible === false || !company || (!company.title && !company.body)) return null;

  return (
    <section
      aria-labelledby="about-title"
      className="section about-section"
      id="about"
    >
      <div className="page-shell about-layout">
        <div className="about-visual" aria-hidden="true">
          {company.image?.url ? (
            <img alt="" className="home-about-image" src={company.image.url} loading="lazy" />
          ) : (
            <>
          <div className="about-visual-glow" />
          <div className="about-visual-frame frame-outer">
            <div className="about-visual-frame frame-inner">
              <div className="about-monogram">S<span>X</span></div>
              <div className="about-crosshair crosshair-one" />
              <div className="about-crosshair crosshair-two" />
              <div className="about-visual-label">THINK / MAKE / MOVE</div>
            </div>
          </div>
          <span className="visual-coordinate coordinate-one">01 — 03</span>
          <span className="visual-coordinate coordinate-two">SUPERX / STUDIO</span>
            </>
          )}
        </div>
        <div className="about-copy">
          <SectionHeading
            eyebrow={company.eyebrow || "ABOUT SUPERX"}
            id="about-title"
            title={company.title || "About SUPERX Technology"}
          />
          {company.body && <p className="about-description">{company.body}</p>}
          <a className="text-link" href="/about">More about SUPERX <ArrowRight size={15} aria-hidden="true" /></a>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const site = useSiteContent();
  const testimonials = site.testimonials;
  if (site.homepage.testimonials.visible === false) return null;

  return (
    <section
      aria-labelledby="testimonials-title"
      className="section testimonials-section"
      id="testimonials"
    >
      <div className="page-shell">
        <SectionHeading
          eyebrow={site.homepage.testimonials.eyebrow || "Testimonials"}
          id="testimonials-title"
          title={site.homepage.testimonials.title || "What our clients say"}
          accent={site.homepage.testimonials.titleAccent}
        />
        {testimonials.length ? (
          <div className="testimonials-grid">
            {testimonials.map((testimonial) => (
              <figure className="testimonial-card" key={`${testimonial.name}-${testimonial.order}`}>
                <blockquote>“{testimonial.quote}”</blockquote>
                <figcaption>
                  <strong>{testimonial.name}</strong>
                  <span>{[testimonial.role, testimonial.company].filter(Boolean).join(" · ")}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No testimonials have been published."
            description="Approved client feedback will appear here when it is available."
          />
        )}
      </div>
    </section>
  );
}

function Faq() {
  const site = useSiteContent();
  const items = site.faqs;
  if (site.homepage.faqs.visible === false) return null;

  return (
    <section
      aria-labelledby="faq-title"
      className="section faq-section"
      id="faq"
    >
      <div className="page-shell faq-layout">
        <SectionHeading
          description={site.homepage.faqs.description}
          eyebrow={site.homepage.faqs.eyebrow || "FAQs"}
          id="faq-title"
          title={site.homepage.faqs.title || "Frequently asked questions"}
          accent={site.homepage.faqs.titleAccent}
        />
        {items.length ? (
          <div className="faq-list">
            {items.map((item, index) => (
              <details className="faq-item" key={item.question}>
                <summary>
                  <span className="faq-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{item.question}</span>
                  <span aria-hidden="true" className="faq-toggle" />
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        ) : (
          <EmptyState
            title="FAQs are being prepared."
            description="Answers to common questions will appear here when they are configured."
          />
        )}
      </div>
    </section>
  );
}

function Contact() {
  const site = useSiteContent();
  const { contact } = site.homepage;
  if (contact.visible === false) return null;

  return (
    <section
      aria-labelledby="contact-title"
      className="contact-section"
      id="contact"
    >
      <div className="contact-glow" aria-hidden="true" />
      <div className="page-shell contact-inner">
        <p className="eyebrow">
          <span className="eyebrow-line" />
          {contact.eyebrow}
        </p>
        <h2 id="contact-title">
          {contact.title}
          {contact.title && contact.titleAccent && <br />}
          {contact.titleAccent && <span className="text-gradient">{contact.titleAccent}</span>}
        </h2>
        {contact.description && <p className="contact-description">{contact.description}</p>}
        {site.contact.email && <p className="contact-direct-link"><a href={emailHref(site.contact.email)}>{site.contact.email}</a></p>}
        <ContactForm type="contact" submitLabel={contact.buttonLabel || "Send enquiry"} />
      </div>
    </section>
  );
}

export default function App() {
  usePageMetadata("home");

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Header />
      <main id="main-content">
        <Hero />
        <Services />
        <Projects />
        <Company />
        <Testimonials />
        <Faq />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
