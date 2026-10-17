import { useState } from "react";
import { ArrowUpRight, Asterisk, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useSiteContent } from "./SiteContentContext.jsx";
import { emailHref, phoneHref, whatsappHref } from "./contactLinks.js";

function Brand({ footer = false, name, logoUrl }) {
  return (
    <Link aria-label="SUPERX Technology home" className={`brand${footer ? " brand-footer" : ""}`} to="/">
      {logoUrl
        ? <img className="brand-image" src={logoUrl} alt="" />
        : <span className="brand-symbol" aria-hidden="true"><Asterisk size={23} strokeWidth={2.5} /></span>}
      <span className="brand-word">{name || "SUPERX"}<span className="brand-period">.</span></span>
    </Link>
  );
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const site = useSiteContent();
  const navigation = site.navigation;

  return (
    <header className="site-header">
      <div className="header-inner page-shell">
        <Brand name={site.brand.name} logoUrl={site.brand.logoUrl} />
        <nav
          aria-label="Main navigation"
          className={`main-nav${menuOpen ? " nav-open" : ""}`}
          id="main-navigation"
        >
          {navigation.filter((item) => item.visible !== false).map((item) => (
            <a href={item.href} key={item.label} onClick={() => setMenuOpen(false)}>
              {item.label}
            </a>
          ))}
          <Link className="nav-contact" onClick={() => setMenuOpen(false)} to="/contact">
            {site.homepage.contact.buttonLabel || site.homepage.hero.primaryAction || "Start a project"}
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </nav>
        <button
          aria-controls="main-navigation"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          className="menu-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          type="button"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
    </header>
  );
}

export function Footer() {
  const site = useSiteContent();
  const navigation = site.navigation;

  return (
    <footer className="site-footer">
      <div className="page-shell">
        <div className="footer-main">
          <div className="footer-brand">
            <Brand footer name={site.brand.name} logoUrl={site.brand.logoUrl} />
            {site.brand.tagline && <p>{site.brand.tagline}</p>}
          </div>
          <div className="footer-links">
            <span className="footer-label">Explore</span>
            {navigation.filter((item) => item.visible !== false).map((item) => (
              <a href={item.href} key={item.label}>
                {item.label}
              </a>
            ))}
            <Link to="/contact">Contact</Link>
            <Link to="/admin">Admin sign in</Link>
            {site.legalAvailable.privacyPolicy && <a href="/privacy">Privacy policy</a>}
            {site.legalAvailable.terms && <a href="/terms">Terms</a>}
            <div className="footer-social-links">
              {(site.contact.socialLinks ?? []).map((item) => (
                <a href={item.url} key={`${item.label}-${item.url}`} rel="noreferrer" target="_blank">{item.label}</a>
              ))}
            </div>
          </div>
          <div className="footer-contact">
            {site.contact.email && <a href={emailHref(site.contact.email)}>{site.contact.email}</a>}
            {site.contact.phone && <a href={phoneHref(site.contact.phone)}>{site.contact.phone}</a>}
            {site.contact.whatsapp && <a href={whatsappHref(site.contact.whatsapp)} rel="noreferrer" target="_blank">WhatsApp</a>}
            {site.contact.address && <p>{site.contact.address}</p>}
            {(site.homepage.contact.title || site.homepage.contact.buttonLabel) && (
              <Link className="footer-cta" to="/contact">
                {site.homepage.contact.title}
                <span>{site.homepage.contact.buttonLabel} <ArrowUpRight size={16} aria-hidden="true" /></span>
              </Link>
            )}
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} {site.brand.name || "SUPERX Technology"}</span>
          <a href="/">Back to top ↑</a>
          <span />
        </div>
      </div>
    </footer>
  );
}

export function SiteLayout({ children }) {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Header />
      <main id="main-content">{children}</main>
      <Footer />
    </>
  );
}
