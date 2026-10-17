import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import App from "./App.jsx";
const AboutPage = lazy(() => import("./AboutPages.jsx").then((module) => ({ default: module.AboutPage })));
const AdminPage = lazy(() => import("./AdminPage.jsx"));
const ContactPage = lazy(() => import("./ContactPage.jsx"));
const LegalPage = lazy(() => import("./LegalPage.jsx"));
const NotFoundPage = lazy(() => import("./NotFoundPage.jsx"));
const PortfolioPage = lazy(() => import("./PortfolioPages.jsx").then((module) => ({ default: module.PortfolioPage })));
const ProjectDetailPage = lazy(() => import("./PortfolioPages.jsx").then((module) => ({ default: module.ProjectDetailPage })));
const ServicesPage = lazy(() => import("./ServicePages.jsx").then((module) => ({ default: module.ServicesPage })));
const ServiceDetailPage = lazy(() => import("./ServicePages.jsx").then((module) => ({ default: module.ServiceDetailPage })));
import { SiteContentProvider } from "./SiteContentContext.jsx";
import "./index.css";

function routeElement(element) {
  return (
    <Suspense fallback={<p aria-live="polite" className="route-loading" role="status">Loading page…</p>}>
      {element}
    </Suspense>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <SiteContentProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<App />} path="/" />
          <Route element={routeElement(<ContactPage />)} path="/contact" />
          <Route element={routeElement(<AboutPage />)} path="/about" />
          <Route element={routeElement(<LegalPage type="privacy-policy" />)} path="/privacy" />
          <Route element={routeElement(<LegalPage type="terms" />)} path="/terms" />
          <Route element={routeElement(<ServicesPage />)} path="/services" />
          <Route element={routeElement(<ServiceDetailPage />)} path="/services/:slug" />
          <Route element={routeElement(<PortfolioPage />)} path="/work" />
          <Route element={routeElement(<ProjectDetailPage />)} path="/work/:slug" />
          <Route element={routeElement(<AdminPage />)} path="/admin/*" />
          <Route element={routeElement(<NotFoundPage />)} path="*" />
        </Routes>
      </BrowserRouter>
    </SiteContentProvider>
  </StrictMode>,
);
