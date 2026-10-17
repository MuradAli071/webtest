import { useCallback, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ImagePlus,
  LogOut,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { apiRequest } from "./api.js";
import { usePageMetadata } from "./PageMetadata.jsx";
import AdminDashboard from "./AdminDashboard.jsx";
import AboutAdmin from "./AboutAdmin.jsx";
import PortfolioAdmin from "./PortfolioAdmin.jsx";
import { EnquiriesAdmin, SiteContentAdmin } from "./SiteAdmin.jsx";

const blankForm = {
  title: "",
  description: "",
  slug: "",
  icon: "globe",
  imageUrl: "",
  imagePublicId: "",
  published: false,
  cta: { label: "Discuss this service", href: "/contact" },
};

const iconOptions = [
  ["bot", "AI / automation"],
  ["film", "Animation / video"],
  ["globe", "Website"],
  ["smartphone", "Mobile app"],
  ["palette", "UI/UX design"],
  ["megaphone", "Marketing"],
];

function SignIn({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await apiRequest("/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      await onSuccess();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="admin-login-card" onSubmit={handleSubmit}>
      <span className="admin-brand-mark">SX</span>
      <p className="eyebrow"><span className="eyebrow-line" />SUPERX / ADMIN</p>
      <h1>Sign in to manage your website</h1>
      <p className="admin-form-intro">
        Use the administrator credentials configured for this installation.
      </p>
      {error && <p className="admin-error" role="alert">{error}</p>}
      <label className="admin-field">
        <span>Email address</span>
        <input
          autoComplete="username"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </label>
      <label className="admin-field">
        <span>Password</span>
        <input
          autoComplete="current-password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>
      <button className="button button-primary admin-submit" disabled={submitting} type="submit">
        {submitting ? "Signing in…" : "Sign in"}
      </button>
      <Link className="admin-back-link" to="/">Back to website</Link>
    </form>
  );
}

function ServiceForm({ initial, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({
    ...blankForm,
    ...initial,
    cta: { ...blankForm.cta, ...(initial?.cta ?? {}) },
  }));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingUploads, setPendingUploads] = useState([]);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateCta(field, value) {
    setForm((current) => ({
      ...current,
      cta: { ...current.cta, [field]: value },
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave(form, pendingUploads);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function uploadImage(file) {
    if (!["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setError(file.size > 10 * 1024 * 1024
        ? "Image files must be 10 MB or smaller."
        : "Choose a JPEG, PNG, WebP, AVIF, or GIF image.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("image", file);
      const image = await apiRequest("/admin/services/upload", { method: "POST", body });
      setPendingUploads((current) => [...current, image.publicId]);
      setForm((current) => ({ ...current, imageUrl: image.url, imagePublicId: image.publicId }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUploading(false);
    }
  }

  async function cancel() {
    if (pendingUploads.length && !window.confirm("Discard service changes and remove temporary uploads?")) return;
    const results = await Promise.allSettled(pendingUploads.map((publicId) => apiRequest("/admin/services/upload", {
      method: "DELETE",
      body: JSON.stringify({ publicId }),
    })));
    const failures = results.filter((result) => result.status === "rejected");
    if (failures.length) {
      setError(`Could not remove temporary image uploads. ${failures.map((result) => result.reason.message).join(" ")}`);
      return;
    }
    onCancel();
  }

  return (
    <form className="admin-editor" onSubmit={handleSubmit}>
      <div className="admin-editor-heading">
        <div>
          <p className="eyebrow"><span className="eyebrow-line" />SERVICE DETAILS</p>
          <h2>{initial?._id ? "Edit service" : "Add a service"}</h2>
        </div>
        <button aria-label="Close editor" className="icon-button" disabled={saving || uploading} onClick={cancel} type="button">
          <X size={18} />
        </button>
      </div>
      {error && <p className="admin-error" role="alert">{error}</p>}
      <div className="admin-form-grid">
        <label className="admin-field">
          <span>Title</span>
          <input maxLength={120} onChange={(event) => update("title", event.target.value)} required value={form.title} />
        </label>
        <label className="admin-field">
          <span>URL slug</span>
          <input
            maxLength={120}
            onChange={(event) => update("slug", event.target.value)}
            placeholder="Generated from the title if blank"
            value={form.slug}
          />
        </label>
        <label className="admin-field">
          <span>Icon</span>
          <select onChange={(event) => update("icon", event.target.value)} value={form.icon}>
            {iconOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="admin-field">
          <span>Image URL <small>(optional)</small></span>
          <input
            onChange={(event) => {
              update("imageUrl", event.target.value);
              update("imagePublicId", "");
            }}
            placeholder="https://…"
            type="url"
            value={form.imageUrl ?? ""}
          />
        </label>
        <div className="admin-field-full">
          <span className="about-upload-label">Or upload a service image</span>
          <div className="site-image-control">
            {form.imageUrl && <img alt="" className="site-image-preview" src={form.imageUrl} />}
            <label className="button about-image-upload">
              <ImagePlus size={15} aria-hidden="true" />
              {uploading ? "Uploading…" : form.imagePublicId ? "Replace image" : "Upload image"}
              <input
                accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) uploadImage(file);
                }}
                type="file"
              />
            </label>
            {form.imageUrl && <button className="admin-cancel-button" onClick={() => {
              if (!window.confirm("Remove this service image? Save the service to apply the change.")) return;
              update("imageUrl", "");
              update("imagePublicId", "");
            }} type="button">Remove image</button>}
            <p className="upload-help">JPEG, PNG, WebP, AVIF or GIF. Maximum file size: 10 MB.</p>
          </div>
        </div>
        <label className="admin-field admin-field-full">
          <span>Description</span>
          <textarea
            maxLength={2400}
            onChange={(event) => update("description", event.target.value)}
            required
            rows={4}
            value={form.description}
          />
        </label>
        <label className="admin-field">
          <span>Call-to-action label</span>
          <input
            maxLength={80}
            onChange={(event) => updateCta("label", event.target.value)}
            required
            value={form.cta.label}
          />
        </label>
        <label className="admin-field">
          <span>Call-to-action link</span>
          <input
            maxLength={1000}
            onChange={(event) => updateCta("href", event.target.value)}
            placeholder="/contact"
            required
            value={form.cta.href}
          />
        </label>
      </div>
      <label className="admin-publish-toggle">
        <input
          checked={form.published}
          onChange={(event) => update("published", event.target.checked)}
          type="checkbox"
        />
        <span className="publish-check"><Check size={13} /></span>
        <span>
          <strong>Publish this service</strong>
          <small>Published services are visible on the public website.</small>
        </span>
      </label>
      <div className="admin-form-actions">
        <button className="button button-primary" disabled={saving} type="submit">
          <Save size={16} aria-hidden="true" />
          {saving ? "Saving…" : "Save service"}
        </button>
        <button className="admin-cancel-button" disabled={saving || uploading} onClick={cancel} type="button">Cancel</button>
      </div>
    </form>
  );
}

export default function AdminPage() {
  usePageMetadata("admin", { noIndex: true });
  const location = useLocation();
  const dashboardSelected = ["/admin", "/admin/", "/admin/dashboard"].includes(location.pathname);
  const portfolioSelected = location.pathname.startsWith("/admin/projects");
  const aboutSelected = location.pathname.startsWith("/admin/about");
  const contentSelected = location.pathname.startsWith("/admin/content");
  const enquiriesSelected = location.pathname.startsWith("/admin/enquiries");
  const [checkingSession, setCheckingSession] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState(null);
  const [notice, setNotice] = useState("");

  const loadServices = useCallback(async () => {
    setLoadingServices(true);
    setError("");
    try {
      setServices(await apiRequest("/admin/services"));
    } catch (requestError) {
      setError(requestError.message);
      if (requestError.message.includes("session")) setAuthenticated(false);
    } finally {
      setLoadingServices(false);
    }
  }, []);

  const checkSession = useCallback(async () => {
    try {
      await apiRequest("/admin/session");
      setAuthenticated(true);
      await loadServices();
    } catch {
      setAuthenticated(false);
    } finally {
      setCheckingSession(false);
    }
  }, [loadServices]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  async function saveService(form, pendingUploads = []) {
    const editing = Boolean(editor?._id);
    const payload = {
      title: form.title,
      description: form.description,
      slug: form.slug,
      icon: form.icon,
      imageUrl: form.imageUrl,
      imagePublicId: form.imagePublicId,
      published: form.published,
      cta: form.cta,
    };
    const saved = await apiRequest(editing ? `/admin/services/${editor._id}` : "/admin/services", {
      method: editing ? "PATCH" : "POST",
      body: JSON.stringify(payload),
    });
    const unusedIds = pendingUploads.filter((publicId) => publicId !== saved.imagePublicId);
    const cleanup = await Promise.allSettled(unusedIds.map((publicId) => apiRequest("/admin/services/upload", {
      method: "DELETE",
      body: JSON.stringify({ publicId }),
    })));
    const cleanupWarnings = cleanup.flatMap((result) => result.status === "rejected" ? [result.reason.message] : []);
    setEditor(null);
    const warnings = [saved.storageWarning, ...cleanupWarnings].filter(Boolean);
    setNotice(warnings.length
      ? `${editing ? "Service updated" : "Service added"} with image cleanup warning: ${warnings.join(" ")}`
      : (editing ? "Service updated." : "Service added."));
    await loadServices();
    return saved;
  }

  async function deleteService(service) {
    if (!window.confirm(`Delete “${service.title}”? This cannot be undone.`)) return;
    try {
      const result = await apiRequest(`/admin/services/${service._id}`, { method: "DELETE" });
      setNotice(result.storageWarning || "Service deleted.");
      setServices((current) => current.filter((item) => item._id !== service._id));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function moveService(index, direction) {
    const reordered = [...services];
    const destination = index + direction;
    if (destination < 0 || destination >= reordered.length) return;
    [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
    setServices(reordered);
    try {
      const updated = await apiRequest("/admin/services/reorder", {
        method: "PUT",
        body: JSON.stringify({ ids: reordered.map((service) => service._id) }),
      });
      setServices(updated);
      setNotice("Service order updated.");
    } catch (requestError) {
      setError(requestError.message);
      await loadServices();
    }
  }

  async function logout() {
    try {
      await apiRequest("/admin/logout", { method: "POST" });
      setAuthenticated(false);
      setServices([]);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (checkingSession) {
    return <main className="admin-screen"><p className="content-loading">Checking administrator session…</p></main>;
  }

  if (!authenticated) {
    return <main className="admin-screen"><SignIn onSuccess={checkSession} /></main>;
  }

  return (
    <main className="admin-screen">
      <header className="admin-topbar">
        <div className="admin-topbar-inner">
          <Link className="admin-brand" to="/"><span className="admin-brand-mark">SX</span>SUPERX <span>ADMIN</span></Link>
          <div className="admin-topbar-actions">
            <Link className="admin-view-site" to="/">View website</Link>
            <button className="admin-logout" onClick={logout} type="button"><LogOut size={15} /> Sign out</button>
          </div>
        </div>
      </header>
      <div className="admin-content">
        <Link className="back-link admin-back-to-site" to="/">
          <ArrowLeft size={14} aria-hidden="true" /> Back to website
        </Link>
        <nav aria-label="Admin sections" className="admin-section-tabs">
          <Link className={dashboardSelected ? "active" : ""} to="/admin">Dashboard</Link>
          <Link className={location.pathname.startsWith("/admin/services") ? "active" : ""} to="/admin/services">Services</Link>
          <Link className={portfolioSelected ? "active" : ""} to="/admin/projects">Portfolio</Link>
          <Link className={aboutSelected ? "active" : ""} to="/admin/about">About Us</Link>
          <Link className={contentSelected ? "active" : ""} to="/admin/content">Website</Link>
          <Link className={enquiriesSelected ? "active" : ""} to="/admin/enquiries">Enquiries</Link>
        </nav>
        {dashboardSelected ? (
          <AdminDashboard />
        ) : enquiriesSelected ? (
          <EnquiriesAdmin />
        ) : contentSelected ? (
          <SiteContentAdmin />
        ) : aboutSelected ? (
          <AboutAdmin />
        ) : portfolioSelected ? (
          <PortfolioAdmin />
        ) : (
          <>
        <div className="admin-page-heading">
          <div>
            <p className="eyebrow"><span className="eyebrow-line" />CONTENT MANAGEMENT</p>
            <h1>Services</h1>
            <p>Manage the service pages and the content shown on your website.</p>
          </div>
          {!editor && (
            <button className="button button-primary" onClick={() => setEditor({ ...blankForm })} type="button">
              <Plus size={17} aria-hidden="true" /> Add service
            </button>
          )}
        </div>
        {notice && <p className="admin-notice" role="status">{notice}<button aria-label="Dismiss" onClick={() => setNotice("")} type="button"><X size={14} /></button></p>}
        {error && <p className="admin-error" role="alert">{error}</p>}
        {editor && <ServiceForm initial={editor} onCancel={() => setEditor(null)} onSave={saveService} />}
        <section aria-label="Service list" className="admin-service-list">
          <div className="admin-list-heading">
            <h2>All services <span>{services.length}</span></h2>
            <span>Use arrows to reorder</span>
          </div>
          {loadingServices ? (
            <p className="content-loading">Loading services…</p>
          ) : services.length === 0 ? (
            <div className="admin-empty">
              <p>No services have been added yet.</p>
              <span>Add a service to start building the public services page.</span>
            </div>
          ) : (
            services.map((service, index) => (
              <article className="admin-service-row" key={service._id}>
                <div className="admin-reorder">
                  <button aria-label={`Move ${service.title} up`} disabled={index === 0} onClick={() => moveService(index, -1)} type="button"><ArrowUp size={15} /></button>
                  <button aria-label={`Move ${service.title} down`} disabled={index === services.length - 1} onClick={() => moveService(index, 1)} type="button"><ArrowDown size={15} /></button>
                </div>
                <span className={`admin-status-dot${service.published ? " is-published" : ""}`} aria-label={service.published ? "Published" : "Unpublished"} />
                <div className="admin-service-name">
                  <strong>{service.title}</strong>
                  <span>/services/{service.slug}</span>
                </div>
                <span className={`admin-status${service.published ? " published" : ""}`}>
                  {service.published ? "Published" : "Draft"}
                </span>
                <div className="admin-row-actions">
                  <button aria-label={`Edit ${service.title}`} onClick={() => setEditor(service)} type="button">Edit</button>
                  <button aria-label={`Delete ${service.title}`} className="delete-action" onClick={() => deleteService(service)} type="button"><Trash2 size={15} /></button>
                </div>
              </article>
            ))
          )}
        </section>
          </>
        )}
      </div>
    </main>
  );
}
