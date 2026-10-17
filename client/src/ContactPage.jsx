import { ArrowUpRight, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { SiteLayout } from "./SiteLayout.jsx";
import { usePageMetadata } from "./PageMetadata.jsx";
import { useSiteContent } from "./SiteContentContext.jsx";
import ContactForm from "./ContactForm.jsx";
import { emailHref, phoneHref, whatsappHref } from "./contactLinks.js";

export default function ContactPage() {
  const site = useSiteContent();
  const contact = site.homepage.contact;
  usePageMetadata("contact");

  return (
    <SiteLayout>
      <section className="contact-page">
        <div className="page-shell">
          <div className="contact-page-heading">
            <p className="eyebrow"><span className="eyebrow-line" />{contact.eyebrow || "CONTACT SUPERX"}</p>
            <h1>
              {contact.title || "Let’s talk about"}
              {(contact.title || contact.titleAccent) && <br />}
              <span className="text-gradient">{contact.titleAccent || "your next project."}</span>
            </h1>
            <p>{contact.description || "Share a little about what you’re planning. Tell us what you need and our team will review your enquiry."}</p>
          </div>

          <div className="contact-page-layout">
            <div className="contact-page-main">
              <div className="contact-page-form-heading">
                <span>01 / PROJECT ENQUIRY</span>
                <h2>Tell us what you have in mind</h2>
                <p>Complete the form and we’ll review your project details.</p>
              </div>
              <ContactForm type="project" submitLabel={contact.buttonLabel || "Send project enquiry"} />
            </div>

            <aside aria-label="Other ways to contact SUPERX" className="contact-page-details">
              <p className="eyebrow"><span className="eyebrow-line" />DIRECT CONTACT</p>
              <h2>Prefer another way?</h2>
              {site.contact.email && (
                <a className="contact-detail-link" href={emailHref(site.contact.email)}>
                  <span><Mail size={17} aria-hidden="true" /></span>
                  <span><small>Email</small><strong>{site.contact.email}</strong></span>
                </a>
              )}
              {site.contact.phone && (
                <a className="contact-detail-link" href={phoneHref(site.contact.phone)}>
                  <span><Phone size={17} aria-hidden="true" /></span>
                  <span><small>Phone</small><strong>{site.contact.phone}</strong></span>
                </a>
              )}
              {site.contact.whatsapp && (
                <a className="contact-detail-link" href={whatsappHref(site.contact.whatsapp)} rel="noreferrer" target="_blank">
                  <span><MessageCircle size={17} aria-hidden="true" /></span>
                  <span><small>WhatsApp</small><strong>Start a conversation</strong></span>
                  <ArrowUpRight size={15} aria-hidden="true" />
                </a>
              )}
              {site.contact.address && (
                <div className="contact-detail-link contact-address">
                  <span><MapPin size={17} aria-hidden="true" /></span>
                  <span><small>Office</small><strong>{site.contact.address}</strong></span>
                </div>
              )}
              {site.contact.socialLinks.length > 0 && (
                <div className="contact-social-block">
                  <span>Follow SUPERX</span>
                  <div>
                    {site.contact.socialLinks.map((link) => (
                      <a href={link.url} key={`${link.label}-${link.url}`} rel="noreferrer" target="_blank">
                        {link.label}<ArrowUpRight size={13} aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {!site.contact.email && !site.contact.phone && !site.contact.whatsapp && !site.contact.address && !site.contact.socialLinks.length && (
                <p className="contact-details-empty">
                  For now, use the project enquiry form to reach us. Add your real
                  email, phone, and WhatsApp details in Admin → Website content.
                </p>
              )}
            </aside>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
