import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, Compass, UsersRound } from "lucide-react";
import { apiRequest } from "./api.js";
import { usePageMetadata } from "./PageMetadata.jsx";
import { SiteLayout } from "./SiteLayout.jsx";

function AboutHeading({ eyebrow, title, children }) {
  return (
    <div className="about-page-heading">
      {eyebrow && <p className="eyebrow"><span className="eyebrow-line" />{eyebrow}</p>}
      {title && <h2>{title}</h2>}
      {children}
    </div>
  );
}

function Introduction({ section }) {
  return (
    <section className="about-hero section">
      <div className="page-shell about-hero-layout">
        <div>
          {section.eyebrow && <p className="eyebrow"><span className="eyebrow-line" />{section.eyebrow}</p>}
          <h1>{section.title}</h1>
          {section.body && <p className="about-lead">{section.body}</p>}
        </div>
        {section.image?.url ? (
          <img className="about-hero-image" src={section.image.url} alt={section.image.alt ?? ""} loading="lazy" decoding="async" />
        ) : (
          <div aria-hidden="true" className="about-hero-art">
            <span className="about-art-orbit" />
            <span className="about-art-mark">SX<span>.</span></span>
            <span className="about-art-label">SUPERX / TECHNOLOGY</span>
          </div>
        )}
      </div>
    </section>
  );
}

function MissionVision({ section }) {
  const items = [
    ["MISSION", section.missionTitle, section.missionBody],
    ["VISION", section.visionTitle, section.visionBody],
  ].filter(([, title, body]) => title || body);
  if (!items.length) return null;
  return (
    <section className="section about-values">
      <div className="page-shell about-values-grid">
        {items.map(([label, title, body]) => (
          <article className="about-value-card" key={label}>
            <span className="about-value-index">{label}</span>
            <h2>{title}</h2>
            {body && <p>{body}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}

function Approach({ section }) {
  const steps = (section.steps ?? []).filter((step) => step.title || step.description);
  if (!section.title && !section.body && !steps.length) return null;
  return (
    <section className="section about-process">
      <div className="page-shell">
        <AboutHeading eyebrow={section.eyebrow} title={section.title}>
          {section.body && <p className="section-description">{section.body}</p>}
        </AboutHeading>
        {steps.length > 0 && (
          <div className="about-process-grid">
            {steps.map((step, index) => (
              <article className="about-process-step" key={`${step.title}-${index}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  {step.title && <h3>{step.title}</h3>}
                  {step.description && <p>{step.description}</p>}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Team({ section }) {
  const members = (section.members ?? []).filter((member) => member.name);
  if (!section.title && !members.length) return null;
  return (
    <section className="section about-team">
      <div className="page-shell">
        <AboutHeading eyebrow="PEOPLE" title={section.title} />
        {members.length > 0 ? (
          <div className="about-team-grid">
            {members.map((member) => (
              <article className="about-person-card" key={`${member.name}-${member.role}`}>
                {member.image?.url
                  ? <img src={member.image.url} alt={member.image.alt || member.name} loading="lazy" decoding="async" />
                  : <span className="about-person-placeholder" aria-hidden="true"><UsersRound size={24} /></span>}
                <div>
                  <h3>{member.name}</h3>
                  {member.role && <p className="about-person-role">{member.role}</p>}
                  {member.bio && <p>{member.bio}</p>}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="about-section-empty">Team profiles will appear here when approved for publication.</p>
        )}
      </div>
    </section>
  );
}

function Achievements({ section }) {
  const items = (section.achievements ?? []).filter((item) => item.label);
  if (!section.title && !items.length) return null;
  return (
    <section className="section about-achievements">
      <div className="page-shell">
        <AboutHeading eyebrow="MILESTONES" title={section.title} />
        {items.length > 0 ? (
          <div className="about-achievement-grid">
            {items.map((item) => (
              <article key={`${item.label}-${item.value}`}>
                {item.value && <strong>{item.value}</strong>}
                <h3>{item.label}</h3>
                {item.description && <p>{item.description}</p>}
              </article>
            ))}
          </div>
        ) : (
          <p className="about-section-empty">Verified achievements will appear here when configured.</p>
        )}
      </div>
    </section>
  );
}

function CallToAction({ section }) {
  if (!section.title && !section.body) return null;
  const href = section.buttonHref === "/#contact" ? "/contact" : section.buttonHref;
  return (
    <section className="about-page-cta">
      <div className="page-shell about-cta-inner">
        <div>
          {section.title && <h2>{section.title}</h2>}
          {section.body && <p>{section.body}</p>}
        </div>
        {section.buttonLabel && section.buttonHref && (
          <a className="button button-primary" href={href}>
            {section.buttonLabel}<ArrowUpRight size={17} aria-hidden="true" />
          </a>
        )}
      </div>
    </section>
  );
}

export function AboutPage() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const introduction = sections.find((section) => section.key === "introduction" && section.visible);
  usePageMetadata("about", {
    description: introduction?.body,
  });

  useEffect(() => {
    apiRequest("/about")
      .then(setSections)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  const visible = sections.filter((section) => section.visible).sort((a, b) => a.order - b.order);
  const configured = visible.some((section) => (
    section.title || section.body || section.missionBody || section.visionBody
      || section.steps?.some((step) => step.title || step.description)
      || section.members?.length || section.achievements?.length
  ));

  return (
    <SiteLayout>
      {loading ? (
        <div className="page-shell about-page-loading" aria-live="polite">Loading company information…</div>
      ) : error ? (
        <div className="page-shell about-page-loading" role="alert">Company information is temporarily unavailable.</div>
      ) : (
        <>
          {visible.map((section) => {
            if (section.key === "introduction") {
              return section.title || section.body ? <Introduction key={section.key} section={section} /> : null;
            }
            if (section.key === "missionVision") return <MissionVision key={section.key} section={section} />;
            if (section.key === "approach") return <Approach key={section.key} section={section} />;
            if (section.key === "team") return <Team key={section.key} section={section} />;
            if (section.key === "achievements") return <Achievements key={section.key} section={section} />;
            if (section.key === "cta") return <CallToAction key={section.key} section={section} />;
            return null;
          })}
          {!configured && (
            <section className="section about-empty-hero">
              <div className="page-shell">
                <p className="eyebrow"><span className="eyebrow-line" />ABOUT SUPERX</p>
                <h1>About SUPERX Technology</h1>
                <p>Company information will appear here when it has been configured.</p>
              </div>
            </section>
          )}
          {!configured && (
            <div className="page-shell about-page-empty">
              <span aria-hidden="true"><Compass size={19} /></span>
              <p>More about our mission, approach and team will be shared here when details are ready.</p>
              <a href="/contact">Get in touch <ArrowRight size={15} aria-hidden="true" /></a>
            </div>
          )}
        </>
      )}
    </SiteLayout>
  );
}
