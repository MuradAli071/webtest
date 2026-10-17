import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Plus, Save, Trash2 } from "lucide-react";
import { apiRequest } from "./api.js";
import { defaultNavigation, emptySiteContent } from "./content.js";
import { siteContentUpdatedEvent } from "./SiteContentContext.jsx";

const homepageFields = [
  ["hero", "Eyebrow", "eyebrow"], ["hero", "Heading", "title"],
  ["hero", "Heading accent", "titleAccent"], ["hero", "Description", "description", true],
  ["hero", "Primary action label", "primaryAction"], ["hero", "Primary action link", "primaryHref"],
  ["hero", "Secondary action label", "secondaryAction"], ["hero", "Secondary action link", "secondaryHref"],
  ["hero", "Short footnote", "footnote"],
  ["services", "Services eyebrow", "eyebrow"], ["services", "Services heading", "title"],
  ["services", "Services heading accent", "titleAccent"], ["services", "Services description", "description", true],
  ["services", "Services link label", "viewAllLabel"],
  ["work", "Work eyebrow", "eyebrow"], ["work", "Work heading", "title"],
  ["work", "Work heading accent", "titleAccent"], ["work", "Work description", "description", true],
  ["work", "Work link label", "viewAllLabel"],
  ["testimonials", "Testimonials eyebrow", "eyebrow"], ["testimonials", "Testimonials heading", "title"],
  ["testimonials", "Testimonials heading accent", "titleAccent"],
  ["faqs", "FAQ eyebrow", "eyebrow"], ["faqs", "FAQ heading", "title"],
  ["faqs", "FAQ heading accent", "titleAccent"], ["faqs", "FAQ description", "description", true],
  ["contact", "Contact eyebrow", "eyebrow"], ["contact", "Contact heading", "title"],
  ["contact", "Contact heading accent", "titleAccent"], ["contact", "Contact description", "description", true],
  ["contact", "Enquiry submit label", "buttonLabel"],
];

const seoPageFields = [
  ["home", "Homepage"],
  ["about", "About"],
  ["contact", "Contact"],
  ["services", "Services"],
  ["work", "Portfolio"],
  ["privacy", "Privacy policy"],
  ["terms", "Terms"],
];

function siteDefaults(saved = {}) {
  const homepageDefaults = emptySiteContent.homepage;
  return {
    ...emptySiteContent,
    ...saved,
    brand: {
      ...emptySiteContent.brand,
      ...saved.brand,
      tagline: saved.brand?.tagline || emptySiteContent.brand.tagline,
    },
    navigation: saved.navigation?.length ? saved.navigation : defaultNavigation,
    homepage: Object.fromEntries(
      Object.entries(homepageDefaults).map(([section, defaults]) => {
        const savedSection = saved.homepage?.[section] ?? {};
        const merged = { ...defaults, ...savedSection };
        for (const [field, value] of Object.entries(defaults)) {
          if (typeof value === "string" && !savedSection[field]?.trim()) {
            merged[field] = value;
          }
        }
        return [section, merged];
      }),
    ),
    testimonials: (saved.testimonials ?? []).map((item, order) => ({ published: false, order, ...item })),
    faqs: (saved.faqs ?? []).map((item, order) => ({ published: false, order, ...item })),
    contact: { ...emptySiteContent.contact, ...saved.contact },
    legal: { privacyPolicy: "", terms: "", ...saved.legal },
    seo: {
      title: saved.seo?.title || emptySiteContent.seo.title,
      description: saved.seo?.description || emptySiteContent.seo.description,
      imageUrl: "",
      imagePublicId: "",
      ...saved.seo,
      pages: Object.fromEntries(seoPageFields.map(([page]) => {
        const pageContent = saved.seo?.pages?.[page] ?? {};
        return [page, {
          title: pageContent.title || (page === "home" ? saved.seo?.title : "") || emptySiteContent.seo.pages[page].title,
          description: pageContent.description || (page === "home" ? saved.seo?.description : "") || emptySiteContent.seo.pages[page].description,
        }];
      })),
    },
  };
}

function AdminField({ label, value, onChange, multiline = false, maxLength, hint }) {
  const Control = multiline ? "textarea" : "input";
  return (
    <label className="admin-field">
      <span>{label}</span>
      <Control
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        rows={multiline ? 5 : undefined}
        value={value ?? ""}
      />
      {hint && <small className="admin-field-hint">{hint}</small>}
    </label>
  );
}

function SiteImageControl({ label, url, alt, onAltChange, onUpload, onRemove, uploading }) {
  return (
    <div className="site-image-control">
      {url && <img alt={alt ?? ""} className="site-image-preview" src={url} />}
      <label className="button about-image-upload">
        <ImagePlus size={15} aria-hidden="true" />
        {uploading ? "Uploading…" : url ? "Replace image" : `Upload ${label.toLowerCase()}`}
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
      {url && (
        <>
          {onAltChange && <AdminField label="Image alt text" value={alt} maxLength={240} onChange={onAltChange} />}
          <button className="admin-cancel-button" onClick={onRemove} type="button">Remove image</button>
        </>
      )}
      <p className="upload-help">JPEG, PNG, WebP, AVIF or GIF, up to 10 MB. Uploads require Cloudinary configured in backend/.env.</p>
    </div>
  );
}

export function SiteContentAdmin() {
  const [content, setContent] = useState(() => siteDefaults());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingUploads, setPendingUploads] = useState([]);
  const [uploadingAsset, setUploadingAsset] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setContent(siteDefaults(await apiRequest("/admin/site")));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function update(path, value) {
    setContent((current) => {
      const next = structuredClone(current);
      let target = next;
      for (const key of path.slice(0, -1)) target = target[key];
      target[path[path.length - 1]] = value;
      return next;
    });
  }

  function updateSeoPage(page, field, value) {
    update(["seo", "pages", page, field], value);
    if (page === "home") update(["seo", field], value);
  }

  function updateArray(field, index, key, value) {
    update([field], content[field].map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  }

  function addRow(field) {
    const item = field === "navigation"
      ? { label: "", href: "/", visible: true }
      : field === "faqs"
        ? { question: "", answer: "", published: false, order: content[field].length }
        : field === "testimonials"
          ? { quote: "", name: "", role: "", company: "", published: false, order: content[field].length }
          : { label: "", url: "" };
    update([field], [...content[field], item]);
  }

  function removeRow(field, index) {
    if (!window.confirm(`Remove this ${field === "faqs" ? "FAQ" : field === "testimonials" ? "testimonial" : field === "navigation" ? "navigation link" : "social link"}? Save the form to apply this change.`)) return;
    const rows = field === "socialLinks" ? content.contact.socialLinks : content[field];
    const filtered = rows.filter((_item, itemIndex) => itemIndex !== index);
    if (field === "socialLinks") {
      update(["contact", "socialLinks"], filtered);
      return;
    }
    update([field], field === "navigation"
      ? filtered
      : filtered.map((item, order) => ({ ...item, order })));
  }

  function moveRow(field, index, direction) {
    const rows = field === "socialLinks" ? [...content.contact.socialLinks] : [...content.navigation];
    const destination = index + direction;
    if (destination < 0 || destination >= rows.length) return;
    [rows[index], rows[destination]] = [rows[destination], rows[index]];
    update(field === "socialLinks" ? ["contact", "socialLinks"] : ["navigation"], rows);
  }

  async function uploadImage(asset, file) {
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
      setError(file.size > 10 * 1024 * 1024
        ? "Image files must be 10 MB or smaller."
        : "Choose a supported image file.");
      return;
    }
    setUploadingAsset(asset);
    setError("");
    setNotice("");
    try {
      const body = new FormData();
      body.append("asset", asset);
      body.append("image", file);
      const image = await apiRequest("/admin/site/upload", { method: "POST", body });
      setPendingUploads((current) => [...current, image.publicId]);
      if (asset === "logo") {
        update(["brand", "logoUrl"], image.url);
        update(["brand", "logoPublicId"], image.publicId);
      }
      if (asset === "favicon") {
        update(["brand", "faviconUrl"], image.url);
        update(["brand", "faviconPublicId"], image.publicId);
      }
      if (asset === "hero") {
        update(["homepage", "hero", "imageUrl"], image.url);
        update(["homepage", "hero", "imagePublicId"], image.publicId);
      }
      if (asset === "seo") {
        update(["seo", "imageUrl"], image.url);
        update(["seo", "imagePublicId"], image.publicId);
      }
    } catch (requestError) {
      setError(requestError.message.includes("Cloudinary image storage is not configured")
        ? "Image uploads need Cloudinary. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to backend/.env, then restart the backend."
        : requestError.message);
    } finally {
      setUploadingAsset("");
    }
  }

  function removeImage(path, assetLabel) {
    if (!window.confirm(`Remove the ${assetLabel}? Save the form to apply this change.`)) return;
    update(path.url, "");
    update(path.publicId, "");
    if (path.alt) update(path.alt, "");
  }

  async function cleanUnusedUploads(ids) {
    const cleanup = await Promise.allSettled(ids.map((publicId) => apiRequest("/admin/site/upload", {
      method: "DELETE",
      body: JSON.stringify({ publicId }),
    })));
    return cleanup.flatMap((item) => item.status === "rejected" ? [item.reason.message] : []);
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const {
        _id: _ignoredId,
        key: _ignoredKey,
        createdAt: _ignoredCreated,
        updatedAt: _ignoredUpdated,
        __v: _ignoredVersion,
        storageWarnings: _ignoredStorageWarnings,
        legalAvailable: _ignoredLegalAvailability,
        ...payload
      } = content;
      const saved = await apiRequest("/admin/site", { method: "PUT", body: JSON.stringify(payload) });
      setContent(siteDefaults(saved));
      window.dispatchEvent(new Event(siteContentUpdatedEvent));
      const savedImageIds = new Set([
        saved.brand?.logoPublicId,
        saved.brand?.faviconPublicId,
        saved.homepage?.hero?.imagePublicId,
        saved.seo?.imagePublicId,
      ].filter(Boolean));
      const unusedIds = pendingUploads.filter((publicId) => !savedImageIds.has(publicId));
      const cleanupWarnings = await cleanUnusedUploads(unusedIds);
      setPendingUploads([]);
      const warnings = [...(saved.storageWarnings ?? []), ...cleanupWarnings];
      setNotice(warnings.length
        ? `Website content saved. Image cleanup warning: ${warnings.join(" ")}`
        : "Website content saved.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function discard() {
    if (!window.confirm("Discard your unsaved website content changes?")) return;
    const warnings = await cleanUnusedUploads(pendingUploads);
    setPendingUploads([]);
    await load();
    if (warnings.length) setError(`Could not remove temporary image uploads. ${warnings.join(" ")}`);
  }

  if (loading) return <p className="content-loading">Loading website content…</p>;

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow"><span className="eyebrow-line" />CONTENT MANAGEMENT</p>
          <h1>Website content</h1>
          <p>Editable starter copy is provided. Add your real contact details and approved legal or customer content before publishing them.</p>
        </div>
      </div>
      {notice && <p className="admin-notice" role="status">{notice}</p>}
      {error && <p className="admin-error" role="alert">{error}</p>}
      <form className="site-admin-form" onSubmit={save}>
        <section className="about-admin-section">
          <h2>Brand and navigation</h2>
          <div className="admin-form-grid">
            <AdminField label="Brand name" value={content.brand.name} maxLength={80} onChange={(value) => update(["brand", "name"], value)} />
            <AdminField label="Brand tagline" value={content.brand.tagline} maxLength={240} onChange={(value) => update(["brand", "tagline"], value)} />
            <div className="admin-field-full">
              <span className="about-upload-label">Company logo</span>
              <SiteImageControl
                label="logo"
                onRemove={() => removeImage({ url: ["brand", "logoUrl"], publicId: ["brand", "logoPublicId"] }, "logo")}
                onUpload={(file) => uploadImage("logo", file)}
                uploading={uploadingAsset === "logo"}
                url={content.brand.logoUrl}
              />
            </div>
            <div className="admin-field-full">
              <span className="about-upload-label">Favicon</span>
              <SiteImageControl
                label="favicon"
                onRemove={() => removeImage({ url: ["brand", "faviconUrl"], publicId: ["brand", "faviconPublicId"] }, "favicon")}
                onUpload={(file) => uploadImage("favicon", file)}
                uploading={uploadingAsset === "favicon"}
                url={content.brand.faviconUrl}
              />
            </div>
          </div>
          <div className="about-admin-items">
            <h3 className="site-admin-subheading">Navigation links</h3>
            {content.navigation.map((item, index) => (
              <div className="site-admin-row" key={`navigation-${index}`}>
                <AdminField label="Label" value={item.label} maxLength={60} onChange={(value) => updateArray("navigation", index, "label", value)} />
                <AdminField label="Link" value={item.href} maxLength={300} onChange={(value) => updateArray("navigation", index, "href", value)} />
                <label className="about-section-toggle"><input checked={item.visible} onChange={(event) => updateArray("navigation", index, "visible", event.target.checked)} type="checkbox" />Visible</label>
                <div className="site-admin-order">
                  <button aria-label={`Move navigation link ${index + 1} up`} disabled={index === 0} onClick={() => moveRow("navigation", index, -1)} type="button"><ArrowUp size={15} /></button>
                  <button aria-label={`Move navigation link ${index + 1} down`} disabled={index === content.navigation.length - 1} onClick={() => moveRow("navigation", index, 1)} type="button"><ArrowDown size={15} /></button>
                </div>
                <button aria-label={`Remove navigation link ${index + 1}`} className="about-remove-item" onClick={() => removeRow("navigation", index)} type="button"><Trash2 size={15} /></button>
              </div>
            ))}
            <button className="about-add-item" disabled={content.navigation.length >= 12} onClick={() => addRow("navigation")} type="button"><Plus size={15} /> Add navigation link</button>
          </div>
        </section>

        <section className="about-admin-section">
          <h2>Homepage content</h2>
          <div className="homepage-section-toggles">
            {[
              ["hero", "Hero"],
              ["services", "Services"],
              ["work", "Featured work"],
              ["about", "About"],
              ["testimonials", "Testimonials"],
              ["faqs", "FAQs"],
              ["contact", "Contact"],
            ].map(([section, label]) => (
              <label className="about-section-toggle" key={section}>
                <input
                  checked={content.homepage[section].visible !== false}
                  onChange={(event) => update(["homepage", section, "visible"], event.target.checked)}
                  type="checkbox"
                />
                <span>Show {label} section</span>
              </label>
            ))}
          </div>
          <div className="admin-form-grid">
            {homepageFields.map(([section, label, field, multiline]) => (
              <AdminField
                key={`${section}-${field}`}
                label={label}
                maxLength={field === "description" ? 1500 : field.toLowerCase().includes("href") ? 1000 : 180}
                multiline={multiline}
                onChange={(value) => update(["homepage", section, field], value)}
                value={content.homepage[section]?.[field]}
              />
            ))}
          </div>
          <div className="admin-form-grid">
            <div className="admin-field-full">
              <span className="about-upload-label">Hero image (optional)</span>
              <SiteImageControl
                alt={content.homepage.hero.imageAlt}
                label="hero image"
                onAltChange={(value) => update(["homepage", "hero", "imageAlt"], value)}
                onRemove={() => removeImage({
                  url: ["homepage", "hero", "imageUrl"],
                  publicId: ["homepage", "hero", "imagePublicId"],
                  alt: ["homepage", "hero", "imageAlt"],
                }, "homepage hero image")}
                onUpload={(file) => uploadImage("hero", file)}
                uploading={uploadingAsset === "hero"}
                url={content.homepage.hero.imageUrl}
              />
            </div>
          </div>
        </section>

        <section className="about-admin-section">
          <h2>FAQs</h2>
          <div className="about-admin-items">
            {content.faqs.map((item, index) => (
              <div className="site-admin-row site-admin-row-content" key={`faq-${index}`}>
                <AdminField label="Question" value={item.question} maxLength={240} onChange={(value) => updateArray("faqs", index, "question", value)} />
                <AdminField label="Answer" value={item.answer} maxLength={2400} multiline onChange={(value) => updateArray("faqs", index, "answer", value)} />
                <label className="about-section-toggle"><input checked={item.published} onChange={(event) => updateArray("faqs", index, "published", event.target.checked)} type="checkbox" />Publish</label>
                <div className="site-admin-order">
                  <button aria-label={`Move FAQ ${index + 1} up`} disabled={index === 0} onClick={() => { const rows = [...content.faqs]; [rows[index - 1], rows[index]] = [rows[index], rows[index - 1]]; update(["faqs"], rows.map((row, order) => ({ ...row, order }))); }} type="button">↑</button>
                  <button aria-label={`Move FAQ ${index + 1} down`} disabled={index === content.faqs.length - 1} onClick={() => { const rows = [...content.faqs]; [rows[index + 1], rows[index]] = [rows[index], rows[index + 1]]; update(["faqs"], rows.map((row, order) => ({ ...row, order }))); }} type="button">↓</button>
                </div>
                <button aria-label={`Remove FAQ ${index + 1}`} className="about-remove-item" onClick={() => removeRow("faqs", index)} type="button"><Trash2 size={15} /></button>
              </div>
            ))}
            <button className="about-add-item" disabled={content.faqs.length >= 60} onClick={() => addRow("faqs")} type="button"><Plus size={15} /> Add FAQ</button>
          </div>
        </section>

        <section className="about-admin-section">
          <h2>Testimonials</h2>
          <p className="about-admin-note">Only publish genuine testimonials with permission from the person quoted.</p>
          <div className="about-admin-items">
            {content.testimonials.map((item, index) => (
              <div className="site-admin-row site-admin-row-content" key={`testimonial-${index}`}>
                <AdminField label="Quote" value={item.quote} maxLength={2000} multiline onChange={(value) => updateArray("testimonials", index, "quote", value)} />
                <AdminField label="Name" value={item.name} maxLength={120} onChange={(value) => updateArray("testimonials", index, "name", value)} />
                <AdminField label="Role" value={item.role} maxLength={120} onChange={(value) => updateArray("testimonials", index, "role", value)} />
                <AdminField label="Company (optional)" value={item.company} maxLength={140} onChange={(value) => updateArray("testimonials", index, "company", value)} />
                <label className="about-section-toggle"><input checked={item.published} onChange={(event) => updateArray("testimonials", index, "published", event.target.checked)} type="checkbox" />Publish</label>
                <div className="site-admin-order">
                  <button aria-label={`Move testimonial ${index + 1} up`} disabled={index === 0} onClick={() => { const rows = [...content.testimonials]; [rows[index - 1], rows[index]] = [rows[index], rows[index - 1]]; update(["testimonials"], rows.map((row, order) => ({ ...row, order }))); }} type="button">↑</button>
                  <button aria-label={`Move testimonial ${index + 1} down`} disabled={index === content.testimonials.length - 1} onClick={() => { const rows = [...content.testimonials]; [rows[index + 1], rows[index]] = [rows[index], rows[index + 1]]; update(["testimonials"], rows.map((row, order) => ({ ...row, order }))); }} type="button">↓</button>
                </div>
                <button aria-label={`Remove testimonial ${index + 1}`} className="about-remove-item" onClick={() => removeRow("testimonials", index)} type="button"><Trash2 size={15} /></button>
              </div>
            ))}
            <button className="about-add-item" disabled={content.testimonials.length >= 60} onClick={() => addRow("testimonials")} type="button"><Plus size={15} /> Add testimonial</button>
          </div>
        </section>

        <section className="about-admin-section">
          <h2>Contact information and social links</h2>
          <p className="about-admin-note">Contact fields start blank so the site never publishes invented email addresses, phone numbers, or social accounts.</p>
          <div className="admin-form-grid">
            <AdminField label="Contact email" value={content.contact.email} maxLength={254} onChange={(value) => update(["contact", "email"], value)} />
            <AdminField label="Phone" value={content.contact.phone} maxLength={40} onChange={(value) => update(["contact", "phone"], value)} />
            <AdminField
              hint="Customers can message this number using the WhatsApp button on every public page. Example: +1 234 567 8901."
              label="WhatsApp number (include country code)"
              maxLength={24}
              onChange={(value) => update(["contact", "whatsapp"], value)}
              value={content.contact.whatsapp}
            />
            <AdminField label="Address (optional)" value={content.contact.address} maxLength={500} multiline onChange={(value) => update(["contact", "address"], value)} />
          </div>
          <div className="about-admin-items">
            <h3 className="site-admin-subheading">Social links</h3>
            {content.contact.socialLinks.map((item, index) => (
              <div className="site-admin-row" key={`social-${index}`}>
                <AdminField label="Label" value={item.label} maxLength={60} onChange={(value) => update(["contact", "socialLinks"], content.contact.socialLinks.map((entry, itemIndex) => itemIndex === index ? { ...entry, label: value } : entry))} />
                <AdminField label="URL" value={item.url} maxLength={1000} onChange={(value) => update(["contact", "socialLinks"], content.contact.socialLinks.map((entry, itemIndex) => itemIndex === index ? { ...entry, url: value } : entry))} />
                <div className="site-admin-order">
                  <button aria-label={`Move social link ${index + 1} up`} disabled={index === 0} onClick={() => moveRow("socialLinks", index, -1)} type="button"><ArrowUp size={15} /></button>
                  <button aria-label={`Move social link ${index + 1} down`} disabled={index === content.contact.socialLinks.length - 1} onClick={() => moveRow("socialLinks", index, 1)} type="button"><ArrowDown size={15} /></button>
                </div>
                <button aria-label={`Remove social link ${index + 1}`} className="about-remove-item" onClick={() => removeRow("socialLinks", index)} type="button"><Trash2 size={15} /></button>
              </div>
            ))}
            <button className="about-add-item" disabled={content.contact.socialLinks.length >= 20} onClick={() => update(["contact", "socialLinks"], [...content.contact.socialLinks, { label: "", url: "" }])} type="button"><Plus size={15} /> Add social link</button>
          </div>
        </section>

        <section className="about-admin-section">
          <h2>Legal documents</h2>
          <div className="admin-form-grid">
            <AdminField label="Privacy policy text" value={content.legal.privacyPolicy} maxLength={30000} multiline onChange={(value) => update(["legal", "privacyPolicy"], value)} />
            <AdminField label="Terms and conditions text" value={content.legal.terms} maxLength={30000} multiline onChange={(value) => update(["legal", "terms"], value)} />
          </div>
        </section>
        <section className="about-admin-section">
          <h2>Search engine settings</h2>
          <p className="about-admin-note">Set unique titles and descriptions for public pages. Individual service and project pages use their published content. Search previews and social cards use the shared image below.</p>
          <div className="admin-form-grid">
            {seoPageFields.map(([page, label]) => (
              <div className="seo-page-fields" key={page}>
                <h3>{label}</h3>
                <AdminField label={`${label} title`} value={content.seo.pages[page].title} maxLength={180} onChange={(value) => updateSeoPage(page, "title", value)} />
                <AdminField label={`${label} meta description`} value={content.seo.pages[page].description} maxLength={320} multiline onChange={(value) => updateSeoPage(page, "description", value)} />
              </div>
            ))}
            <div className="admin-field-full">
              <span className="about-upload-label">Social sharing image (optional)</span>
              <SiteImageControl
                label="social sharing image"
                onRemove={() => removeImage({ url: ["seo", "imageUrl"], publicId: ["seo", "imagePublicId"] }, "social sharing image")}
                onUpload={(file) => uploadImage("seo", file)}
                uploading={uploadingAsset === "seo"}
                url={content.seo.imageUrl}
              />
            </div>
          </div>
        </section>
        <div className="about-admin-actions">
          <button className="button button-primary" disabled={saving || Boolean(uploadingAsset)} type="submit"><Save size={16} aria-hidden="true" />{saving ? "Saving…" : "Save website content"}</button>
          <button className="admin-cancel-button" disabled={saving || Boolean(uploadingAsset)} onClick={discard} type="button">Discard unsaved changes</button>
        </div>
      </form>
    </>
  );
}

export function EnquiriesAdmin() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [data, setData] = useState({ items: [], page: 1, pages: 0, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ page: String(page), limit: "20" });
      if (status) query.set("status", status);
      setData(await apiRequest(`/admin/enquiries?${query}`));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(enquiry, nextStatus) {
    setError("");
    setNotice("");
    try {
      await apiRequest(`/admin/enquiries/${enquiry._id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setNotice(`Enquiry status updated to ${nextStatus}.`);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow"><span className="eyebrow-line" />PRIVATE ADMIN DATA</p>
          <h1>Enquiries</h1>
          <p>Contact and project enquiries are private and visible only to the authenticated administrator.</p>
        </div>
      </div>
      {error && <p className="admin-error" role="alert">{error}</p>}
      {notice && <p className="admin-success" role="status">{notice}</p>}
      <label className="admin-field enquiry-filter">
        <span>Filter by status</span>
        <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="new">New</option>
          <option value="read">Read</option>
          <option value="responded">Responded</option>
          <option value="archived">Archived</option>
        </select>
      </label>
      <section aria-label="Private enquiries" className="admin-service-list enquiry-list">
        <div className="admin-list-heading"><h2>Enquiries <span>{data.total}</span></h2><span>Newest first</span></div>
        {loading ? <p className="content-loading">Loading enquiries…</p> : data.items.length ? data.items.map((enquiry) => (
          <article className="enquiry-row" key={enquiry._id}>
            <div className="enquiry-meta">
              <strong>{enquiry.name}</strong><a href={`mailto:${enquiry.email}`}>{enquiry.email}</a>
              <span>{new Date(enquiry.createdAt).toLocaleString()}</span>
              <span>{enquiry.type === "project" ? "Project enquiry" : "General contact"}</span>
              {enquiry.company && <span>{enquiry.company}</span>}
              {enquiry.phone && <a href={`tel:${enquiry.phone}`}>{enquiry.phone}</a>}
              {enquiry.service && <span>Project/service: {enquiry.service}</span>}
            </div>
            <p>{enquiry.message}</p>
            <label className="admin-field">
              <span>Status</span>
              <select value={enquiry.status} onChange={(event) => updateStatus(enquiry, event.target.value)}>
                <option value="new">New</option><option value="read">Read</option>
                <option value="responded">Responded</option><option value="archived">Archived</option>
              </select>
            </label>
          </article>
        )) : <div className="admin-empty"><p>No enquiries found.</p></div>}
      </section>
      <div className="enquiry-pagination">
        <button className="admin-cancel-button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} type="button">Previous</button>
        <span>Page {data.page} of {Math.max(1, data.pages)}</span>
        <button className="admin-cancel-button" disabled={page >= data.pages || loading} onClick={() => setPage((value) => value + 1)} type="button">Next</button>
      </div>
    </>
  );
}
