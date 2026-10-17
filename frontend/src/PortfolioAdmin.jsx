import { useCallback, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { apiRequest } from "./api.js";

const emptyProject = {
  name: "",
  slug: "",
  summary: "",
  description: "",
  category: "",
  technologies: [],
  client: "",
  industry: "",
  objectives: [],
  outcomes: [],
  coverImage: null,
  images: [],
  links: { live: "", additional: [] },
  featured: false,
  published: false,
};

function asLines(value) {
  return Array.isArray(value) ? value.join("\n") : "";
}

function ProjectEditor({ initial, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({
    ...emptyProject,
    ...initial,
    technologies: asLines(initial?.technologies),
    objectives: asLines(initial?.objectives),
    outcomes: asLines(initial?.outcomes),
    coverImage: initial?.coverImage ?? null,
    images: initial?.images ?? [],
    links: {
      ...emptyProject.links,
      ...(initial?.links ?? {}),
      additional: initial?.links?.additional ?? [],
    },
  }));
  const [pendingUploads, setPendingUploads] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = (field, value) =>
    setForm((current) => ({
      ...current,
      [field]: typeof value === "function" ? value(current[field]) : value,
    }));

  async function uploadFiles(files, destination) {
    const selected = [...files];
    if (!selected.length) return;
    if (destination === "gallery" && form.images.length + selected.length > 12) {
      setError("A project can have at most 12 gallery images.");
      return;
    }
    setUploading(true);
    setError("");
    const uploaded = [];
    try {
      for (const file of selected) {
        const body = new FormData();
        body.append("image", file);
        const image = await apiRequest("/admin/projects/upload", { method: "POST", body });
        uploaded.push(image);
        setPendingUploads((current) => [...current, image.publicId]);
      }
      if (destination === "cover") {
        const previousPublicId = form.coverImage?.publicId;
        if (previousPublicId && pendingUploads.includes(previousPublicId)) {
          await apiRequest("/admin/projects/upload", {
            method: "DELETE",
            body: JSON.stringify({ publicId: previousPublicId }),
          });
          setPendingUploads((current) => current.filter((id) => id !== previousPublicId));
        }
        update("coverImage", { ...uploaded[uploaded.length - 1], alt: "" });
      } else {
        update("images", (form.images ?? []).concat(uploaded.map((image) => ({ ...image, alt: "" }))));
      }
    } catch (uploadError) {
      const cleanup = await Promise.allSettled(
        uploaded.map((image) =>
          apiRequest("/admin/projects/upload", {
            method: "DELETE",
            body: JSON.stringify({ publicId: image.publicId }),
          }),
        ),
      );
      const warnings = cleanup
        .filter((result) => result.status === "rejected")
        .map((result) => result.reason.message);
      const cleanedPublicIds = uploaded
        .filter((_image, index) => cleanup[index]?.status === "fulfilled")
        .map((image) => image.publicId);
      setPendingUploads((current) =>
        current.filter((id) => !cleanedPublicIds.includes(id)),
      );
      setError(
        warnings.length
          ? `${uploadError.message} Some temporary uploads could not be cleaned up: ${warnings.join(" ")}`
          : uploadError.message,
      );
    } finally {
      setUploading(false);
    }
  }

  async function discardPendingUploads() {
    const results = await Promise.allSettled(
      pendingUploads.map((publicId) => apiRequest("/admin/projects/upload", {
          method: "DELETE",
          body: JSON.stringify({ publicId }),
        })),
    );
    const failed = results.filter((result) => result.status === "rejected");
    const deletedIds = pendingUploads.filter((_id, index) => results[index]?.status === "fulfilled");
    setPendingUploads((current) => current.filter((id) => !deletedIds.includes(id)));
    if (failed.length) {
      setError(
        `Could not remove ${failed.length} temporary image upload(s) from Cloudinary. ${failed
          .map((result) => result.reason.message)
          .join(" ")}`,
      );
      return false;
    }
    return true;
  }

  async function cancel() {
    const cleaned = await discardPendingUploads();
    if (!cleaned) return;
    onCancel();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      name: form.name,
      slug: form.slug,
      summary: form.summary,
      description: form.description,
      category: form.category,
      technologies: form.technologies.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean),
      client: form.client,
      industry: form.industry,
      objectives: form.objectives.split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
      outcomes: form.outcomes.split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
      coverImage: form.coverImage,
      images: form.images,
      links: form.links,
      featured: form.featured,
      published: form.published,
    };
    try {
      await onSave(payload);
      setPendingUploads([]);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  function updateImageAlt(imageType, index, alt) {
    if (imageType === "cover") {
      update("coverImage", { ...form.coverImage, alt });
      return;
    }
    update(
      "images",
      form.images.map((image, imageIndex) => imageIndex === index ? { ...image, alt } : image),
    );
  }

  function moveGalleryImage(index, direction) {
    const destination = index + direction;
    if (destination < 0 || destination >= form.images.length) return;
    const images = [...form.images];
    [images[index], images[destination]] = [images[destination], images[index]];
    update("images", images);
  }

  function handleImageSelection(event, destination) {
    const files = [...event.currentTarget.files];
    event.currentTarget.value = "";
    void uploadFiles(files, destination);
  }

  async function removeImage(imageType, index) {
    if (!window.confirm(`Remove this ${imageType === "cover" ? "cover image" : "gallery image"}? Save the project to apply the change.`)) return;
    if (imageType === "cover") {
      const publicId = form.coverImage?.publicId;
      if (publicId && pendingUploads.includes(publicId)) {
        try {
          await apiRequest("/admin/projects/upload", {
            method: "DELETE",
            body: JSON.stringify({ publicId }),
          });
          setPendingUploads((current) => current.filter((id) => id !== publicId));
        } catch (requestError) {
          setError(requestError.message);
          return;
        }
      }
      update("coverImage", null);
      return;
    }
    const publicId = form.images[index]?.publicId;
    if (publicId && pendingUploads.includes(publicId)) {
      try {
        await apiRequest("/admin/projects/upload", {
          method: "DELETE",
          body: JSON.stringify({ publicId }),
        });
        setPendingUploads((current) => current.filter((id) => id !== publicId));
      } catch (requestError) {
        setError(requestError.message);
        return;
      }
    }
    update("images", form.images.filter((_image, imageIndex) => imageIndex !== index));
  }

  return (
    <form className="admin-editor project-editor" onSubmit={handleSubmit}>
      <div className="admin-editor-heading">
        <div>
          <p className="eyebrow"><span className="eyebrow-line" />PROJECT DETAILS</p>
          <h2>{initial?._id ? "Edit project" : "Add a project"}</h2>
        </div>
        <button aria-label="Close editor" className="icon-button" disabled={uploading || saving} onClick={cancel} type="button">
          <X size={18} />
        </button>
      </div>
      {error && <p className="admin-error" role="alert">{error}</p>}
      <div className="admin-form-grid">
        <label className="admin-field">
          <span>Project name</span>
          <input maxLength={140} onChange={(event) => update("name", event.target.value)} required value={form.name} />
        </label>
        <label className="admin-field">
          <span>URL slug</span>
          <input maxLength={140} onChange={(event) => update("slug", event.target.value)} placeholder="Generated from project name if blank" value={form.slug} />
        </label>
        <label className="admin-field">
          <span>Category</span>
          <input maxLength={100} onChange={(event) => update("category", event.target.value)} required value={form.category} />
        </label>
        <label className="admin-field">
          <span>Technologies <small>(comma or line separated)</small></span>
          <input onChange={(event) => update("technologies", event.target.value)} value={form.technologies} />
        </label>
        <label className="admin-field">
          <span>Client <small>(optional, if permitted)</small></span>
          <input maxLength={140} onChange={(event) => update("client", event.target.value)} value={form.client} />
        </label>
        <label className="admin-field">
          <span>Industry <small>(optional)</small></span>
          <input maxLength={100} onChange={(event) => update("industry", event.target.value)} value={form.industry} />
        </label>
        <label className="admin-field admin-field-full">
          <span>Short summary</span>
          <textarea maxLength={300} onChange={(event) => update("summary", event.target.value)} required rows={2} value={form.summary} />
        </label>
        <label className="admin-field admin-field-full">
          <span>Detailed description</span>
          <textarea maxLength={6000} onChange={(event) => update("description", event.target.value)} required rows={5} value={form.description} />
        </label>
        <label className="admin-field admin-field-full">
          <span>Project objectives <small>(one per line; only verified information)</small></span>
          <textarea onChange={(event) => update("objectives", event.target.value)} rows={3} value={form.objectives} />
        </label>
        <label className="admin-field admin-field-full">
          <span>Actual outcomes <small>(one per line; leave blank if unavailable)</small></span>
          <textarea onChange={(event) => update("outcomes", event.target.value)} rows={3} value={form.outcomes} />
        </label>
        <label className="admin-field">
          <span>Live project URL <small>(optional)</small></span>
          <input onChange={(event) => update("links", { ...form.links, live: event.target.value })} placeholder="https://…" type="url" value={form.links.live} />
        </label>
        <label className="admin-field">
          <span>Additional links <small>(one per line: Label | URL)</small></span>
          <textarea
            onChange={(event) => update("links", {
              ...form.links,
              additional: event.target.value.split(/\r?\n/).map((line) => {
                const [label = "", ...urlParts] = line.split("|");
                return { label: label.trim(), url: urlParts.join("|").trim() };
              }).filter((item) => item.label || item.url),
            })}
            rows={3}
            value={form.links.additional.map((item) => `${item.label} | ${item.url}`).join("\n")}
          />
        </label>
      </div>

      <section aria-label="Project images" className="project-image-editor">
        <h3>Project images</h3>
        <div className="project-image-groups">
          <div className="project-image-group">
            <div className="project-upload-heading">
              <strong>Cover image</strong>
              <label className="upload-button">
                <ImagePlus size={15} aria-hidden="true" />
                {form.coverImage ? "Replace cover" : "Upload cover"}
                <input accept="image/jpeg,image/png,image/webp,image/avif,image/gif" disabled={uploading} onChange={(event) => handleImageSelection(event, "cover")} type="file" />
              </label>
            </div>
            {form.coverImage ? (
              <div className="project-image-preview">
                <img src={form.coverImage.url} alt="" />
                <label className="admin-field">
                  <span>Cover image alt text</span>
                  <input maxLength={240} onChange={(event) => updateImageAlt("cover", 0, event.target.value)} value={form.coverImage.alt ?? ""} />
                </label>
                <button className="image-remove-button" onClick={() => removeImage("cover")} type="button"><Trash2 size={14} /> Remove</button>
              </div>
            ) : (
              <p className="image-placeholder">No cover image uploaded.</p>
            )}
          </div>
          <div className="project-image-group">
            <div className="project-upload-heading">
              <strong>Additional images <small>({form.images.length}/12)</small></strong>
              <label className="upload-button">
                <ImagePlus size={15} aria-hidden="true" /> Add images
                <input accept="image/jpeg,image/png,image/webp,image/avif,image/gif" disabled={uploading || form.images.length >= 12} multiple onChange={(event) => handleImageSelection(event, "gallery")} type="file" />
              </label>
            </div>
            {form.images.length ? (
              <div className="project-gallery-editor">
                {form.images.map((image, index) => (
                  <div className="project-image-preview" key={image.publicId}>
                    <img src={image.url} alt="" />
                    <div className="admin-reorder">
                      <button aria-label={`Move gallery image ${index + 1} up`} disabled={index === 0} onClick={() => moveGalleryImage(index, -1)} type="button"><ArrowUp size={15} /></button>
                      <button aria-label={`Move gallery image ${index + 1} down`} disabled={index === form.images.length - 1} onClick={() => moveGalleryImage(index, 1)} type="button"><ArrowDown size={15} /></button>
                    </div>
                    <label className="admin-field">
                      <span>Image {index + 1} alt text</span>
                      <input maxLength={240} onChange={(event) => updateImageAlt("gallery", index, event.target.value)} value={image.alt ?? ""} />
                    </label>
                    <button className="image-remove-button" onClick={() => removeImage("gallery", index)} type="button"><Trash2 size={14} /> Remove</button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="image-placeholder">No additional images uploaded.</p>
            )}
          </div>
        </div>
        {uploading && <p aria-live="polite" className="content-loading">Uploading image…</p>}
        <p className="upload-help">JPEG, PNG, WebP, AVIF or GIF · Maximum 10 MB per image.</p>
      </section>

      <div className="project-publish-options">
        <label className="admin-publish-toggle">
          <input checked={form.featured} onChange={(event) => update("featured", event.target.checked)} type="checkbox" />
          <span className="publish-check" />
          <span><strong>Feature this project</strong><small>Featured projects are prioritized in public listings.</small></span>
        </label>
        <label className="admin-publish-toggle">
          <input checked={form.published} onChange={(event) => update("published", event.target.checked)} type="checkbox" />
          <span className="publish-check" />
          <span><strong>Publish this project</strong><small>Only published projects appear on the public website.</small></span>
        </label>
      </div>
      <div className="admin-form-actions">
        <button className="button button-primary" disabled={saving || uploading} type="submit">
          <Save size={16} aria-hidden="true" />{saving ? "Saving…" : "Save project"}
        </button>
        <button className="admin-cancel-button" disabled={uploading || saving} onClick={cancel} type="button">Cancel</button>
      </div>
    </form>
  );
}

export default function PortfolioAdmin() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editor, setEditor] = useState(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setProjects(await apiRequest("/admin/projects"));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  async function saveProject(payload) {
    const editing = Boolean(editor?._id);
    const result = await apiRequest(
      editing ? `/admin/projects/${editor._id}` : "/admin/projects",
      {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      },
    );
    const project = result?.project ?? result;
    setEditor(null);
    setNotice(
      result?.storageWarnings?.length
        ? `Project saved. ${result.storageWarnings.join(" ")}`
        : editing
          ? "Project updated."
          : "Project added.",
    );
    await loadProjects();
    return project;
  }

  async function deleteProject(project) {
    if (!window.confirm(`Delete “${project.name}”? This cannot be undone.`)) return;
    try {
      const result = await apiRequest(`/admin/projects/${project._id}`, { method: "DELETE" });
      setProjects((current) => current.filter((item) => item._id !== project._id));
      setNotice(
        result?.storageWarnings?.length
          ? `Project deleted. ${result.storageWarnings.join(" ")}`
          : "Project deleted.",
      );
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function reorderProjects(index, direction) {
    const next = [...projects];
    const destination = index + direction;
    if (destination < 0 || destination >= next.length) return;
    [next[index], next[destination]] = [next[destination], next[index]];
    setProjects(next);
    try {
      setProjects(await apiRequest("/admin/projects/reorder", {
        method: "PUT",
        body: JSON.stringify({ ids: next.map((project) => project._id) }),
      }));
      setNotice("Project order updated.");
    } catch (requestError) {
      setError(requestError.message);
      await loadProjects();
    }
  }

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow"><span className="eyebrow-line" />CONTENT MANAGEMENT</p>
          <h1>Portfolio</h1>
          <p>Manage project stories, imagery and public visibility.</p>
        </div>
        {!editor && (
          <button className="button button-primary" onClick={() => setEditor({ ...emptyProject })} type="button">
            <Plus size={17} aria-hidden="true" /> Add project
          </button>
        )}
      </div>
      {notice && (
        <p className="admin-notice" role="status">
          {notice}
          <button aria-label="Dismiss" onClick={() => setNotice("")} type="button"><X size={14} /></button>
        </p>
      )}
      {error && <p className="admin-error" role="alert">{error}</p>}
      {editor && (
        <ProjectEditor
          initial={editor}
          onCancel={() => setEditor(null)}
          onSave={saveProject}
        />
      )}
      <section aria-label="Portfolio project list" className="admin-service-list">
        <div className="admin-list-heading">
          <h2>All projects <span>{projects.length}</span></h2>
          <span>Use arrows to reorder</span>
        </div>
        {loading ? (
          <p className="content-loading">Loading projects…</p>
        ) : projects.length === 0 ? (
          <div className="admin-empty">
            <p>No portfolio projects yet.</p>
            <span>Add only work that is accurate and approved for publication.</span>
          </div>
        ) : (
          projects.map((project, index) => (
            <article className="admin-service-row" key={project._id}>
              <div className="admin-reorder">
                <button aria-label={`Move ${project.name} up`} disabled={index === 0} onClick={() => reorderProjects(index, -1)} type="button"><ArrowUp size={15} /></button>
                <button aria-label={`Move ${project.name} down`} disabled={index === projects.length - 1} onClick={() => reorderProjects(index, 1)} type="button"><ArrowDown size={15} /></button>
              </div>
              <span className={`admin-status-dot${project.published ? " is-published" : ""}`} aria-label={project.published ? "Published" : "Unpublished"} />
              <div className="admin-service-name">
                <strong>{project.name}{project.featured ? " · Featured" : ""}</strong>
                <span>/work/{project.slug} · {project.category}</span>
              </div>
              <span className={`admin-status${project.published ? " published" : ""}`}>
                {project.published ? "Published" : "Draft"}
              </span>
              <div className="admin-row-actions">
                <button aria-label={`Edit ${project.name}`} onClick={() => setEditor(project)} type="button">Edit</button>
                <button aria-label={`Delete ${project.name}`} className="delete-action" onClick={() => deleteProject(project)} type="button"><Trash2 size={15} /></button>
              </div>
            </article>
          ))
        )}
      </section>
    </>
  );
}
