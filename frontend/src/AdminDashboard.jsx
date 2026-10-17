import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, BriefcaseBusiness, Inbox, Layers3, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { apiRequest } from "./api.js";

const emptySummary = {
  services: { total: 0, published: 0 },
  projects: { total: 0, published: 0 },
  enquiries: { total: 0, new: 0 },
};

export default function AdminDashboard() {
  const [summary, setSummary] = useState(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setSummary(await apiRequest("/admin/dashboard"));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const cards = [
    { label: "Services", icon: Layers3, ...summary.services, href: "/admin/services", status: `${summary.services.published} published` },
    { label: "Projects", icon: BriefcaseBusiness, ...summary.projects, href: "/admin/projects", status: `${summary.projects.published} published` },
    { label: "Enquiries", icon: Inbox, total: summary.enquiries.total, href: "/admin/enquiries", status: `${summary.enquiries.new} new` },
  ];

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow"><span className="eyebrow-line" />ADMIN OVERVIEW</p>
          <h1>Dashboard</h1>
          <p>A summary of your website content and incoming enquiries.</p>
        </div>
        <button className="admin-cancel-button" disabled={loading} onClick={load} type="button">
          <RefreshCw size={15} aria-hidden="true" /> Refresh
        </button>
      </div>
      {error && <p className="admin-error" role="alert">{error} Try refreshing after the database is available.</p>}
      {loading ? (
        <p className="content-loading" aria-live="polite">Loading dashboard…</p>
      ) : !error && (
        <section aria-label="Content summary" className="dashboard-cards">
          {cards.map(({ label, icon: Icon, total, status, href }) => (
            <Link className="dashboard-card" key={label} to={href}>
              <span className="dashboard-card-icon"><Icon size={19} aria-hidden="true" /></span>
              <span className="dashboard-card-label">{label}</span>
              <strong>{total}</strong>
              <span className="dashboard-card-status">{status}</span>
              <ArrowUpRight className="dashboard-card-arrow" size={17} aria-hidden="true" />
            </Link>
          ))}
        </section>
      )}
      <section className="dashboard-shortcuts">
        <div>
          <h2>Manage your website</h2>
          <p>Keep public content, brand details and company information up to date.</p>
        </div>
        <div className="dashboard-shortcut-links">
          <Link to="/admin/content">Brand & homepage <ArrowUpRight size={15} /></Link>
          <Link to="/admin/about">About Us & team <ArrowUpRight size={15} /></Link>
          <Link to="/admin/projects">Portfolio <ArrowUpRight size={15} /></Link>
          <Link to="/admin/enquiries">Review enquiries <ArrowUpRight size={15} /></Link>
        </div>
      </section>
    </>
  );
}
