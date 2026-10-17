import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { apiRequest } from "./api.js";

const emptyForm = {
  type: "project",
  name: "",
  email: "",
  phone: "",
  service: "",
  message: "",
  website: "",
};

export default function ContactForm({ type = "project", submitLabel = "Send project enquiry" }) {
  const [form, setForm] = useState(() => ({
    ...emptyForm,
    type,
    service: new URLSearchParams(window.location.search).get("service") ?? "",
  }));
  const [services, setServices] = useState([]);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    apiRequest("/services")
      .then(setServices)
      .catch((error) => console.error("Could not load service options:", error));
  }, []);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSending(true);
    setStatus({ type: "", message: "" });
    try {
      const result = await apiRequest("/enquiries", {
        method: "POST",
        body: JSON.stringify({ ...form, type }),
      });
      setForm({ ...emptyForm, type });
      setStatus({
        type: result.notification === "failed" ? "warning" : "success",
        message: result.notification === "failed"
          ? "Your enquiry was received, but its email notification could not be confirmed. The enquiry is still available to the SUPERX team in the admin panel."
          : "Thank you — your enquiry has been received. The SUPERX team will review it.",
      });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="contact-enquiry-form" onSubmit={submit}>
      <label>
        <span>Your name</span>
        <input autoComplete="name" maxLength={120} onChange={(event) => update("name", event.target.value)} required value={form.name} />
      </label>
      <label>
        <span>Email address</span>
        <input autoComplete="email" maxLength={254} onChange={(event) => update("email", event.target.value)} required type="email" value={form.email} />
      </label>
      <label>
        <span>Phone number <small>(optional)</small></span>
        <input autoComplete="tel" maxLength={40} onChange={(event) => update("phone", event.target.value)} type="tel" value={form.phone} />
      </label>
      <label>
        <span>Service of interest <small>(optional)</small></span>
        {services.length ? (
          <select onChange={(event) => update("service", event.target.value)} value={form.service}>
            <option value="">Select a service</option>
            {form.service && !services.some((service) => service.title === form.service) && (
              <option value={form.service}>{form.service}</option>
            )}
            {services.map((service) => <option key={service._id} value={service.title}>{service.title}</option>)}
            <option value="Other">Other</option>
          </select>
        ) : (
          <input maxLength={120} onChange={(event) => update("service", event.target.value)} placeholder="Tell us what you need" value={form.service} />
        )}
      </label>
      <label className="contact-field-full">
        <span>Tell us about your project</span>
        <textarea maxLength={6000} minLength={10} onChange={(event) => update("message", event.target.value)} required rows={6} value={form.message} />
      </label>
      <div className="contact-honeypot" aria-hidden="true">
        <label htmlFor="contact-company-website">Leave this field empty</label>
        <input autoComplete="off" id="contact-company-website" name="website" onChange={(event) => update("website", event.target.value)} tabIndex={-1} value={form.website ?? ""} />
      </div>
      <button className="button button-primary contact-button" disabled={sending} type="submit">
        {sending ? "Submitting…" : submitLabel}<ArrowUpRight size={17} aria-hidden="true" />
      </button>
      {status.message && (
        <p className={`contact-form-status ${status.type}`} role={status.type === "error" ? "alert" : "status"}>
          {status.message}
        </p>
      )}
    </form>
  );
}
