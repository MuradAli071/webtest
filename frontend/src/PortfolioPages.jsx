import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, ExternalLink } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "./api.js";
import { usePageMetadata } from "./PageMetadata.jsx";
import { SiteLayout } from "./SiteLayout.jsx";

function PortfolioState({ error, detail = false }) {
  return (
    <div className={`empty-state${detail ? " service-detail-empty" : ""}`} role={error ? "alert" : undefined}>
      <p className="empty-title">
        {error
          ? "Project stories are temporarily unavailable."
          : detail
            ? "This project could not be found."
            : "No projects have been published yet."}
      </p>
      <p className="empty-description">
        {error
          ? "Please try again later."
          : detail
            ? "This project may be unpublished or no longer available."
            : "Approved project stories will appear here when they are ready to share."}
      </p>
    </div>
  );
}

function ProjectCard({ project }) {
  return (
    <Link className="project-card portfolio-project-card" to={`/work/${project.slug}`}>
      {project.coverImage?.url ? (
        <img
          alt={project.coverImage.alt ?? ""}
          className="project-image"
          loading="lazy"
          decoding="async"
          src={project.coverImage.url}
        />
      ) : (
        <div aria-hidden="true" className="project-image-placeholder" />
      )}
      <div className="project-details">
        <div>
          <p className="project-category">
            {project.category}
            {project.featured && <span className="featured-project-badge">Featured</span>}
          </p>
          <h2>{project.name}</h2>
        </div>
        <ArrowUpRight aria-hidden="true" size={19} />
        <p>{project.summary}</p>
        {project.technologies?.length > 0 && (
          <div className="project-tech-list">
            {project.technologies.map((technology) => (
              <span key={technology}>{technology}</span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

export function PortfolioPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  usePageMetadata("work");

  useEffect(() => {
    apiRequest("/projects")
      .then(setProjects)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SiteLayout>
      <section className="portfolio-page section">
        <div className="page-shell">
          <p className="eyebrow"><span className="eyebrow-line" />Selected work</p>
          <h1 className="services-page-title">
            Work with <span className="text-gradient">purpose.</span>
          </h1>
          <p className="services-page-intro">
            Project stories are shared here when they are approved for publication.
          </p>
          {loading ? (
            <p aria-live="polite" className="content-loading">Loading projects…</p>
          ) : error || projects.length === 0 ? (
            <PortfolioState error={error} />
          ) : (
            <div className="portfolio-grid">
              {projects.map((project) => <ProjectCard key={project._id} project={project} />)}
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}

function ProjectList({ title, values }) {
  if (!values?.length) return null;
  return (
    <section className="project-detail-list">
      <h2>{title}</h2>
      <ul>{values.map((value) => <li key={value}>{value}</li>)}</ul>
    </section>
  );
}

export function ProjectDetailPage() {
  const { slug } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  usePageMetadata(error ? "notFound" : "work", {
    title: project ? `${project.name} | SUPERX Technology` : undefined,
    description: project?.summary || project?.description,
    noIndex: Boolean(error),
    preferOverrides: true,
  });

  useEffect(() => {
    setProject(null);
    setLoading(true);
    setError("");
    apiRequest(`/projects/${encodeURIComponent(slug)}`)
      .then(setProject)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <SiteLayout>
      <section className="project-detail-page">
        <div className="page-shell">
          <Link className="back-link" to="/work">
            <ArrowLeft size={15} aria-hidden="true" /> All projects
          </Link>
          {loading ? (
            <p aria-live="polite" className="content-loading">Loading project…</p>
          ) : error || !project ? (
            <PortfolioState detail error={error} />
          ) : (
            <article>
              {project.coverImage?.url && (
                <img
                  alt={project.coverImage.alt ?? ""}
                  className="project-detail-cover"
                  src={project.coverImage.url}
                  fetchPriority="high"
                  decoding="async"
                />
              )}
              <div className="project-detail-heading">
                <div>
                  <p className="eyebrow"><span className="eyebrow-line" />{project.category}{project.featured && <span className="featured-project-badge">Featured</span>}</p>
                  <h1>{project.name}</h1>
                  <p className="project-detail-summary">{project.summary}</p>
                </div>
                {project.links?.live && (
                  <a
                    className="button button-primary"
                    href={project.links.live}
                    rel="noreferrer"
                    target="_blank"
                  >
                    View live project <ExternalLink size={16} aria-hidden="true" />
                  </a>
                )}
              </div>
              <div className="project-detail-content">
                <div className="project-detail-main">
                  <section className="project-detail-description">
                    <h2>About the project</h2>
                    <p>{project.description}</p>
                  </section>
                  <ProjectList title="Objectives" values={project.objectives} />
                  <ProjectList title="Outcomes" values={project.outcomes} />
                  {project.images?.length > 0 && (
                    <section className="project-gallery">
                      <h2>More from the project</h2>
                      <div>
                        {project.images.map((image) => (
                          <img alt={image.alt ?? ""} key={image.publicId} loading="lazy" decoding="async" src={image.url} />
                        ))}
                      </div>
                    </section>
                  )}
                </div>
                <aside className="project-detail-meta">
                  {project.client && <div><span>Client</span><strong>{project.client}</strong></div>}
                  {project.industry && <div><span>Industry</span><strong>{project.industry}</strong></div>}
                  {project.technologies?.length > 0 && (
                    <div>
                      <span>Technologies</span>
                      <ul className="project-tech-list">
                        {project.technologies.map((technology) => <li key={technology}>{technology}</li>)}
                      </ul>
                    </div>
                  )}
                  {project.links?.additional?.length > 0 && (
                    <div>
                      <span>More links</span>
                      {project.links.additional.map((link) => (
                        <a href={link.url} key={`${link.label}-${link.url}`} rel="noreferrer" target="_blank">
                          {link.label}<ArrowUpRight size={14} aria-hidden="true" />
                        </a>
                      ))}
                    </div>
                  )}
                </aside>
              </div>
              <a className="text-link project-enquiry-link" href={`/contact?service=${encodeURIComponent(project.name)}`}>
                Discuss a project <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            </article>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
