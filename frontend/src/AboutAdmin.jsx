import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Plus, Save, Trash2 } from "lucide-react";
import { apiRequest } from "./api.js";

const sectionDefinitions = [
  ["introduction", "Company introduction"],
  ["missionVision", "Mission & vision"],
  ["approach", "Approach & process"],
  ["team", "Team members"],
  ["achievements", "Achievements & statistics"],
  ["cta", "Contact call to action"],
];

function emptySection(key, order) {
  return {
    key, order, visible: false, eyebrow: "", title: "", body: "", image: null,
    missionTitle: "", missionBody: "", visionTitle: "", visionBody: "",
    steps: [], members: [], achievements: [], buttonLabel: "", buttonHref: "",
  };
}

function Field({ label, value, onChange, multiline = false, type = "text", maxLength }) {
  const Control = multiline ? "textarea" : "input";
  return (
    <label className="admin-field">
      <span>{label}</span>
      <Control
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        rows={multiline ? 4 : undefined}
        type={multiline ? undefined : type}
        value={value ?? ""}
      />
    </label>
  );
}

function ImageControl({ image, onUpload, onRemove, onAltChange, uploading }) {
  return (
    <div className="about-admin-image">
      {image?.url && <img alt={image.alt ?? ""} src={image.url} />}
      {image?.url && (
        <Field label="Image alt text" value={image.alt} onChange={onAltChange} maxLength={240} />
      )}
      <label className="button about-image-upload">
        <ImagePlus size={15} aria-hidden="true" />
        {uploading ? "Uploading…" : image ? "Replace image" : "Upload image"}
        <input
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onUpload(file);
          }}
          type="file"
        />
      </label>
      {image && <button className="admin-cancel-button" onClick={onRemove} type="button">Remove image</button>}
    </div>
  );
}

function SectionEditor({ section, index, count, onChange, onMove, onMoveItem, onImageUpload, onImageRemove, uploadKey, onMemberImageUpload, onMemberImageRemove, onAddItem, onRemoveItem }) {
  const label = sectionDefinitions.find(([key]) => key === section.key)?.[1] ?? section.key;
  const update = (field, value) => onChange(section.key, { [field]: value });

  return (
    <section className="about-admin-section">
      <div className="about-admin-section-heading">
        <div className="admin-reorder">
          <button aria-label={`Move ${label} up`} disabled={index === 0} onClick={() => onMove(index, -1)} type="button"><ArrowUp size={15} /></button>
          <button aria-label={`Move ${label} down`} disabled={index === count - 1} onClick={() => onMove(index, 1)} type="button"><ArrowDown size={15} /></button>
        </div>
        <div>
          <p className="eyebrow"><span className="eyebrow-line" />ABOUT PAGE SECTION</p>
          <h2>{label}</h2>
        </div>
        <label className="about-section-toggle">
          <input checked={section.visible} onChange={(event) => update("visible", event.target.checked)} type="checkbox" />
          <span>{section.visible ? "Visible" : "Hidden"}</span>
        </label>
      </div>
      {section.key === "introduction" && (
        <div className="admin-form-grid">
          <Field label="Eyebrow (optional)" value={section.eyebrow} onChange={(value) => update("eyebrow", value)} maxLength={80} />
          <Field label="Heading" value={section.title} onChange={(value) => update("title", value)} maxLength={180} />
          <Field label="Introduction" value={section.body} onChange={(value) => update("body", value)} multiline maxLength={4000} />
          <div className="admin-field-full">
            <span className="about-upload-label">Supporting image (optional)</span>
            <ImageControl
              image={section.image}
              onAltChange={(alt) => update("image", { ...section.image, alt })}
              onRemove={() => {
                if (window.confirm("Remove this section image? Save About Us to apply the change.")) onImageRemove(section.key);
              }}
              onUpload={(file) => onImageUpload(section.key, file)}
              uploading={uploadKey === section.key}
            />
          </div>
        </div>
      )}
      {section.key === "missionVision" && (
        <div className="admin-form-grid">
          <Field label="Mission heading" value={section.missionTitle} onChange={(value) => update("missionTitle", value)} maxLength={120} />
          <Field label="Vision heading" value={section.visionTitle} onChange={(value) => update("visionTitle", value)} maxLength={120} />
          <Field label="Mission" value={section.missionBody} onChange={(value) => update("missionBody", value)} multiline maxLength={1600} />
          <Field label="Vision" value={section.visionBody} onChange={(value) => update("visionBody", value)} multiline maxLength={1600} />
        </div>
      )}
      {section.key === "approach" && (
        <>
          <div className="admin-form-grid">
            <Field label="Section heading" value={section.title} onChange={(value) => update("title", value)} maxLength={180} />
            <Field label="Introductory text (optional)" value={section.body} onChange={(value) => update("body", value)} multiline maxLength={4000} />
          </div>
          <div className="about-admin-items">
            {section.steps.map((step, itemIndex) => (
              <div className="about-admin-item" key={`step-${itemIndex}`}>
                <div className="admin-reorder">
                  <button aria-label={`Move process step ${itemIndex + 1} up`} disabled={itemIndex === 0} onClick={() => onMoveItem(section.key, "steps", itemIndex, -1)} type="button"><ArrowUp size={15} /></button>
                  <button aria-label={`Move process step ${itemIndex + 1} down`} disabled={itemIndex === section.steps.length - 1} onClick={() => onMoveItem(section.key, "steps", itemIndex, 1)} type="button"><ArrowDown size={15} /></button>
                </div>
                <Field label={`Step ${itemIndex + 1} title`} value={step.title} onChange={(value) => onChange(section.key, { steps: section.steps.map((item, index) => index === itemIndex ? { ...item, title: value } : item) })} maxLength={120} />
                <Field label="Description" value={step.description} onChange={(value) => onChange(section.key, { steps: section.steps.map((item, index) => index === itemIndex ? { ...item, description: value } : item) })} multiline maxLength={600} />
                <button aria-label={`Remove step ${itemIndex + 1}`} className="about-remove-item" onClick={() => onRemoveItem(section.key, "steps", itemIndex)} type="button"><Trash2 size={15} /></button>
              </div>
            ))}
            <button className="about-add-item" disabled={section.steps.length >= 12} onClick={() => onAddItem(section.key, "steps")} type="button"><Plus size={15} /> Add process step</button>
          </div>
        </>
      )}
      {section.key === "team" && (
        <>
          <Field label="Team section heading (optional)" value={section.title} onChange={(value) => update("title", value)} maxLength={180} />
          <div className="about-admin-items">
            {section.members.map((member, itemIndex) => (
              <div className="about-admin-team-item" key={`member-${itemIndex}`}>
                <div className="admin-reorder">
                  <button aria-label={`Move team member ${itemIndex + 1} up`} disabled={itemIndex === 0} onClick={() => onMoveItem(section.key, "members", itemIndex, -1)} type="button"><ArrowUp size={15} /></button>
                  <button aria-label={`Move team member ${itemIndex + 1} down`} disabled={itemIndex === section.members.length - 1} onClick={() => onMoveItem(section.key, "members", itemIndex, 1)} type="button"><ArrowDown size={15} /></button>
                </div>
                <div className="admin-form-grid">
                  <Field label="Name" value={member.name} onChange={(value) => onChange(section.key, { members: section.members.map((item, index) => index === itemIndex ? { ...item, name: value } : item) })} maxLength={120} />
                  <Field label="Role (optional)" value={member.role} onChange={(value) => onChange(section.key, { members: section.members.map((item, index) => index === itemIndex ? { ...item, role: value } : item) })} maxLength={120} />
                  <Field label="Profile" value={member.bio} onChange={(value) => onChange(section.key, { members: section.members.map((item, index) => index === itemIndex ? { ...item, bio: value } : item) })} multiline maxLength={1200} />
                  <div>
                    <span className="about-upload-label">Profile image (optional)</span>
                    <ImageControl
                      image={member.image}
                      onAltChange={(alt) => onChange(section.key, { members: section.members.map((item, index) => index === itemIndex ? { ...item, image: { ...item.image, alt } } : item) })}
                      onRemove={() => {
                        if (window.confirm(`Remove ${member.name || "this team member"}’s image? Save About Us to apply the change.`)) onMemberImageRemove(itemIndex);
                      }}
                      onUpload={(file) => onMemberImageUpload(itemIndex, file)}
                      uploading={uploadKey === `member-${itemIndex}`}
                    />
                  </div>
                </div>
                <button className="about-remove-item" onClick={() => onRemoveItem(section.key, "members", itemIndex)} type="button"><Trash2 size={15} /> Remove team member</button>
              </div>
            ))}
            <button className="about-add-item" disabled={section.members.length >= 40} onClick={() => onAddItem(section.key, "members")} type="button"><Plus size={15} /> Add team member</button>
          </div>
        </>
      )}
      {section.key === "achievements" && (
        <>
          <Field label="Achievements section heading (optional)" value={section.title} onChange={(value) => update("title", value)} maxLength={180} />
          <p className="about-admin-note">Add only verified milestones, awards or statistics. Leave this section hidden until its information is approved.</p>
          <div className="about-admin-items">
            {section.achievements.map((item, itemIndex) => (
              <div className="about-admin-item" key={`achievement-${itemIndex}`}>
                <div className="admin-reorder">
                  <button aria-label={`Move achievement ${itemIndex + 1} up`} disabled={itemIndex === 0} onClick={() => onMoveItem(section.key, "achievements", itemIndex, -1)} type="button"><ArrowUp size={15} /></button>
                  <button aria-label={`Move achievement ${itemIndex + 1} down`} disabled={itemIndex === section.achievements.length - 1} onClick={() => onMoveItem(section.key, "achievements", itemIndex, 1)} type="button"><ArrowDown size={15} /></button>
                </div>
                <Field label="Achievement / statistic" value={item.label} onChange={(value) => onChange(section.key, { achievements: section.achievements.map((entry, index) => index === itemIndex ? { ...entry, label: value } : entry) })} maxLength={120} />
                <Field label="Value (optional)" value={item.value} onChange={(value) => onChange(section.key, { achievements: section.achievements.map((entry, index) => index === itemIndex ? { ...entry, value } : entry) })} maxLength={80} />
                <Field label="Context (optional)" value={item.description} onChange={(value) => onChange(section.key, { achievements: section.achievements.map((entry, index) => index === itemIndex ? { ...entry, description: value } : entry) })} multiline maxLength={500} />
                <button aria-label={`Remove achievement ${itemIndex + 1}`} className="about-remove-item" onClick={() => onRemoveItem(section.key, "achievements", itemIndex)} type="button"><Trash2 size={15} /></button>
              </div>
            ))}
            <button className="about-add-item" disabled={section.achievements.length >= 30} onClick={() => onAddItem(section.key, "achievements")} type="button"><Plus size={15} /> Add achievement</button>
          </div>
        </>
      )}
      {section.key === "cta" && (
        <div className="admin-form-grid">
          <Field label="Call-to-action heading" value={section.title} onChange={(value) => update("title", value)} maxLength={180} />
          <Field label="Button label" value={section.buttonLabel} onChange={(value) => update("buttonLabel", value)} maxLength={80} />
          <Field label="Supporting text (optional)" value={section.body} onChange={(value) => update("body", value)} multiline maxLength={4000} />
          <Field label="Button link (e.g. /contact)" value={section.buttonHref} onChange={(value) => update("buttonHref", value)} maxLength={1000} />
        </div>
      )}
    </section>
  );
}

function collectImageIds(sections) {
  return sections.flatMap((section) => [
    section.image?.publicId,
    ...(section.members ?? []).map((member) => member.image?.publicId),
  ].filter(Boolean));
}

export default function AboutAdmin() {
  const [sections, setSections] = useState([]);
  const [pendingUploads, setPendingUploads] = useState([]);
  const [uploadKey, setUploadKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadContent = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const saved = await apiRequest("/admin/about");
      const byKey = new Map(saved.map((section) => [section.key, section]));
      setSections(sectionDefinitions.map(([key], order) => ({
        ...emptySection(key, order),
        ...(byKey.get(key) ?? {}),
        order,
      })).sort((a, b) => (byKey.get(a.key)?.order ?? a.order) - (byKey.get(b.key)?.order ?? b.order))
        .map((section, order) => ({ ...section, order })));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadContent(); }, [loadContent]);

  function changeSection(key, changes) {
    setSections((current) => current.map((section) => section.key === key ? { ...section, ...changes } : section));
  }

  function moveSection(index, direction) {
    setSections((current) => {
      const reordered = [...current];
      const destination = index + direction;
      if (destination < 0 || destination >= reordered.length) return current;
      [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
      return reordered.map((section, order) => ({ ...section, order }));
    });
  }

  function moveItem(key, field, index, direction) {
    setSections((current) => current.map((section) => {
      if (section.key !== key) return section;
      const items = [...section[field]];
      const destination = index + direction;
      if (destination < 0 || destination >= items.length) return section;
      [items[index], items[destination]] = [items[destination], items[index]];
      return { ...section, [field]: items };
    }));
  }

  async function uploadImage(key, file, memberIndex = -1) {
    const target = memberIndex < 0 ? key : `member-${memberIndex}`;
    setUploadKey(target);
    setError("");
    try {
      const body = new FormData();
      body.append("image", file);
      const image = await apiRequest("/admin/about/upload", { method: "POST", body });
      setPendingUploads((current) => [...current, image.publicId]);
      if (memberIndex < 0) {
        changeSection(key, { image: { ...image, alt: "" } });
      } else {
        setSections((current) => current.map((section) => section.key !== key ? section : {
          ...section,
          members: section.members.map((member, index) => index === memberIndex
            ? { ...member, image: { ...image, alt: "" } }
            : member),
        }));
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUploadKey("");
    }
  }

  function removeImage(key, memberIndex = -1) {
    if (memberIndex < 0) {
      changeSection(key, { image: null });
    } else {
      setSections((current) => current.map((section) => section.key !== key ? section : {
        ...section,
        members: section.members.map((member, index) => index === memberIndex ? { ...member, image: null } : member),
      }));
    }
  }

  function addItem(key, field) {
    const additions = {
      steps: { title: "", description: "" },
      members: { name: "", role: "", bio: "", image: null },
      achievements: { label: "", value: "", description: "" },
    };
    const limits = { steps: 12, members: 40, achievements: 30 };
    setSections((current) => current.map((section) => section.key === key && section[field].length < limits[field]
      ? { ...section, [field]: [...section[field], additions[field]] }
      : section));
  }

  function removeItem(key, field, index) {
    const label = field === "members" ? "team member" : field === "steps" ? "process step" : "achievement";
    if (!window.confirm(`Remove this ${label}? Save About Us to apply the change.`)) return;
    setSections((current) => current.map((section) => section.key === key
      ? { ...section, [field]: section[field].filter((_item, itemIndex) => itemIndex !== index) }
      : section));
  }

  async function save() {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest("/admin/about", {
        method: "PUT",
        body: JSON.stringify({ sections }),
      });
      setSections(result.sections);
      const retained = new Set(collectImageIds(result.sections));
      const unused = pendingUploads.filter((publicId) => !retained.has(publicId));
      const cleanup = await Promise.allSettled(unused.map((publicId) => apiRequest("/admin/about/upload", {
        method: "DELETE",
        body: JSON.stringify({ publicId }),
      })));
      const failures = cleanup.filter((item) => item.status === "rejected");
      setPendingUploads([]);
      const warnings = [...(result.storageWarnings ?? []), ...failures.map((item) => item.reason.message)];
      setNotice(warnings.length ? `About page saved. Image cleanup warning: ${warnings.join(" ")}` : "About page saved.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function discard() {
    if (!window.confirm("Discard your unsaved About page changes?")) return;
    const cleanup = await Promise.allSettled(pendingUploads.map((publicId) => apiRequest("/admin/about/upload", {
      method: "DELETE",
      body: JSON.stringify({ publicId }),
    })));
    const failures = cleanup.filter((item) => item.status === "rejected");
    setPendingUploads([]);
    await loadContent();
    if (failures.length) setError(`Could not remove ${failures.length} temporary upload(s). ${failures.map((item) => item.reason.message).join(" ")}`);
  }

  if (loading) return <p className="content-loading">Loading About page settings…</p>;

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow"><span className="eyebrow-line" />CONTENT MANAGEMENT</p>
          <h1>About Us</h1>
          <p>Edit company information and choose which sections appear publicly.</p>
        </div>
      </div>
      {notice && <p className="admin-notice" role="status">{notice}</p>}
      {error && <p className="admin-error" role="alert">{error}</p>}
      <p className="about-admin-note">Only publish accurate, approved company details. Empty sections can remain hidden; no default team members, achievements or statistics are added.</p>
      <div className="about-admin-sections">
        {sections.map((section, index) => (
          <SectionEditor
            count={sections.length}
            index={index}
            key={section.key}
            onAddItem={addItem}
            onChange={changeSection}
            onImageRemove={(key) => removeImage(key)}
            onImageUpload={(key, file) => uploadImage(key, file)}
            onMemberImageRemove={(memberIndex) => removeImage("team", memberIndex)}
            onMemberImageUpload={(memberIndex, file) => uploadImage("team", file, memberIndex)}
            onMove={moveSection}
            onMoveItem={moveItem}
            onRemoveItem={removeItem}
            section={section}
            uploadKey={uploadKey}
          />
        ))}
      </div>
      <div className="about-admin-actions">
        <button className="button button-primary" disabled={saving || Boolean(uploadKey)} onClick={save} type="button">
          <Save size={16} aria-hidden="true" />{saving ? "Saving…" : "Save About page"}
        </button>
        <button className="admin-cancel-button" disabled={saving || Boolean(uploadKey)} onClick={discard} type="button">Discard unsaved changes</button>
      </div>
    </>
  );
}
